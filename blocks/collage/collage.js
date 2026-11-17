import { loadScript } from '../../scripts/aem.js';
import { moveInstrumentation, unwrapEditorRichtext } from '../../scripts/scripts.js';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png'];

function extensionOf(url) {
  try {
    const name = new URL(url, window.location.href).pathname.split('/').pop();
    return name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  } catch (e) {
    return '';
  }
}

function acceptedType(url, allowed, field, block) {
  const ext = extensionOf(url);
  if (allowed.includes(ext)) return true;
  // eslint-disable-next-line no-console
  console.warn(`${block}: the ${field} ${url} is not shown: its file type (${ext ? `.${ext}` : 'none'}) is not .${allowed.join(', .')}`);
  return false;
}

function acceptedPicture(picture, allowed, field, block) {
  const src = picture?.querySelector('img')?.getAttribute('src');
  if (!picture || !src) return picture || null;
  return acceptedType(src, allowed, field, block) ? picture : null;
}

const BLOCK = 'collage';

const TEXT_LIMITS = {
  heading: 120,
  description: 600,
};

const GSAP_SRC = `${window.hlx?.codeBasePath || ''}/scripts/vendor/gsap.min.js`;
const SCROLL_TRIGGER_SRC = `${window.hlx?.codeBasePath || ''}/scripts/vendor/ScrollTrigger.min.js`;

const ENGINE = 'center-engine';
const PLACES = [ENGINE, 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
const PLACE_NAMES = ['Centre engine', 'Top left', 'Top right', 'Bottom left', 'Bottom right'];
const MAX_IMAGES = PLACES.length;
const ITEM_MODEL = 'collage-item';
const FILTERS = { open: 'collage', full: 'collage-full' };
const ALIASES = {
  engine: ENGINE,
  center: ENGINE,
  centre: ENGINE,
  'centre-engine': ENGINE,
  'card-charger': 'top-left',
  'card-room': 'top-right',
  'card-bridge': 'bottom-left',
  'card-spring': 'bottom-right',
};

const FRAME = { width: 1280, height: 720 };
const CARD = {
  left: 500, top: 180, width: 280, height: 360,
};
const NARROW_FRAME_WIDTH = 860;
const SEQUENCES = 2;
const SIDES = {
  'top-left': -1,
  'bottom-left': -1,
  'top-right': 1,
  'bottom-right': 1,
};
const GROUP_INNER_EDGE = FRAME.width / 2 - 488;
const GROUP_CLEARANCE = 40;
const GROUP_SLIDE_TIME = 0.65;
// the right pair starts further out so it stays clear of the engine flying in from the right
const RIGHT_GROUP_EXTRA = 300;
const GROUP_EASE = { [-1]: 'power2.out', 1: 'power2.inOut' };
const CLUSTER_BOTTOM = CARD.top + CARD.height;
const CLUSTER_CLEARANCE = 40;
const STATEMENT_CLEARANCE = 20;
const LANDING_FIT = 0.94;

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

const cellsOf = (row) => [...(row?.children || [])];

// cuts rich text at `limit` characters (across the nodes, in order) with "...", keeping the tags
// before the cut; the whole text becomes a tooltip; the editor shows it whole (edited in place)
function cap(nodes, limit, editing) {
  const parts = nodes.filter(Boolean);
  const full = parts.map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
  if (!full || editing || full.length <= limit) return;
  parts[0].title = full;
  let left = limit;
  let cut = null;
  parts.forEach((part) => {
    if (cut) {
      part.remove();
      return;
    }
    const walker = document.createTreeWalker(part, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t && !cut; t = walker.nextNode()) {
      if (t.data.length < left) left -= t.data.length;
      else {
        t.data = `${t.data.slice(0, left).trimEnd()}...`;
        cut = t;
      }
    }
    // everything after the cut, in document order, goes
    for (let n = cut; n && n !== part; n = n.parentNode) {
      while (n.nextSibling) n.nextSibling.remove();
    }
  });
}

const toClass = (s) => s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
const clamp01 = (n) => Math.min(1, Math.max(0, n));
const smooth = (t) => t * t * (3 - 2 * t);
const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((2 - 2 * t) ** 2) / 2);

function placeOf(cell) {
  return (cell?.textContent || '').split(/[\s,]+/).map(toClass).filter(Boolean)
    .map((n) => ALIASES[n] || n)
    .find((n) => PLACES.includes(n));
}

