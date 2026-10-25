/*
 * interactive-showcase: white card, copy + thumbnail tray on the left, showcase image with
 * hotspots on the right.
 * Rows: a heading row, then one row per showcase item with
 *   media    — thumbnail picture, then showcase picture
 *   title    — the item's title
 *   description — the item's description
 *   hotspots — list items "x, y | TITLE | description" (position over the showcase image,
 *              from its bottom-left corner; at most MAX_HOTSPOTS, see parseHotspots)
 * Thumbnails are tabs: selecting one swaps the showcase image, counter and copy.
 * A hotspot opens a frosted tooltip; clicking outside or Escape closes it.
 * Entrance ("white curtain"): the previous section holds still while this white card slides
 * up over it; once the card fills the screen its content fades in.
 * The selected showcase image is marked data-zoom-source: a following parallax collage flies
 * it from here into its centre card on scroll.
 */

// at most this many + points per powertrain (the client's limit): further bullets are ignored
const MAX_HOTSPOTS = 4;
// at most this many items (thumbnails): further items are not shown
const MAX_ITEMS = 3;
// the most characters each text may have, so it fits its place in the card on every screen
// (_interactive-showcase.json limits the fields to the same); longer text, saved before the
// limits or in the hotspots' bullets, is shortened on the page
const MAX_CHARS = {
  title: 40,
  itemTitle: 40,
  description: 160,
  hotspotTitle: 24,
  hotspotText: 120,
};
let instance = 0;

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

/**
 * an authored coordinate as a number from 0 to 100: "40" and "40%" both give 40 (the % is
 * added back where it is used); missing or not a number gives 0
 */
function normalizeCoordinate(value) {
  const n = parseFloat(String(value ?? '').replace(/%/g, '').trim());
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

/**
 * the + points, one bullet each: "x, y | TITLE | description". x and y are percentages of the
 * showcase image from its bottom-left corner, like the first quadrant of a graph (x to the
 * right, y upwards); the + button's top-left corner sits on that point. A missing x or y is 0;
 * only the first MAX_HOTSPOTS bullets are used (none is fine). Returned y is from the top, as
 * the stylesheet places it.
 */
function parseHotspots(cell) {
  if (!cell) return [];
  return [...cell.querySelectorAll('li')].slice(0, MAX_HOTSPOTS).map((li) => {
    const parts = li.textContent.split('|').map((part) => part.trim());
    // the coordinates come first; a bullet without any "|" is either just them or just a title
    const coords = parts.length > 1 || /^[\d\s.,%]*$/.test(parts[0]) ? parts.shift() : '';
    const [x, y] = coords.split(',');
    const [title = '', ...text] = parts;
    return {
      x: normalizeCoordinate(x),
      y: 100 - normalizeCoordinate(y),
      title,
      text: text.join(' | '),
    };
  });
}

/**
 * the text cut to at most `max` characters, at the last whole word, with an ellipsis; as it is
 * if it fits
 */
function clip(text, max) {
  const full = text.trim();
  if (full.length <= max) return full;
  const cut = full.slice(0, max - 1);
  const atWord = cut.replace(/\s+\S*$/, '');
  return `${(atWord.length >= max / 2 ? atWord : cut).replace(/[\s.,;:–-]+$/, '')}…`;
}

/**
 * a plain-text field's element with its text cut to `max` characters (clip); its paragraph,
 * where it has one, is kept. Returns the text's length if it was cut, else 0
 */
function clipField(node, max) {
  const { length } = node.textContent.trim();
  if (length <= max) return 0;
  const holder = node.querySelector('p') || node;
  holder.textContent = clip(node.textContent, max);
  [...node.children].forEach((child) => {
    if (child !== holder && !child.contains(holder)) child.remove();
  });
  return length;
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
    if (top <= 2) block.classList.add('revealed');
    else if (top > window.innerHeight * 0.5) block.classList.remove('revealed');
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  block.classList.add('curtain');
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(section);
  update();
}

/** the figure takes the image's own ratio so hotspot percentages stay on the artwork */
function trackRatio(figure, img) {
  const apply = () => {
    if (img.naturalWidth && img.naturalHeight) {
      figure.style.setProperty('--interactive-showcase-ratio', (img.naturalWidth / img.naturalHeight).toFixed(4));
    }
  };
  if (img.complete) apply();
  img.addEventListener('load', apply);
}

/**
 * a + whose point is near the edge of the part of the image the card shows (the image's own
 * edge, or the card's where the image runs off it) would be cut off there: it is drawn moved
 * in, just enough to be whole (4px clear of the edge), on every screen and as sizes change.
 * Its x, y stays as authored; its tooltip opens from where it is drawn. In the editor
 * hotspot-editor.js draws (and marks) such points itself.
 */
function keepSpotsInView(stage, items) {
  const AIR = 4;
  const between = (n, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, n)));
  const fit = () => {
    items.forEach(({ figure, spots }) => {
      const w = figure.offsetWidth;
      const h = figure.offsetHeight;
      if (!w || !h || !spots.length) return;
      // the figure's place in the stage, from offsets (the slide's transforms left out)
      let left = 0;
      let top = 0;
      for (let n = figure; n && n !== stage; n = n.offsetParent) {
        left += n.offsetLeft;
        top += n.offsetTop;
      }
      spots.forEach(({ btn, spot }) => {
        const half = btn.offsetWidth / 2 + AIR;
        // in % of the figure: `half` in from the stage's near edge to `half` in from its far one
        const pct = (px, size) => (px / size) * 100;
        const x = between(spot.x, pct(half - left, w), pct(stage.clientWidth - half - left, w));
        const y = between(spot.y, pct(half - top, h), pct(stage.clientHeight - half - top, h));
        btn.style.setProperty('--interactive-showcase-x', `${x}%`);
        btn.style.setProperty('--interactive-showcase-y', `${y}%`);
      });
    });
  };
  fit();
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    items.forEach(({ figure }) => ro.observe(figure));
  } else window.addEventListener('resize', fit);
}

