/*
 * Cards "Carousel" style inside a Light section (Code T highlights), loaded by
 * cards.js only there, so /home-v2's Carousel doesn't pay for it. The same
 * engine as the Carousel style (cards.js), reshaped by cards-carousel-light.css
 * into a flat strip of wide feature cards (image, label, title, text, link),
 * with the side cards peeking in. The visitor moves it: no autoplay. Adds:
 *   - a counter ("01 / 06") before the prev/next buttons
 *   - the brochure links (default content after the block: a paragraph of
 *     links, then a paragraph of plain text) as a "Download the brochure"
 *     button opening the links above it
 */

import decorateBrochure from '../../scripts/utils/brochure.js';

const pad = (n) => String(n).padStart(2, '0');

/**
 * The section's brochure links: in the default content right after the block,
 * a paragraph of links followed by a paragraph without any (its label) become
 * a disclosure button showing the links. Anything else is left as authored.
 * @param {Element} block
 */
function decorateSectionBrochure(block) {
  const content = block.closest('.cards-wrapper')?.nextElementSibling;
  if (!content?.matches('.default-content-wrapper')) return;
  decorateBrochure(content, 'carousel-brochure-links');
}

/**
 * The card titles share one size: the stylesheet's, made smaller (1px at a time, down to
 * 18px) until none of them takes more than two lines, as the source sizes its titles to fit.
 * @param {Element} block
 */
function fitTitles(block) {
  const titles = [...block.querySelectorAll('.card-body :is(h2, h3, h4)')];
  if (!titles.length) return;
  const lines = (title) => {
    const lh = parseFloat(getComputedStyle(title).lineHeight);
    return lh ? Math.round(title.getBoundingClientRect().height / lh) : 1;
  };
  const setSize = (px) => titles.forEach((title) => {
    if (px) title.style.fontSize = `${px}px`;
    else title.style.removeProperty('font-size');
  });
  const tooLong = () => titles.some((title) => lines(title) > 2);
  setSize(0);
  const start = parseFloat(getComputedStyle(titles[0]).fontSize);
  for (let size = start - 1; size >= 18 && tooLong(); size -= 1) setSize(size);
}

/**
 * @param {Element} block
 * @param {HTMLUListElement} ul the decorated card list
 * @param {function} decorateCarousel the Carousel engine (cards.js)
 * @param {number} max cards the carousel takes at most
 */
export default function decorateCarouselLight(block, ul, decorateCarousel, max) {
  block.classList.add('carousel-light');
  const total = Math.min(ul.children.length, max);

  const count = document.createElement('p');
  count.className = 'carousel-count';
  count.setAttribute('aria-live', 'polite');
  const current = document.createElement('b');
  const of = document.createElement('span');
  of.textContent = `/ ${pad(total)}`;
  count.append(current, of);

  const controls = decorateCarousel(block, ul, {
    autoplay: false,
    start: 0,
    onChange: (index) => { current.textContent = pad(index + 1); },
  });
  // the editor's still row (or a single card) has no nav to count in
  if (!controls) return;
  block.querySelector('.carousel-nav')?.prepend(count);
  decorateSectionBrochure(block);

  // when the section shows (it is hidden while it loads), on resize and once the fonts are in
  let frame = 0;
  const refit = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => fitTitles(block));
  };
  new ResizeObserver(refit).observe(block);
  document.fonts?.ready.then(refit);
}
