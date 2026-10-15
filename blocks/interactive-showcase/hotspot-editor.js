/*
 * interactive-showcase, Universal Editor only (loaded by interactive-showcase.js in the editor):
 * the + points can be dragged on the showcase image, or nudged with the arrow keys once one is
 * focused (Shift for bigger steps). On release the new x, y is written into that point's bullet
 * of the item's Hotspots field (title and text kept) and saved to the item. Clicking the image
 * anywhere else shows the x, y at that spot and copies it, for writing a new bullet.
 * x and y are as authored: percentages of the image from its bottom-left corner.
 */

const STEP = 0.5;
const BIG_STEP = 5;
const SAVE_DELAY = 700;
// a press that moves less than this (px) is a click: it opens the tooltip as usual
const DRAG_THRESHOLD = 4;

const clamp = (n) => Math.min(100, Math.max(0, n));
const round = (n) => Math.round(n * 10) / 10;

/** "x, y" as authored (spot.y is kept from the top, as the stylesheet places it) */
const coordinates = (x, yFromTop) => `${round(x)}, ${round(100 - yFromTop)}`;

/** the bullet's text: "x, y | TITLE | description", leaving out what the author left out */
function bulletText({
  x, y, title, text,
}) {
  const parts = [coordinates(x, y)];
  if (title || text) parts.push(title);
  if (text) parts.push(text);
  return parts.join(' | ');
}

/** the item's path in the repository, from its Universal Editor resource */
function resourcePath(row) {
  const match = /^urn:[^:]+:(\/.+)$/.exec(row.dataset.aueResource || '');
  return match ? match[1] : null;
}

let csrf = null;
async function csrfToken() {
  if (!csrf) {
    csrf = fetch('/libs/granite/csrf/token.json', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`CSRF ${res.status}`))))
      .then(({ token }) => token)
      .catch((err) => {
        csrf = null;
        throw err;
      });
  }
  return csrf;
}

/** saves the Hotspots field of the item at `path` (AEM's standard content update) */
async function saveHotspots(path, html) {
  const body = new FormData();
  body.append('hotspots', html);
  body.append('_charset_', 'utf-8');
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'CSRF-Token': await csrfToken() },
    body,
  });
  if (!res.ok) throw new Error(`save ${res.status}`);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function editItem({
  row, figure, hotCell, spots,
}, closeTooltip) {
  const path = resourcePath(row);
  const bullets = hotCell ? [...hotCell.querySelectorAll('li')] : [];

  // the x, y badge beside the point being moved, and the save status
  const badge = document.createElement('span');
  badge.className = 'interactive-showcase-hotspot-coords';
  badge.hidden = true;
  figure.append(badge);
  let badgeTimer = 0;
  const showBadge = (x, y, text, linger = 0) => {
    clearTimeout(badgeTimer);
    badge.textContent = text;
    badge.style.setProperty('--interactive-showcase-x', `${x}%`);
    badge.style.setProperty('--interactive-showcase-y', `${y}%`);
    badge.classList.toggle('is-below', y < 15);
    badge.hidden = false;
    if (linger) {
      badgeTimer = setTimeout(() => {
        badge.hidden = true;
      }, linger);
    }
  };

  const place = (entry, x, y) => {
    entry.spot.x = round(clamp(x));
    entry.spot.y = round(clamp(y));
    entry.btn.style.setProperty('--interactive-showcase-x', `${entry.spot.x}%`);
    entry.btn.style.setProperty('--interactive-showcase-y', `${entry.spot.y}%`);
    showBadge(entry.spot.x, entry.spot.y, coordinates(entry.spot.x, entry.spot.y));
  };

  // saves run one after the other, each with the field as it is by then
  let saving = Promise.resolve();
  const commit = (entry, index) => {
    const { x, y } = entry.spot;
    const xy = coordinates(x, y);
    if (bullets[index]) bullets[index].textContent = bulletText(entry.spot);
    const html = hotCell?.innerHTML.trim();
    saving = saving.then(async () => {
      showBadge(x, y, `${xy} · saving…`);
      try {
        if (!path || !html) throw new Error('nothing to save to');
        await saveHotspots(path, html);
        showBadge(x, y, `${xy} · saved`, 1800);
      } catch {
        const copied = await copy(xy);
        showBadge(x, y, `${xy} · not saved${copied ? ', copied' : ''}: update the bullet by hand`, 6000);
      }
    });
  };

  let dragged = false;
  spots.forEach((entry, index) => {
    const { btn } = entry;
    btn.classList.add('interactive-showcase-hotspot-draggable');
    btn.title = 'Drag to move (arrow keys nudge, Shift for bigger steps)';

    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const box = figure.getBoundingClientRect();
      const start = {
        x: e.clientX, y: e.clientY, sx: entry.spot.x, sy: entry.spot.y,
      };
      let moving = false;
      btn.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const dx = ev.clientX - start.x;
        const dy = ev.clientY - start.y;
        if (!moving && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        if (!moving) closeTooltip();
        moving = true;
        btn.classList.add('is-dragging');
        place(entry, start.sx + (dx / box.width) * 100, start.sy + (dy / box.height) * 100);
      };
      const end = () => {
        btn.removeEventListener('pointermove', move);
        btn.removeEventListener('pointerup', end);
        btn.removeEventListener('pointercancel', end);
        btn.classList.remove('is-dragging');
        if (!moving) return;
        dragged = true;
        commit(entry, index);
      };
      btn.addEventListener('pointermove', move);
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
    });

    let nudgeTimer = 0;
    btn.addEventListener('keydown', (e) => {
      const [dx, dy] = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
      }[e.key] || [];
      if (dx === undefined) return;
      e.preventDefault();
      e.stopPropagation();
      closeTooltip();
      const step = e.shiftKey ? BIG_STEP : STEP;
      place(entry, entry.spot.x + dx * step, entry.spot.y + dy * step);
      clearTimeout(nudgeTimer);
      nudgeTimer = setTimeout(() => commit(entry, index), SAVE_DELAY);
    });
  });

  // a drag ends in a click on the + : it must not open the tooltip (capture, before the +)
  figure.addEventListener('click', (e) => {
    if (dragged) {
      dragged = false;
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (e.target.closest('.interactive-showcase-hotspot, .interactive-showcase-tooltip')) return;
    // anywhere else on the image: show (and copy) the x, y of that spot
    const box = figure.getBoundingClientRect();
    const x = round(clamp(((e.clientX - box.left) / box.width) * 100));
    const y = round(clamp(((e.clientY - box.top) / box.height) * 100));
    const xy = coordinates(x, y);
    copy(xy).then((copied) => showBadge(x, y, copied ? `${xy} · copied` : xy, 3000));
  }, true);
}

/**
 * @param {Array} items the block's items: { row, figure, hotCell, spots: [{ btn, spot }] }
 * @param {Function} closeTooltip closes the open tooltip, if any
 */
export default function editHotspots(items, closeTooltip) {
  items.forEach((item) => editItem(item, closeTooltip));
}