function sortRows(rows) {
  const textRow = rows.find((r) => r.querySelector('h1, h2, h3'))
    || rows.find((r) => !r.querySelector('picture') && r.textContent.trim()) || null;
  const imageRows = rows.filter((r) => r !== textRow && r.querySelector('picture'));
  const others = rows.filter((r) => r !== textRow && !imageRows.includes(r));
  return { textRow, imageRows, others };
}

function trackScale(card, block) {
  const measure = () => {
    const w = card.clientWidth;
    const h = card.clientHeight / (block.classList.contains('static') ? 2 : 1);
    if (!w || !h) return;
    const narrow = w / h < (FRAME.width / FRAME.height) * 0.8;
    const u = narrow ? Math.min(w / NARROW_FRAME_WIDTH, h / FRAME.height)
      : Math.min(w / FRAME.width, h / FRAME.height);
    card.style.setProperty('--collage-u', u.toFixed(5));
  };
  measure();
  if (window.ResizeObserver) new ResizeObserver(measure).observe(card);
  else window.addEventListener('resize', measure);
}

function selectedImage(showcase) {
  const figure = showcase?.querySelector('[data-zoom-source]');
  const img = figure?.querySelector('img');
  if (!img) return null;
  const box = figure.getBoundingClientRect();
  let ratio = 1;
  if (box.width && box.height) ratio = box.width / box.height;
  else if (img.naturalWidth && img.naturalHeight) ratio = img.naturalWidth / img.naturalHeight;
  const tone = getComputedStyle(img).filter;
  return {
    figure,
    img,
    src: img.currentSrc || img.src,
    tone: tone === 'none' ? '' : tone,
    ratio,
  };
}

function landing(ratio, width, height) {
  let w = width * LANDING_FIT;
  let h = w / ratio;
  if (h > height * LANDING_FIT) {
    h = height * LANDING_FIT;
    w = h * ratio;
  }
  return {
    left: (width - w) / 2, top: (height - h) / 2, width: w, height: h,
  };
}

// the centre card shows the showcase's selected image, exactly where the flight lands it
function inheritSelection(engine, showcase) {
  const landed = el('img', 'landed', { alt: '' });
  landed.decoding = 'async';
  engine.append(landed);
  const sync = () => {
    const selected = selectedImage(showcase);
    engine.classList.toggle('inherits', Boolean(selected));
    if (!selected) return;
    if (landed.dataset.src !== selected.src) {
      landed.dataset.src = selected.src;
      landed.src = selected.src;
    }
    landed.alt = selected.img.getAttribute('alt') || '';
    landed.style.filter = selected.tone;
    const spot = landing(selected.ratio, CARD.width, CARD.height);
    Object.assign(landed.style, {
      left: `${spot.left}px`, top: `${spot.top}px`, width: `${spot.width}px`, height: `${spot.height}px`,
    });
  };
  sync();
  new MutationObserver(sync).observe(showcase, {
    subtree: true, attributes: true, attributeFilter: ['data-zoom-source'],
  });
  window.addEventListener('resize', sync);
  return sync;
}

