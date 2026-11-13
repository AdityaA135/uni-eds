// Social Deck "Strip" style (homepage socials): the cards in a flat,
// horizontally scrolling row with prev/next buttons, instead of the arc

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
// power2.out: fast start, gentle finish
const easeOut = (t) => 1 - (1 - t) ** 2;

/**
 * Builds a prev/next button.
 * @param {string} dir 'prev' | 'next'
 * @param {string} label accessible label
 * @returns {HTMLButtonElement}
 */
function navButton(dir, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `social-deck-strip-btn social-deck-strip-${dir}`;
  btn.setAttribute('aria-label', label);
  const icon = document.createElement('span');
  icon.className = 'social-deck-strip-icon';
  icon.setAttribute('aria-hidden', 'true');
  btn.append(icon);
  return btn;
}

/**
 * Decorates the Strip style. The authored (instrumented) cards go into the
 * visible row themselves, so Universal Editor selects them directly.
 * @param {Element} block the social-deck block
 * @param {object} parts what social-deck.js built
 * @param {HTMLElement} parts.stage the stage
 * @param {HTMLUListElement} parts.ring the (empty) visible card list
 * @param {HTMLUListElement} parts.source the hidden list of authored cards
 * @param {HTMLLIElement[]} parts.authored the authored cards
 * @param {number} parts.max cards shown at most
 */
export default function decorateStrip(block, {
  stage, ring, source, authored, max,
}) {
  ring.classList.add('social-deck-strip-track');
  ring.setAttribute('role', 'list');
  authored.slice(0, max).forEach((li) => {
    li.classList.add('social-deck-strip-card');
    li.removeAttribute('aria-hidden');
    ring.append(li);
  });
  source.remove();
  // the row scrolls natively: no arc drag, so the page keeps vertical swipes
  delete stage.dataset.snapHorizontal;

  const cards = [...ring.children];
  const prev = navButton('prev', 'Previous posts');
  const next = navButton('next', 'Next posts');
  const nav = document.createElement('div');
  nav.className = 'social-deck-strip-nav';
  nav.append(prev, next);
  block.append(nav);

  // one card's width plus the gap
  const stepWidth = () => {
    if (cards.length < 2) return ring.clientWidth;
    return cards[1].offsetLeft - cards[0].offsetLeft;
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const goTo = (left) => ring.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
  // moves a whole card at a time and lands on a card edge
  const step = (dir) => {
    const pitch = stepWidth();
    const index = clamp(Math.round(ring.scrollLeft / pitch) + dir, 0, cards.length - 1);
    goTo(index * pitch);
  };
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));

  // keyboard: the row is focusable, left/right move it a card at a time
  ring.tabIndex = 0;
  ring.setAttribute('aria-label', 'Social posts, swipe or use the arrow keys');
  ring.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    step(e.key === 'ArrowRight' ? 1 : -1);
  });

  // mouse drag with a little throw, then it settles on the nearest card
  let drag = null;
  ring.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button) return;
    drag = {
      x: e.clientX, left: ring.scrollLeft, t: performance.now(), v: 0, moved: false,
    };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 4) {
      drag.moved = true;
      ring.classList.add('is-drag');
    }
    if (!drag.moved) return;
    const now = performance.now();
    const left = drag.left - dx;
    drag.v = (left - ring.scrollLeft) / Math.max(1, now - drag.t);
    drag.t = now;
    ring.scrollLeft = left;
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    const { moved, v } = drag;
    drag = null;
    if (!moved) return;
    ring.classList.remove('is-drag');
    const pitch = stepWidth();
    goTo(clamp(Math.round((ring.scrollLeft + v * 220) / pitch), 0, cards.length - 1) * pitch);
  });

  // per frame: arrow states, a soft fade on cards leaving either edge, and
  // each photo drifting slightly against the row
  const imgs = cards.map((li) => li.querySelector('img'));
  const update = () => {
    const end = ring.scrollWidth - ring.clientWidth - 4;
    prev.disabled = ring.scrollLeft < 4;
    next.disabled = ring.scrollLeft > end;
    nav.hidden = ring.scrollWidth <= ring.clientWidth;

    const vw = window.innerWidth;
    const side = parseFloat(getComputedStyle(ring).paddingLeft) || 0;
    cards.forEach((li, i) => {
      const r = li.getBoundingClientRect();
      const w = r.width || 1;
      const fadeIn = easeOut(clamp((vw - r.left) / (w * 0.85), 0, 1));
      const fadeOut = easeOut(clamp((r.left + w - side * 0.5) / (w * 0.8), 0, 1));
      li.style.opacity = (0.12 + 0.88 * Math.min(fadeIn, fadeOut)).toFixed(3);
      if (!reduce && imgs[i]) {
        const drift = clamp((r.left + w / 2 - vw / 2) / vw, -1, 1) * -3;
        imgs[i].style.translate = `${drift.toFixed(2)}% 0`;
      }
    });
  };
  let raf = 0;
  const queue = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      update();
    });
  };
  ring.addEventListener('scroll', queue, { passive: true });
  new ResizeObserver(queue).observe(ring);
  update();
}