/**
 * browsers without CSS container units (cqw / cqh): the stage's own width and height as
 * --interactive-showcase-cq-w / --interactive-showcase-cq-h, which the CSS uses in their place
 * (@supports not container-type)
 */
function containerUnits(container) {
  if (window.CSS?.supports?.('container-type', 'size')) return;
  const measure = () => {
    container.style.setProperty('--interactive-showcase-cq-w', `${container.clientWidth}px`);
    container.style.setProperty('--interactive-showcase-cq-h', `${container.clientHeight}px`);
  };
  if (window.ResizeObserver) new ResizeObserver(measure).observe(container);
  else window.addEventListener('resize', measure);
}

// the card side by side with its copy (as in interactive-showcase.css)
const SIDE_BY_SIDE = '(width >= 900px), (orientation: landscape) and (width >= 600px)';

/**
 * Universal Editor sizes its frame to the page's height, so in the editor the card cannot take
 * the screen's height (interactive-showcase.css). It is laid out for a screen of the Figma
 * frame's shape at the editor's width instead: the card 1280 x 720 side by side, the screen
 * 375 x 815 for the phone layout. From the width only, so it cannot feed back into the height
 */
function editorScreen(block) {
  const sideBySide = window.matchMedia(SIDE_BY_SIDE);
  const measure = () => {
    const width = block.offsetWidth;
    if (!width) return;
    // the card is 8px in from the screen's edges (interactive-showcase-wrapper)
    const screen = sideBySide.matches ? width * (720 / 1280) + 16 : (width + 16) * (815 / 375);
    ['--interactive-showcase-vh', '--interactive-showcase-svh'].forEach((prop) => {
      block.style.setProperty(prop, `${screen / 100}px`);
    });
  };
  measure();
  if (window.ResizeObserver) new ResizeObserver(measure).observe(block);
  sideBySide.addEventListener('change', measure);
}