// Sequence 1: a copy of the showcase's selected image, scaled from its place into the centre card
function flight(card, showcase) {
  const box = el('div', 'flight', { 'aria-hidden': 'true' });
  const img = el('img', '', { alt: '' });
  img.decoding = 'async';
  box.append(img);
  card.append(box);
  let hidden = null;

  const restore = () => {
    hidden?.style.removeProperty('visibility');
    hidden = null;
  };

  return (p) => {
    const selected = selectedImage(showcase);
    if (!selected || p <= 0 || p >= 1) {
      box.style.visibility = 'hidden';
      restore();
      return;
    }
    const { figure } = selected;
    if (img.dataset.src !== selected.src) {
      img.dataset.src = selected.src;
      img.src = selected.src;
    }
    img.style.filter = selected.tone;
    const u = parseFloat(card.style.getPropertyValue('--collage-u')) || 1;
    const c = card.getBoundingClientRect();
    const from = figure.getBoundingClientRect();
    if (!from.width || !from.height) return;
    const w = CARD.width * u;
    const h = CARD.height * u;
    const left = c.width / 2 + (CARD.left - FRAME.width / 2) * u;
    const top = c.height / 2 + (CARD.top - FRAME.height / 2) * u;
    const spot = landing(selected.ratio, w, h);
    const iw = spot.width;
    const ih = spot.height;
    const ix = spot.left;
    const iy = spot.top;
    const s0 = from.width / iw;
    const x0 = from.left - c.left - left - ix * s0;
    const y0 = from.top - c.top - top - iy * s0;
    const e = inOut(clamp01((p - 0.05) / 0.95));
    const s = s0 + (1 - s0) * e;
    const form = smooth(clamp01((p - 0.5) / 0.4));
    Object.assign(box.style, {
      visibility: 'visible',
      left: `${left}px`,
      top: `${top}px`,
      width: `${w}px`,
      height: `${h}px`,
      transform: `translate3d(${(x0 * (1 - e)).toFixed(1)}px, ${(y0 * (1 - e)).toFixed(1)}px, 0) scale(${s.toFixed(4)})`,
      backgroundColor: `rgb(0 0 0 / ${(form * 100).toFixed(1)}%)`,
      borderRadius: `${((16 * u * form) / s).toFixed(2)}px`,
    });
    Object.assign(img.style, {
      left: `${ix}px`, top: `${iy}px`, width: `${iw}px`, height: `${ih}px`,
    });
    if (hidden !== figure) {
      restore();
      hidden = figure;
      figure.style.visibility = 'hidden';
    }
  };
}

function groupSlide(card) {
  const u = parseFloat(card.style.getPropertyValue('--collage-u')) || 1;
  return card.clientWidth / (2 * u) - GROUP_INNER_EDGE + GROUP_CLEARANCE;
}

// Sequence 2: cluster and statement move up the same distance, like one scrolling page
function secondScroll(card, statement) {
  const u = parseFloat(card.style.getPropertyValue('--collage-u')) || 1;
  const clusterBottom = card.clientHeight / 2 + (CLUSTER_BOTTOM - FRAME.height / 2) * u;
  const textTop = statement.offsetTop
    + Math.min(...[...statement.children].map((child) => child.offsetTop));
  return Math.max(
    clusterBottom + CLUSTER_CLEARANCE * u,
    card.clientHeight - (Number.isFinite(textTop) ? textTop : 0) + STATEMENT_CLEARANCE,
  );
}

async function playSequences({
  block, stage, veil, paper, statement, items, showcase, fly,
}) {
  await loadScript(GSAP_SRC);
  await loadScript(SCROLL_TRIGGER_SRC);
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  const others = PLACES.slice(1).map((place) => items[place]).filter(Boolean);
  const engine = items[ENGINE];
  const screen = () => stage.clientHeight || window.innerHeight;
  const stops = () => {
    block.dataset.scrollStops = Array.from({ length: SEQUENCES }, (_, i) => Math.round((i + 1) * screen())).join(',');
  };
  stops();
  ScrollTrigger.addEventListener('refreshInit', stops);

  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: block,
      start: 'top top',
      end: () => `+=${SEQUENCES * screen()}`,
      scrub: true,
      invalidateOnRefresh: true,
    },
    onUpdate() {
      fly(this.time());
    },
  });
  timeline.set({}, {}, SEQUENCES);
  if (showcase) {
    timeline.fromTo(veil, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0);
    timeline.fromTo(paper, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.35);
    timeline.to(veil, { opacity: 0, duration: 0.1 }, 0.8);
  }
  [-1, 1].forEach((side) => {
    const group = others.filter((item) => [...item.classList].some((c) => SIDES[c] === side));
    if (!group.length) return;
    const extra = side > 0 && showcase ? RIGHT_GROUP_EXTRA : 0;
    timeline.fromTo(group, {
      x: () => side * (groupSlide(stage.querySelector('.card')) + extra), y: 0,
    }, {
      x: 0, y: 0, duration: GROUP_SLIDE_TIME, ease: showcase ? GROUP_EASE[side] : 'power2.out',
    }, 0.35);
  });
  if (engine) {
    if (showcase) timeline.fromTo(engine, { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0.88);
    else {
      timeline.fromTo(engine, { scale: 1.6, opacity: 0 }, {
        scale: 1, opacity: 1, duration: 0.8, ease: 'power2.out',
      }, 0.1);
    }
  }
  const card = stage.querySelector('.card');
  const distance = () => secondScroll(card, statement);
  const u = () => parseFloat(card.style.getPropertyValue('--collage-u')) || 1;
  const cluster = [engine, ...others].filter(Boolean);
  if (cluster.length) {
    timeline.to(cluster, { y: () => -distance() / u(), duration: 1, ease: 'none' }, 1);
  }
  timeline.fromTo(statement, { y: distance, opacity: 1 }, {
    y: 0, duration: 1, ease: 'none',
  }, cluster.length ? '<' : 1);
  fly(timeline.time());
  block.classList.add('ready');
  ScrollTrigger.refresh();
  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }
}

