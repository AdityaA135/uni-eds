// Cards "Roller" style (homepage highlights): image cards on a vertical drum that turns with the
// page's scroll (the section is a scroll runway) and settles on the nearest card, as in the
// homepage prototype.

// the runway, as fractions of its length: the intro up to T_IN, the cards up to T_OUT, then a
// short hold on the last card
const T_IN = 0.16;
const T_OUT = 0.94;
// settling onto the nearest card: not this close to the runway's ends, over SETTLE_MS, once the
// scroll has been still for IDLE_MS
const SNAP_MIN = T_IN * 0.6;
const SNAP_MAX = 0.985;
const SETTLE_MS = 800;
const IDLE_MS = 150;
// share of the way the drum catches up with the scroll each frame
const FOLLOW = 0.1;
// the price bar shows from this far into the runway
const BAR_FROM = 0.1;
// a card this close to the front shows its caption
const ACTIVE_WITHIN = 0.42;
// the intro position if the CSS gives no --rl-intro-at
const INTRO_AT = -0.75;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Classes a card's heading and description.
 * @param {Element} li the card
 */
function classCard(li) {
  const body = li.querySelector('.card-body');
  if (!body) return;
  body.classList.add('rl-copy');
  let seenHeading = false;
  body.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach((el) => {
    if (el.tagName !== 'P') {
      if (!seenHeading) el.classList.add('rl-title');
      seenHeading = true;
      return;
    }
    if (el.textContent.trim()) el.classList.add('rl-desc');
  });
}

// width of the downscaled patch of photo the caption colour is read from
const SAMPLE = 24;
// the card's own colour (--rl-light), seen through a photo's transparent parts
const CARD_BG = 240;
// above this luminance black text has more contrast than white (WCAG)
const LIGHT_FROM = 0.179;

const linear = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/**
 * The average luminance (0 to 1) of the part of a card's photo behind its caption.
 * @param {Element} li the card
 * @returns {number|null} null if the photo isn't loaded or can't be read
 */
function captionBackdrop(li) {
  const img = li.querySelector('.card-img');
  const copy = li.querySelector('.rl-copy');
  const w = li.offsetWidth;
  const h = li.offsetHeight;
  if (!img?.naturalWidth || !copy || !w || !h) return null;
  // the photo's scale and crop under object-fit: cover
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const left = (w - img.naturalWidth * scale) / 2;
  const top = (h - img.naturalHeight * scale) / 2;
  const sx = Math.max(0, (copy.offsetLeft - left) / scale);
  const sy = Math.max(0, (copy.offsetTop - top) / scale);
  const sw = Math.min(img.naturalWidth - sx, copy.offsetWidth / scale);
  const sh = Math.min(img.naturalHeight - sy, copy.offsetHeight / scale);
  if (sw <= 0 || sh <= 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE;
  canvas.height = Math.max(1, Math.round((SAMPLE * sh) / sw));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  try {
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] / 255;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]].map((v) => v * a + CARD_BG * (1 - a));
      sum += 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    }
    return sum / (data.length / 4);
  } catch {
    return null; // a photo from another origin without CORS can't be read
  }
}

/**
 * Marks a card is-light (dark text) or is-dark (light text) from its photo; with neither, the
 * CSS blends the text.
 * @param {Element} li the card
 */
function pickCaptionColour(li) {
  const luminance = captionBackdrop(li);
  li.classList.toggle('is-light', luminance !== null && luminance > LIGHT_FROM);
  li.classList.toggle('is-dark', luminance !== null && luminance <= LIGHT_FROM);
}

/**
 * Decorates the Roller style.
 * @param {Element} block the cards block
 * @param {HTMLUListElement} ul the card list
 */