// Universal Editor model of one showcase item (block/item). Published rows carry no model, so
// identify items by their image/hotspot content and leave the separate title/description
// heading row out.
const ITEM_MODEL = 'interactive-showcase-item';

/**
 * Universal Editor builds its content tree from what contains what on the page. An item's
 * fields shown outside its row (title and description in the copy column, thumbnail in the
 * tray) therefore stay in the row, hidden, so the tree lists them under their item; what is
 * shown is this copy, without the editor's markers (it is edited in the item's properties)
 */
function displayCopy(node) {
  const copy = node.cloneNode(true);
  [copy, ...copy.querySelectorAll('*')].forEach((n) => {
    [...n.attributes].forEach(({ name }) => {
      if (name.startsWith('data-aue-') || name.startsWith('data-richtext-')) n.removeAttribute(name);
    });
  });
  return copy;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  instance += 1;
  const id = `interactive-showcase-${instance}`;
  const section = block.closest('.section');
  if (section) {
    section.dataset.interactiveShowcaseTheme = 'light';
    if (!section.id && !document.getElementById('nev-tech')) section.id = 'nev-tech';
  }

  const rows = [...block.children];
  // In Universal Editor the model identifies rows. In published HTML, identify item rows by
  // their image/hotspot content; the heading row contains only the main title field.
  const parentRow = rows.find((r) => r.dataset.aueModel === 'interactive-showcase');
  const itemRows = rows.filter((r) => r.dataset.aueModel === ITEM_MODEL
    || (!r.dataset.aueModel && (r.querySelector('picture, li') || r.children.length > 2)));
  const headRow = parentRow || rows.find((r) => !itemRows.includes(r));
  const editing = Boolean(block.closest('[data-aue-resource]'));
  // items after the MAX_ITEMS-th are left out; in the editor they stay in the block (hidden) so
  // they can still be found and removed in the content tree
  const extraRows = itemRows.splice(MAX_ITEMS);
  // Universal Editor filters cannot limit how many items a block takes, only which: once the
  // block has MAX_ITEMS items it gets a filter that allows none (_interactive-showcase.json), so
  // the editor offers no "Add"; below that it gets its own filter back
  if (editing && block.dataset.aueFilter) {
    const full = itemRows.length + extraRows.length >= MAX_ITEMS;
    block.dataset.aueFilter = full ? 'interactive-showcase-full' : 'interactive-showcase';
  }

  // Item field cells are separate in the model: title is text and description is a textarea.
  // The parent model has only a title. Keep a fallback for published markup without UE field
  // attributes.
  const fieldCell = (row, name) => [...(row?.children || [])].find((cell) => (
    cell.matches(`[data-aue-prop="${name}"]`) || cell.querySelector(`[data-aue-prop="${name}"]`)
  )) || null;
  const copy = el('div', 'copy');
  // texts over their limit (MAX_CHARS), listed for the author in the editor
  const tooLong = [];
  if (headRow) {
    headRow.className = 'heading';
    const mainTitle = fieldCell(headRow, 'title');
    // published, the plain-text title is the row's only cell (no heading element, no field name)
    const titleNode = mainTitle || headRow.querySelector('h1, h2, h3') || headRow.firstElementChild;
    titleNode?.classList.add('title');
    // in the editor the title is the field itself, edited in place: it is left whole (the
    // stylesheet keeps it to its lines) and the author is told it is too long
    const titleLength = titleNode?.textContent.trim().length || 0;
    if (titleNode && titleLength > MAX_CHARS.title) {
      if (editing) tooLong.push(`the title (${titleLength} of ${MAX_CHARS.title} characters)`);
      else clipField(titleNode, MAX_CHARS.title);
    }
    copy.append(headRow);
  }
  const detail = el('div', 'detail');
  const counter = el('p', 'counter');
  const texts = el('div', 'texts', { 'aria-live': 'polite' });
  const thumbs = el('div', 'thumbs', { role: 'tablist', 'aria-label': 'Showcase items' });
  detail.append(counter, texts, thumbs);
  if (editing && extraRows.length) {
    const extra = el('div', 'extra-items');
    extra.hidden = true;
    extra.append(...extraRows);
    const note = el('p', 'limit-note');
    note.textContent = `Only the first ${MAX_ITEMS} items are shown. `
      + `${extraRows.length} more ${extraRows.length === 1 ? 'is' : 'are'} hidden: `
      + 'remove or reorder them in the content tree.';
    detail.append(note, extra);
  }
  copy.append(detail);

  const stage = el('div', 'stage');
  containerUnits(stage);
  const tooltip = el('div', 'tooltip', { id: `${id}-tooltip`, role: 'dialog', 'aria-modal': 'false' });
  tooltip.hidden = true;
  const tipTitle = el('p', 'tooltip-title', { id: `${id}-tooltip-title` });
  const tipText = el('p', 'tooltip-text');
  const tipClose = el('button', 'tooltip-close', { type: 'button', 'aria-label': 'Close details' });
  tooltip.setAttribute('aria-labelledby', tipTitle.id);
  tooltip.append(tipTitle, tipText, tipClose);

  let openSpot = null;
  /**
   * where a tooltip may go: the part of the card on screen, 8px in from its edges, and - where
   * the copy column sits beside the image (desktop) - clear of its heading, text and thumbnails
   */
  const freeArea = (spot) => {
    const gap = 8;
    const card = stage.getBoundingClientRect();
    const area = {
      left: Math.max(card.left, 0) + gap,
      right: Math.min(card.right, document.documentElement.clientWidth) - gap,
      top: Math.max(card.top, 0) + gap,
      bottom: Math.min(card.bottom, window.innerHeight) - gap,
    };
    copy.querySelectorAll('.title, .counter, .text:not([hidden]), .thumbs, .limit-note')
      .forEach((part) => {
        const r = part.getBoundingClientRect();
        const beside = r.width && r.bottom > area.top && r.top < area.bottom;
        if (beside && r.right <= spot.left) area.left = Math.max(area.left, r.right + gap);
      });
    return area;
  };

  /**
   * the tooltip opens away from the edges, by the quadrant of the free area its hotspot is in:
   * from a hotspot in the right half it opens to the left, from one in the left half to the
   * right; from the lower half it opens up, from the upper half down (the hotspot in its
   * corner, as in the design). Where that side does not fit it takes the other one; where
   * neither does (narrow screens) it opens just below or above the hotspot, centred on it and
   * nudged in, the hotspot keeping its own box. Up or down: the one that fits, else the one
   * with more room.
   */
  const placeTooltip = () => {
    if (!openSpot) return;
    const spot = openSpot.getBoundingClientRect();
    const area = freeArea(spot);
    // a hotspot at the very edge of the card reaches past the free area: its tooltip may go as
    // far as the hotspot itself does, so it stays on the hotspot's corner (one box with it)
    // rather than being nudged off it
    area.left = Math.min(area.left, spot.left - 0.5);
    area.right = Math.max(area.right, spot.right + 0.5);
    area.top = Math.min(area.top, spot.top - 0.5);
    area.bottom = Math.max(area.bottom, spot.bottom + 0.5);
    const set = (side, align) => {
      tooltip.dataset.side = side;
      tooltip.dataset.align = align;
      return tooltip.getBoundingClientRect();
    };
    const fitsAcross = (b) => b.left >= area.left && b.right <= area.right;
    const overflowY = (b) => Math.max(0, area.top - b.top) + Math.max(0, b.bottom - area.bottom);
    const spotX = (spot.left + spot.right) / 2;
    const spotY = (spot.top + spot.bottom) / 2;
    tooltip.style.removeProperty('--interactive-showcase-sx');
    tooltip.style.removeProperty('--interactive-showcase-sy');

    const sides = spotX > (area.left + area.right) / 2 ? ['left', 'right'] : ['right', 'left'];
    const side = sides.find((s) => fitsAcross(set(s, 'top'))) || 'center';
    const apart = side === 'center';
    const aligns = apart ? ['below', 'above'] : ['top', 'bottom'];
    if (spotY > (area.top + area.bottom) / 2) aligns.reverse();
    const [align] = aligns
      .map((a) => [a, overflowY(set(side, a))])
      .sort((a, b) => a[1] - b[1]);
    const box = set(side, align[0]);

    // nudged in where it still does not fit (across, and up or down); taller than the free
    // area (the shortest phones) it keeps to its top. It may then cover some of the image, never
    // the copy or the edges; its hotspot stays above it, so it can still be closed
    if (box.right > area.right) tooltip.style.setProperty('--interactive-showcase-sx', `${area.right - box.right}px`);
    else if (box.left < area.left) tooltip.style.setProperty('--interactive-showcase-sx', `${area.left - box.left}px`);
    const sy = box.top < area.top || box.height > area.bottom - area.top
      ? area.top - box.top
      : Math.min(0, area.bottom - box.bottom);
    if (sy) tooltip.style.setProperty('--interactive-showcase-sy', `${sy}px`);
    // a tooltip moved off its hotspot's corner leaves the hotspot its own box
    openSpot.classList.toggle('hotspot-apart', apart || Boolean(sy));
  };

  // the hotspot whose tooltip is shrinking back into it (closeTooltip with animate)
  let closingSpot = null;
  const finishClosing = () => {
    if (!closingSpot) return;
    const spot = closingSpot;
    closingSpot = null;
    // the hotspot takes over the box the tooltip has shrunk into, in the colour it ended in
    // (its own, unless hovered: then it eases on to the hover colour)
    const { backgroundColor } = getComputedStyle(spot.classList.contains('hotspot-apart') ? spot : tooltip);
    spot.style.transition = 'none';
    spot.style.backgroundColor = backgroundColor;
    spot.classList.remove('is-closing', 'hotspot-apart');
    tooltip.classList.remove('is-closing');
    tooltip.hidden = true;
    spot.getBoundingClientRect();
    spot.style.removeProperty('transition');
    spot.style.removeProperty('background-color');
  };
  tooltip.addEventListener('animationend', (e) => {
    if (e.target === tooltip && tooltip.classList.contains('is-closing')) finishClosing();
  });

  /**
   * closes the open tooltip: at once, or (animate: closed by the user) shrinking back into its
   * hotspot, the reverse of its opening (interactive-showcase.css)
   */
  const closeTooltip = ({ refocus = false, animate = false } = {}) => {
    if (!openSpot) return;
    const spot = openSpot;
    openSpot = null;
    spot.setAttribute('aria-expanded', 'false');
    if (refocus) spot.focus();
    tooltip.classList.remove('is-opening');
    if (!animate) {
      spot.classList.remove('hotspot-apart');
      tooltip.hidden = true;
      return;
    }
    closingSpot = spot;
    spot.classList.add('is-closing');
    tooltip.classList.add('is-closing');
    // no animation (reduced motion): nothing to wait for
    if (getComputedStyle(tooltip).animationName === 'none') finishClosing();
  };
  const openTooltip = (spot, data) => {
    finishClosing();
    closeTooltip();
    openSpot = spot;
    spot.setAttribute('aria-expanded', 'true');
    tipTitle.textContent = clip(data.title, MAX_CHARS.hotspotTitle);
    tipText.textContent = clip(data.text, MAX_CHARS.hotspotText);
    spot.closest('.figure').append(tooltip);
    // where the hotspot is drawn (in the editor, one in the cut-off part of the image is drawn
    // at the nearest visible point, not at its own x, y)
    ['--interactive-showcase-x', '--interactive-showcase-y'].forEach((prop) => {
      tooltip.style.setProperty(prop, spot.style.getPropertyValue(prop));
    });
    // placed at its full size, then grown out of its hotspot (restarted each time, also when
    // going straight from one hotspot to another)
    tooltip.classList.remove('is-opening');
    tooltip.hidden = false;
    placeTooltip();
    tooltip.getBoundingClientRect();
    tooltip.classList.add('is-opening');
  };

  const items = itemRows.map((row, i) => {
    const cells = [...row.children];
    const mediaCell = cells.find((c) => c.querySelector('picture')) || cells[0];
    const hotCell = cells.find((c) => c !== mediaCell && c.querySelector('li'))
      || (cells.length >= 3 ? cells[cells.length - 1] : null);
    let titleCell = fieldCell(row, 'title');
    let descriptionCell = fieldCell(row, 'description');
    // Published markup may not carry data-aue-prop. Find the separate title/description cells
    // by their content when Universal Editor field attributes are absent.
    const contentCells = cells.filter((c) => c !== mediaCell && c !== hotCell);
    if (!titleCell) titleCell = contentCells.find((c) => c.querySelector('h2, h3, h4')) || contentCells[0] || null;
    if (!descriptionCell) descriptionCell = contentCells.find((c) => c !== titleCell) || null;
    if (descriptionCell === titleCell) descriptionCell = null;
    const pictures = [...(mediaCell?.querySelectorAll('picture') || [])];
    // in the editor each image names its field; published, the thumbnail comes first
    const fieldPicture = (name) => mediaCell?.querySelector(`[data-aue-prop="${name}"]`)?.closest('picture');
    const thumbPicture = fieldPicture('media_thumbnail') || pictures[0];
    const imagePicture = fieldPicture('media_image')
      || pictures.find((p) => p !== thumbPicture) || thumbPicture?.cloneNode(true);
    const title = clip(titleCell?.textContent || '', MAX_CHARS.itemTitle) || `Showcase item ${i + 1}`;

    // the item row becomes its panel (keeps the editor's item instrumentation)
    row.className = 'panel';
    row.id = `${id}-panel-${i}`;
    row.setAttribute('role', 'tabpanel');
    row.setAttribute('aria-labelledby', `${id}-tab-${i}`);
    const figure = el('div', 'figure');
    if (imagePicture) figure.append(imagePicture);
    const img = imagePicture?.querySelector('img');
    if (img) trackRatio(figure, img);
    // each spot keeps its whole title and text (the editor writes them back when a + is moved);
    // they are shortened where they are shown
    const spots = parseHotspots(hotCell).map((spot, n) => {
      [['title', MAX_CHARS.hotspotTitle], ['text', MAX_CHARS.hotspotText]].forEach(([key, max]) => {
        if (spot[key].length > max) {
          tooLong.push(`item ${i + 1}, + point ${n + 1}: its ${key === 'title' ? 'title' : 'description'} (${spot[key].length} of ${max} characters)`);
        }
      });
      const btn = el('button', 'hotspot', {
        type: 'button',
        'aria-label': spot.title ? `Show details: ${clip(spot.title, MAX_CHARS.hotspotTitle)}` : 'Show details',
        'aria-expanded': 'false',
        'aria-controls': tooltip.id,
      });
      btn.style.setProperty('--interactive-showcase-x', `${spot.x}%`);
      btn.style.setProperty('--interactive-showcase-y', `${spot.y}%`);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (openSpot === btn) closeTooltip({ animate: true });
        else openTooltip(btn, spot);
      });
      figure.append(btn);
      return { btn, spot };
    });
    if (hotCell) hotCell.classList.add('hotspot-source');
    mediaCell?.remove();
    row.prepend(figure);
    stage.append(row);

    // published, the fields move to where they are shown; in the editor a copy is shown there
    // and the field itself stays in the row, hidden (see displayCopy)
    const show = (field) => {
      if (!editing) return field;
      const shown = displayCopy(field);
      field.hidden = true;
      return shown;
    };
    const textCell = el('div', 'text');
    if (titleCell) {
      const shownTitle = show(titleCell);
      shownTitle.classList.add('item-title');
      const length = clipField(shownTitle, MAX_CHARS.itemTitle);
      if (length) tooLong.push(`item ${i + 1}: its title (${length} of ${MAX_CHARS.itemTitle} characters)`);
      textCell.append(shownTitle);
    }
    if (descriptionCell) {
      const shownDescription = show(descriptionCell);
      shownDescription.classList.add('description');
      const length = clipField(shownDescription, MAX_CHARS.description);
      if (length) tooLong.push(`item ${i + 1}: its description (${length} of ${MAX_CHARS.description} characters)`);
      textCell.append(shownDescription);
    }
    if (textCell.children.length) texts.append(textCell);

    const tab = el('button', 'thumb', {
      type: 'button', role: 'tab', id: `${id}-tab-${i}`, 'aria-controls': row.id, 'aria-label': title,
    });
    if (thumbPicture) {
      if (editing) {
        // first in the row, as the thumbnail is first in the item's model
        const thumbField = el('div');
        thumbField.hidden = true;
        row.prepend(thumbField);
        thumbField.append(thumbPicture);
      }
      const shownThumb = show(thumbPicture);
      shownThumb.querySelector('img')?.setAttribute('alt', '');
      tab.append(shownThumb);
    }
    thumbs.append(tab);
    return {
      row, textCell, tab, figure, hotCell, spots,
    };
  });

  if (editing && tooLong.length) {
    const note = el('p', 'limit-note');
    note.textContent = `Too long for the card, so shortened on the page: ${tooLong.join('; ')}. `
      + 'Shorten them in the properties.';
    detail.prepend(note);
  }

  let current = 0;
  /**
   * the images move like a vertical carousel (interactive-showcase.css): picking a thumbnail to
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
      row.querySelector('.figure')?.toggleAttribute('data-zoom-source', active);
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

  tipClose.addEventListener('click', () => closeTooltip({ refocus: true, animate: true }));
  window.addEventListener('resize', () => {
    if (openSpot) placeTooltip();
  });
  document.addEventListener('click', (e) => {
    if (openSpot && !tooltip.contains(e.target)) closeTooltip({ animate: true });
  });
  block.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openSpot) closeTooltip({ refocus: true, animate: true });
  });

  block.replaceChildren(copy, stage);
  if (editing) {
    block.classList.add('editing');
    editorScreen(block);
  } else if (section && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    curtain(section, block);
  }
  if (items.length) select(0);
  if (!editing) keepSpotsInView(stage, items);

  // Universal Editor only: drag / nudge the + points and save their x, y (hotspot-editor.js)
  if (block.classList.contains('editing') && items.length) {
    import('./hotspot-editor.js')
      .then(({ default: editHotspots }) => editHotspots(items, closeTooltip))
      // optional: the block works the same without it
      .catch(() => {});
  }

  // Universal Editor: selecting an item, or one of its fields, in the content tree or on the
  // page shows that item. Listened to while capturing, so it is heard wherever it is dispatched
  if (editing && items.length) {
    document.addEventListener('aue:ui-select', (e) => {
      if (!block.isConnected || !e.detail?.selected) return;
      const { resource } = e.detail;
      const index = items.findIndex(({ row }) => (resource && row.dataset.aueResource === resource)
        || (e.target instanceof Node && row.contains(e.target)));
      if (index >= 0 && index !== current) select(index);
    }, true);
  }
}
