// Tabs "Vertical" in a Light section: the open tab's image shown large, with
// a strip of every tab's image beside it (below it on phones). Scrolling in the
// section steps through the tabs one by one before the page moves on.

import { attachToSnap, createGestureStepper } from '../../scripts/utils/gesture-stepper.js';

// a tab change (image fade, tabs-vertical-light.css): a gesture can't step again before it ends
const STEP_MS = 650;

/**
 * Marks each panel's image and builds the thumbnail strip from them.
 * The strip is a pointer shortcut only: the tab buttons stay the
 * keyboard and screen-reader controls, so it is hidden from assistive tech.
 * @param {HTMLElement} block the tabs block
 */
export default function decorateVerticalLight(block) {
  const list = block.querySelector(':scope > .tabs-list');
  if (!list) return;
  const buttons = [...list.querySelectorAll(':scope > .tabs-tab')];
  const panels = [...block.querySelectorAll(':scope > .tabs-panel')];
  block.style.setProperty('--tabs-count', buttons.length);
  // the section sizes the layout for its heading too (tabs-vertical-light.css): it needs the count
  const section = block.closest('main > .section');
  if (section?.querySelector(':scope > .tabs-wrapper > .tabs.vertical') === block) {
    section.style.setProperty('--tabs-count', buttons.length);
  }
  // the big images are clipped, positioned layers that never scroll: without this the page's
  // section snap takes them for an overlay and leaves the wheel to them, so it can't move on
  block.dataset.snapPassthrough = '';

  const strip = document.createElement('div');
  strip.className = 'tabs-thumbs';
  strip.setAttribute('aria-hidden', 'true');

  buttons.forEach((button, i) => {
    const content = panels[i]?.querySelector(':scope > .tabs-panel-content');
    // the tab's Image field (tabs.js .tabs-panel-image) goes first in its content, where the
    // layout puts the big image; an image in the content itself works too
    const field = panels[i]?.querySelector(':scope > .tabs-panel-image');
    const fieldPic = field?.querySelector('picture') || field?.querySelector('img');
    if (content && fieldPic && !block.closest('[data-aue-resource]')) {
      const line = document.createElement('p');
      line.append(fieldPic);
      content.prepend(line);
      field.remove();
    }
    const img = content?.querySelector('img');
    // the image's own paragraph (or the bare picture) is the big image
    const media = img?.closest('.tabs-panel-content > *');
    media?.classList.add('tabs-media');

    const thumb = document.createElement('div');
    thumb.className = 'tabs-thumb';
    thumb.dataset.index = i;
    if (img) {
      const small = document.createElement('img');
      small.src = img.currentSrc || img.src;
      small.alt = '';
      small.loading = 'lazy';
      small.decoding = 'async';
      thumb.append(small);
    }
    strip.append(thumb);
  });

  const mark = (index) => {
    [...strip.children].forEach((thumb, i) => thumb.classList.toggle('is-active', i === index));
  };
  mark(buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true'));

  strip.addEventListener('click', (e) => {
    const thumb = e.target.closest('.tabs-thumb');
    if (thumb) buttons[Number(thumb.dataset.index)]?.click();
  });
  // tabs nested in a panel bubble their own changes; only this block's count
  block.addEventListener('tabs:change', ({ target, detail: { index } }) => {
    if (target === block) mark(index);
  });

  block.append(strip);

  // a scroll gesture opens the next tab (or the previous one, scrolling up); past the last (or
  // the first) the page moves on. Not while authoring, nor without the section snap
  if (!section || block.closest('[data-aue-resource]') || buttons.length < 2) return;
  const active = () => Math.max(0, buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true'));
  let busyUntil = 0;
  const stepper = createGestureStepper({
    count: buttons.length,
    current: active,
    play: (to) => {
      busyUntil = performance.now() + STEP_MS;
      buttons[to]?.click();
    },
    busy: () => performance.now() < busyUntil,
  });
  attachToSnap(section, stepper, () => {});
}