export default function decorateRoller(block, ul) {
  const cards = [...ul.children];
  cards.forEach(classCard);
  // caption colours once each photo loads, and again after a resize (the caption moves)
  cards.forEach((li) => {
    const img = li.querySelector('.card-img');
    if (!img) return;
    if (img.complete) pickCaptionColour(li);
    img.addEventListener('load', () => pickCaptionColour(li));
  });
  let recolour = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(recolour);
    recolour = window.setTimeout(() => cards.forEach(pickCaptionColour), 200);
  });
  // the price bar's link gets the CTA glitch hover (scripts/utils/glitch.js)
  block.closest('.section')?.querySelectorAll('.cards-wrapper ~ .default-content-wrapper a[href]')
    .forEach((a) => { a.dataset.glitch = ''; });

  const authoring = !!document.querySelector('[data-aue-resource]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Universal Editor, reduced motion or a single card: a plain stack
  if (authoring || reduce || cards.length < 2) {
    block.classList.add('is-static');
    return;
  }

  const section = block.closest('.section');
  if (!section) {
    block.classList.add('is-static');
    return;
  }
  const count = cards.length;
  const titleBox = section.querySelector(':scope > .default-content-wrapper:first-child') || section;
  ul.classList.add('rl-drum');

  // progress, one mark per card
  const rail = document.createElement('div');
  rail.className = 'rl-rail';
  const marks = cards.map((li, i) => {
    const mark = document.createElement('button');
    mark.type = 'button';
    mark.className = 'rl-mark';
    const label = li.querySelector('.rl-title')?.textContent.trim() || `Card ${i + 1}`;
    mark.setAttribute('aria-label', label);
    rail.append(mark);
    return mark;
  });

  let introAt = INTRO_AT;
  const readIntroAt = () => {
    const value = parseFloat(getComputedStyle(block).getPropertyValue('--rl-intro-at'));
    introAt = Number.isFinite(value) ? value : INTRO_AT;
  };

  // runway progress (0 to 1) ↔ drum position (introAt … count - 1)
  const toDrum = (p) => (p < T_IN
    ? introAt + (0 - introAt) * (p / T_IN)
    : Math.min(count - 1, ((p - T_IN) / (T_OUT - T_IN)) * (count - 1)));
  const toProgress = (k) => T_IN + (count > 1 ? k / (count - 1) : 0) * (T_OUT - T_IN);
  const runway = () => {
    const rect = section.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    return { rect, total, p: total > 0 ? clamp(-rect.top / total, 0, 1) : 0 };
  };

  // phones: white washes over the cards above and below
  const washes = ['top', 'bottom'].map((side) => {
    const wash = document.createElement('div');
    wash.className = `rl-wash rl-wash-${side}`;
    wash.setAttribute('aria-hidden', 'true');
    return wash;
  });

  // only what changed is written each frame
  let lastNearest = null;
  let lastMarked = null;
  let lastIntroT = null;
  const activeNow = cards.map(() => null);
  const render = (s) => {
    cards.forEach((li, i) => {
      const d = i - s;
      li.style.setProperty('--offset', d.toFixed(4));
      const on = Math.abs(d) < ACTIVE_WITHIN;
      if (activeNow[i] === on) return;
      activeNow[i] = on;
      li.classList.toggle('is-active', on);
      li.setAttribute('aria-hidden', String(!on));
    });
    washes[0].style.opacity = clamp(s, 0, 1).toFixed(3);
    washes[1].style.opacity = (clamp(s + 0.4, 0, 1) * clamp(count - 1 - s, 0, 1)).toFixed(3);
    // 1 on the intro, 0 once the first card is in front
    const introT = clamp(s / introAt, 0, 1).toFixed(2);
    if (introT !== lastIntroT) {
      lastIntroT = introT;
      block.style.setProperty('--rl-intro-t', introT);
    }
    const nearest = clamp(Math.round(s), 0, count - 1);
    if (nearest !== lastNearest) {
      lastNearest = nearest;
      block.style.setProperty('--active', nearest);
    }
    const marked = s > introAt / 2 ? nearest : -1;
    if (marked !== lastMarked) {
      lastMarked = marked;
      marks.forEach((mark, i) => {
        if (i === marked) mark.setAttribute('aria-current', 'step');
        else mark.removeAttribute('aria-current');
      });
    }
  };

  // the drum eases after the scroll
  let target = introAt;
  let shown = introAt;
  let frame = 0;
  const tick = () => {
    shown += (target - shown) * FOLLOW;
    if (Math.abs(target - shown) < 0.0005) shown = target;
    render(shown);
    frame = shown === target ? 0 : requestAnimationFrame(tick);
  };
  const update = () => {
    const { p } = runway();
    target = toDrum(p);
    // set on the title only, so nothing else restyles
    titleBox.style.setProperty('--rl-q', clamp(p / T_IN, 0, 1).toFixed(3));
    block.classList.toggle('is-intro', p <= BAR_FROM);
    if (!frame) frame = requestAnimationFrame(tick);
  };

  // once the scroll stops, glide onto the nearest card
  let settling = 0;
  let idle = 0;
  const stopSettle = () => {
    cancelAnimationFrame(settling);
    settling = 0;
  };
  const glideTo = (y) => {
    stopSettle();
    const from = window.scrollY;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / SETTLE_MS);
      window.scrollTo(0, from + (y - from) * (1 - (1 - t) ** 4));
      settling = t < 1 ? requestAnimationFrame(step) : 0;
    };
    settling = requestAnimationFrame(step);
  };
  const cardY = (k, rect, total) => window.scrollY + rect.top + toProgress(k) * total;
  const settle = () => {
    if (settling) return;
    const { rect, total, p } = runway();
    // only while the runway fills the screen
    if (rect.top > 1 || rect.bottom < window.innerHeight - 1) return;
    if (p <= SNAP_MIN || p >= SNAP_MAX) return;
    const y = cardY(clamp(Math.round(toDrum(p)), 0, count - 1), rect, total);
    if (Math.abs(y - window.scrollY) >= 3) glideTo(y);
  };
  window.addEventListener('scroll', () => {
    update();
    window.clearTimeout(idle);
    if (!settling) idle = window.setTimeout(settle, IDLE_MS);
  }, { passive: true });
  // any new input takes over from a glide
  ['wheel', 'touchstart', 'keydown'].forEach((type) => {
    window.addEventListener(type, stopSettle, { capture: true, passive: true });
  });
  window.addEventListener('resize', () => {
    readIntroAt();
    update();
  });
  marks.forEach((mark, i) => mark.addEventListener('click', () => {
    const { rect, total } = runway();
    glideTo(cardY(i, rect, total));
  }));

  block.classList.add('is-stepped');
  section.classList.add('scroll-runway');
  // During a move to or from the section above (with or without a Wave In cut), the title
  // travels with the section instead of being held mid-screen. Added before the cut's listener,
  // so it is set before the cut reads the section.
  const above = section.previousElementSibling;
  document.addEventListener('snap:start', ({ detail: { from, to } }) => {
    const crossing = (from === above && to === section) || (from === section && to === above);
    section.classList.toggle('is-crossing', crossing);
  });
  document.addEventListener('snap:end', () => section.classList.remove('is-crossing'));
  section.style.setProperty('--rl-count', count);
  // the snap engine treats the block as one screen, not an inner scroller
  block.dataset.snapPassthrough = '';
  block.append(rail, ...washes);
  readIntroAt();
  shown = introAt;
  update();
  render(shown);
}
