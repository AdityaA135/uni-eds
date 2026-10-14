/*
 * jsw-tech-showcase: white card, copy + thumbnail tray on the left, showcase image with
 * hotspots on the right.
 * Rows: a heading row, then one row per powertrain with
 *   media    — thumbnail picture, then showcase picture
 *   text     — title (h3) + description
 *   hotspots — list items "x%, y% | TITLE | description" (position over the showcase image)
 * Thumbnails are tabs: selecting one swaps the showcase image, counter and copy.
 * A hotspot opens a frosted tooltip; clicking outside or Escape closes it.
 * Entrance ("white curtain"): the previous section holds still while this white card slides
 * up over it; once the card fills the screen its content fades in.
 * The selected showcase image is marked data-zoom-source: a following parallax collage flies
 * it from here into its centre card on scroll.
 */

const HOTSPOT = /^\s*(\d+(?:\.\d+)?)\s*%?\s*,\s*(\d+(?:\.\d+)?)\s*%?\s*\|\s*([^|]+?)\s*\|\s*([\s\S]+)$/;
let instance = 0;

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function parseHotspots(cell) {
  if (!cell) return [];
  return [...cell.querySelectorAll('li')].map((li) => li.textContent.match(HOTSPOT)).filter(Boolean)
    .map(([, x, y, title, text]) => ({
      x: Math.min(100, +x), y: Math.min(100, +y), title: title.trim(), text: text.trim(),
    }));
}

/**
 * "white curtain" entrance: while this section slides up, the previous section's content is
 * moved down by the distance scrolled, so it stays put and the white card covers it (only the
 * content moves: section boxes, which the navigation theme and the wheel stops read, do not);
 * the card's content is veiled until the card has filled the screen, then fades in
 */