export default function decorate(block) {
  unwrapEditorRichtext(block);
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const rows = [...block.children];
  const { textRow, imageRows, others } = sortRows(rows);
  // Universal Editor filters can't count: at MAX_IMAGES, switch to one that allows no more items
  const imageCount = rows.filter((r) => r.dataset.aueModel === ITEM_MODEL).length;
  if (editing && block.dataset.aueFilter) {
    block.dataset.aueFilter = imageCount >= MAX_IMAGES ? FILTERS.full : FILTERS.open;
  }

  const unplaced = el('div', 'unplaced');
  unplaced.hidden = true;
  if (editing) others.forEach((row) => unplaced.append(row));

  const stage = el('div', 'stage');
  const card = el('div', 'card');
  const veil = el('div', 'veil');
  const paper = el('div', 'paper');
  const frame = el('div', 'frame');
  const statement = el('div', 'statement');
  if (textRow) {
    const cells = cellsOf(textRow);
    const cell = cells.length === 1 ? cells[0] : textRow;
    moveInstrumentation(textRow, statement);
    if (cell !== textRow) moveInstrumentation(cell, statement);
    statement.append(...cell.childNodes);
    const heading = statement.querySelector('h1, h2, h3');
    heading?.classList.add('title');
    cap([heading], TEXT_LIMITS.heading, editing);
    cap([...statement.querySelectorAll('p')], TEXT_LIMITS.description, editing);
  }
  const items = {};
  imageRows.forEach((row) => {
    const cells = cellsOf(row);
    const imageCell = cells.find((c) => c.querySelector('picture'));
    const place = placeOf(cells.find((c) => c !== imageCell));
    const picture = acceptedPicture(imageCell.querySelector('picture'), IMAGE_EXTENSIONS, `${place || 'collage'} image`, BLOCK);
    if (!place || items[place] || !picture) {
      if (editing) unplaced.append(row);
      return;
    }
    const item = el('figure', `item ${place}`);
    item.append(picture);
    moveInstrumentation(row, item);
    items[place] = item;
  });
  PLACES.forEach((place) => items[place] && frame.append(items[place]));
  card.append(veil, paper, frame, statement);
  stage.append(card);
  const room = el('div', 'room');
  block.replaceChildren(stage, room);
  if (unplaced.childElementCount) block.append(unplaced);
  const hidden = unplaced.childElementCount;
  if (editing && (imageCount > MAX_IMAGES || hidden)) {
    const note = el('p', 'limit-note');
    note.textContent = imageCount > MAX_IMAGES
      ? `This collage has ${imageCount} images; it shows ${MAX_IMAGES}, one per place. Remove the extra ones in the content tree.`
      : `${hidden} image${hidden === 1 ? ' is' : 's are'} not shown: each needs a picture and a place of its own (${PLACE_NAMES.join(', ')}).`;
    stage.prepend(note);
  }

  const section = block.closest('.section');
  const showcase = section?.querySelector('.interactive-showcase');
  const still = () => {
    block.classList.add('static');
    section?.classList.remove('collage-pinned');
  };
  block.classList.toggle('editing', editing);
  if (editing || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    still();
    trackScale(card, block);
    if (!editing && showcase && items[ENGINE]) inheritSelection(items[ENGINE], showcase);
    return;
  }

  const syncCentre = showcase && items[ENGINE] ? inheritSelection(items[ENGINE], showcase) : null;

  block.classList.add('animated');
  if (showcase) section.classList.add('collage-pinned');
  trackScale(card, block);
  const flyTo = flight(card, showcase);
  const fly = (p) => {
    syncCentre?.();
    flyTo(p);
  };
  playSequences({
    block, stage, veil, paper, statement, items, showcase, fly,
  }).catch(() => {
    block.classList.remove('animated');
    still();
    trackScale(card, block);
  });
}