function curtain(section, block) {
  let prev = section.previousElementSibling;
  while (prev && !prev.classList.contains('section')) prev = prev.previousElementSibling;
  const held = prev?.firstElementChild;
  let frame = 0;
  const update = () => {
    frame = 0;
    if (held) {
      const r = prev.getBoundingClientRect();
      const shift = Math.min(r.height, Math.max(0, -r.top));
      held.style.transform = shift ? `translate3d(0, ${shift.toFixed(1)}px, 0)` : '';
    }
    // not laid out yet (section still loading): decide once it is
    if (!section.offsetHeight) return;
    const { top } = section.getBoundingClientRect();
    // revealed once the card is in place; veiled again when it slides back down
    if (top <= 2) block.classList.add('jsw-tech-revealed');
    else if (top > window.innerHeight * 0.5) block.classList.remove('jsw-tech-revealed');
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  block.classList.add('jsw-tech-curtain');
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(section);
  update();
}

/** the figure takes the image's own ratio so hotspot percentages stay on the artwork */
function trackRatio(figure, img) {
  const apply = () => {
    if (img.naturalWidth && img.naturalHeight) {
      figure.style.setProperty('--jsw-ratio', (img.naturalWidth / img.naturalHeight).toFixed(4));
    }
  };
  if (img.complete) apply();
  img.addEventListener('load', apply);
}

/**
 * browsers without CSS container units (cqw / cqh): the stage's own width and height as
 * --jsw-cq-w / --jsw-cq-h, which the CSS uses in their place (@supports not container-type)
 */
function containerUnits(container) {
  if (window.CSS?.supports?.('container-type', 'size')) return;
  const measure = () => {
    container.style.setProperty('--jsw-cq-w', `${container.clientWidth}px`);
    container.style.setProperty('--jsw-cq-h', `${container.clientHeight}px`);
  };
  if (window.ResizeObserver) new ResizeObserver(measure).observe(container);
  else window.addEventListener('resize', measure);
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  instance += 1;
  const id = `jsw-tech-${instance}`;
  const section = block.closest('.section');
  if (section) {
    section.dataset.jswTheme = 'light';
    if (!section.id && !document.getElementById('nev-tech')) section.id = 'nev-tech';
  }

  const rows = [...block.children];
  const itemRows = rows.filter((r) => r.querySelector('picture'));
  const headRow = rows.find((r) => !itemRows.includes(r));

  const copy = el('div', 'jsw-tech-copy');
  if (headRow) {
    headRow.className = 'jsw-tech-heading';
    headRow.querySelector('h1, h2, h3')?.classList.add('jsw-tech-title');
    copy.append(headRow);
  }
  const detail = el('div', 'jsw-tech-detail');
  const counter = el('p', 'jsw-tech-counter');
  const texts = el('div', 'jsw-tech-texts', { 'aria-live': 'polite' });
  const thumbs = el('div', 'jsw-tech-thumbs', { role: 'tablist', 'aria-label': 'Powertrains' });
  detail.append(counter, texts, thumbs);
  copy.append(detail);

  const stage = el('div', 'jsw-tech-stage');
  containerUnits(stage);
  const tooltip = el('div', 'jsw-tech-tooltip', { id: `${id}-tooltip`, role: 'dialog', 'aria-modal': 'false' });
  tooltip.hidden = true;
  const tipTitle = el('p', 'jsw-tech-tooltip-title', { id: `${id}-tooltip-title` });
  const tipText = el('p', 'jsw-tech-tooltip-text');
  const tipClose = el('button', 'jsw-tech-tooltip-close', { type: 'button', 'aria-label': 'Close details' });
  tooltip.setAttribute('aria-labelledby', tipTitle.id);
  tooltip.append(tipTitle, tipText, tipClose);

  let openSpot = null;
  /**
   * the tooltip opens to the left of its hotspot and down, the hotspot in its top corner (as
   * in the design); where that would cut it off at the card's or the screen's edge it opens
   * to the right / up instead. Where neither side fits (narrow screens) it opens just below
   * (or above) the hotspot, centred on it and nudged in, the hotspot keeping its own box.
   */
  const placeTooltip = () => {
    const area = stage.getBoundingClientRect();
    const gap = 8;
    const left = Math.max(area.left, 0) + gap;
    const right = Math.min(area.right, document.documentElement.clientWidth) - gap;
    const bottom = Math.min(area.bottom, window.innerHeight) - gap;
    const set = (side, align) => {
      tooltip.dataset.side = side;
      tooltip.dataset.align = align;
      return tooltip.getBoundingClientRect();
    };
    tooltip.style.removeProperty('--jsw-sx');
    let box = set('left', 'top');
    if (box.left < left) box = set('right', 'top');
    const apart = box.left < left || box.right > right;
    if (apart) box = set('center', 'below');
    if (box.bottom > bottom) box = set(tooltip.dataset.side, apart ? 'above' : 'bottom');
    if (box.right > right) tooltip.style.setProperty('--jsw-sx', `${right - box.right}px`);
    else if (box.left < left) tooltip.style.setProperty('--jsw-sx', `${left - box.left}px`);
    openSpot?.classList.toggle('jsw-hotspot-apart', apart);
  };

  const closeTooltip = (refocus = false) => {
    if (!openSpot) return;
    const spot = openSpot;
    openSpot = null;
    spot.setAttribute('aria-expanded', 'false');
    spot.classList.remove('jsw-hotspot-apart');
    tooltip.hidden = true;
    if (refocus) spot.focus();
  };
  const openTooltip = (spot, data) => {
    closeTooltip();
    openSpot = spot;
    spot.setAttribute('aria-expanded', 'true');
    tipTitle.textContent = data.title;
    tipText.textContent = data.text;
    spot.closest('.jsw-tech-figure').append(tooltip);
    tooltip.style.setProperty('--jsw-x', `${data.x}%`);
    tooltip.style.setProperty('--jsw-y', `${data.y}%`);
    tooltip.hidden = false;
    placeTooltip();
  };

  const items = itemRows.map((row, i) => {
    const cells = [...row.children];
    const mediaCell = cells.find((c) => c.querySelector('picture'));
    const pictures = [...mediaCell.querySelectorAll('picture')];
    const thumbPicture = pictures[0];
    const imagePicture = pictures[1] || pictures[0].cloneNode(true);
    const hotCell = cells.find((c) => c !== mediaCell && c.querySelector('li'));
    const textCell = cells.find((c) => c !== mediaCell && c !== hotCell);
    const title = textCell?.querySelector('h2, h3, h4')?.textContent.trim() || `Powertrain ${i + 1}`;

    // the item row becomes its panel (keeps the editor's item instrumentation)
    row.className = 'jsw-tech-panel';
    row.id = `${id}-panel-${i}`;
    row.setAttribute('role', 'tabpanel');
    row.setAttribute('aria-labelledby', `${id}-tab-${i}`);
    const figure = el('div', 'jsw-tech-figure');
    figure.append(imagePicture);
    const img = imagePicture.querySelector('img');
    if (img) trackRatio(figure, img);
    parseHotspots(hotCell).forEach((spot) => {
      const btn = el('button', 'jsw-hotspot', {
        type: 'button',
        'aria-label': `Show details: ${spot.title}`,
        'aria-expanded': 'false',
        'aria-controls': tooltip.id,
      });
      btn.style.setProperty('--jsw-x', `${spot.x}%`);
      btn.style.setProperty('--jsw-y', `${spot.y}%`);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (openSpot === btn) closeTooltip();
        else openTooltip(btn, spot);
      });
      figure.append(btn);
    });
    if (hotCell) hotCell.classList.add('jsw-tech-hotspot-source');
    mediaCell.remove();
    row.prepend(figure);
    stage.append(row);

    if (textCell) {
      textCell.classList.add('jsw-tech-text');
      textCell.querySelector('h2, h3, h4')?.classList.add('jsw-tech-item-title');
      texts.append(textCell);
    }

    const tab = el('button', 'jsw-tech-thumb', {
      type: 'button', role: 'tab', id: `${id}-tab-${i}`, 'aria-controls': row.id, 'aria-label': title,
    });
    thumbPicture.querySelector('img')?.setAttribute('alt', '');
    tab.append(thumbPicture);
    thumbs.append(tab);
    return { row, textCell, tab };
  });

  let current = 0;
  /**
   * the images move like a vertical carousel (jsw-tech-showcase.css): picking a thumbnail to
   * the right pushes the current image up and out while the new one rises from the bottom;
   * one to the left pushes it down while the new one comes in from the top
   */
  const slideImages = (from, to) => {
    if (from === to) return;
    const dir = to > from ? 1 : -1;
    const incoming = items[to].row;
    incoming.style.transition = 'none';
    incoming.style.transform = `translateY(${dir * 100}%)`;
    incoming.getBoundingClientRect();
    ['transition', 'transform'].forEach((p) => incoming.style.removeProperty(p));
    items[from].row.style.transform = `translateY(${-dir * 100}%)`;
  };

  const select = (index, focus = false) => {
    const from = current;
    current = (index + items.length) % items.length;
    closeTooltip();
    if (items[from] && items[current]) slideImages(from, current);
    items.forEach(({ row, textCell, tab }, i) => {
      const active = i === current;
      row.classList.toggle('is-active', active);
      // the selected image flies on into the next section's card (parallax-collage)
      row.querySelector('.jsw-tech-figure')?.toggleAttribute('data-zoom-source', active);
      row.inert = !active;
      if (textCell) textCell.hidden = !active;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });
    counter.textContent = `${current + 1}/${items.length}`;
    if (focus) items[current].tab.focus();
  };

  items.forEach(({ tab }, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      const step = {
        ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1,
      }[e.key];
      if (step) {
        e.preventDefault();
        select(current + step, true);
      }
    });
  });

  tipClose.addEventListener('click', () => closeTooltip(true));
  window.addEventListener('resize', () => {
    if (openSpot) placeTooltip();
  });
  document.addEventListener('click', (e) => {
    if (openSpot && !tooltip.contains(e.target)) closeTooltip();
  });
  block.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openSpot) closeTooltip(true);
  });

  block.replaceChildren(copy, stage);
  if (block.closest('[data-aue-resource]')) block.classList.add('jsw-tech-editing');
  else if (section && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    curtain(section, block);
  }
  if (items.length) select(0);
}