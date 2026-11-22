/*
 * Tabs
 *
 * Authored rows (Universal Editor model in _tabs.json):
 *   Open Tab             single-cell setting row (1 = first tab)
 *   Keyboard Activation  single-cell setting row (auto | manual)
 *   Light Mode           single-cell setting row (true | false)
 *   one row per tab:     Title | Content (rich text) | Fragment (optional path)
 *
 * Variants are block classes picked in the Style field (vertical, pills,
 * brackets, accordion-mobile, specs, locations). This file builds the same
 * markup for all of them; tabs.css does each variant's layout. Light Mode adds
 * `.light`. Locations adds image tiles (tabs-locations.js/.css, lazy-loaded).
 * Vertical inside a Light section adds a big image and a thumbnail strip
 * (tabs-vertical-light.js/.css, lazy-loaded).
 */

import { loadCSS } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { cellVal, consumeSettingsRows, inEditor } from '../../scripts/utils/common.js';

/**
 * Turns a tab title into a unique id, also used for links (#tabpanel-{id}).
 * @param {string} text
 * @param {number} index fallback when the title has no usable characters
 * @param {Set<string>} taken ids claimed in this block, not yet in the page
 * @returns {string}
 */
function uniqueId(text, index, taken) {
  const base = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `tab-${index + 1}`;
  let id = base;
  for (let n = 2; taken.has(id) || document.getElementById(`tabpanel-${id}`); n += 1) id = `${base}-${n}`;
  taken.add(id);
  return id;
}

/**
 * Fills a panel's fragment slot the first time the panel is shown.
 * @param {HTMLElement} panel
 */
async function loadPanelFragment(panel) {
  const slot = panel.querySelector(':scope > .tabs-panel-fragment');
  if (!slot || slot.dataset.status) return;
  slot.dataset.status = 'loading';
  const { loadFragment } = await import('../fragment/fragment.js');
  const fragment = await loadFragment(slot.dataset.fragment);
  if (fragment) slot.replaceChildren(...fragment.childNodes);
  slot.dataset.status = fragment ? 'loaded' : 'error';
}

/**
 * Combat theme, Specs tabs (the Specifications side panel): the motion of the design
 * prototype. A sliding underline follows the selected tab; on a change the open rows
 * slide out towards the side the visitor is moving away from (0.16s), then the new
 * tab's rows slide in from the other side, one after another (0.4s, 25ms apart).
 * Runs only with motion allowed; otherwise tabs switch instantly as everywhere else.
 * @param {HTMLElement} block
 * @param {HTMLElement} list the tab bar
 * @param {HTMLButtonElement[]} buttons
 * @param {HTMLElement[]} panels
 */
function wireCombatSpecsMotion(block, list, buttons, panels) {
  const ink = document.createElement('span');
  ink.className = 'tabs-ink';
  ink.setAttribute('aria-hidden', 'true');
  list.append(ink);
  block.classList.add('has-ink');

  const placeInk = (index, animate) => {
    const tab = buttons[index];
    if (!tab) return;
    ink.classList.toggle('is-instant', !animate);
    ink.style.setProperty('--ink-x', `${tab.offsetLeft}px`);
    ink.style.setProperty('--ink-w', `${tab.offsetWidth}px`);
    // keep the selected tab in view, with a little room beside it
    const room = 24;
    if (tab.offsetLeft < list.scrollLeft) {
      list.scrollTo({ left: tab.offsetLeft - room, behavior: animate ? 'smooth' : 'auto' });
    } else if (tab.offsetLeft + tab.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollTo({
        left: tab.offsetLeft + tab.offsetWidth - list.clientWidth + room,
        behavior: animate ? 'smooth' : 'auto',
      });
    }
  };
  const selectedIndex = () => buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true');
  // the panel opens inside a dialog: measure once it has a size, and on resize
  new ResizeObserver(() => placeInk(selectedIndex(), false)).observe(list);

  const motionOk = () => window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const rowsOf = (panel) => [...panel.querySelectorAll(':scope > .tabs-panel-content > ul > li')];
  // row index for the opening stagger (tabs.css)
  panels.forEach((panel) => rowsOf(panel).forEach((row, i) => row.style.setProperty('--row', i)));
  let running = [];
  const stop = () => {
    running.forEach((a) => a.cancel());
    running = [];
  };

  block.addEventListener('tabs:change', ({ detail: { index, previous } }) => {
    block.classList.add('is-switched'); // ends the panel's opening stagger (tabs.css)
    placeInk(index, true);
    if (!motionOk()) return;
    stop();
    const dir = index > previous ? 1 : -1;
    const from = panels[previous];
    const to = panels[index];
    // select() already swapped the panels: show the old one again while it leaves
    to.hidden = true;
    from.hidden = false;
    const out = from.animate(
      [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-14 * dir}px)` }],
      { duration: 160, easing: 'cubic-bezier(0.32, 0, 0.67, 0)', fill: 'forwards' },
    );
    running.push(out);
    out.finished.then(() => {
      out.cancel();
      from.hidden = true;
      to.hidden = false;
      to.scrollTop = 0;
      rowsOf(to).forEach((row, i) => {
        running.push(row.animate(
          [{ opacity: 0, transform: `translateX(${14 * dir}px)` }, { opacity: 1, transform: 'none' }],
          {
            duration: 400, delay: i * 25, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'backwards',
          },
        ));
      });
    }).catch(() => {
      // interrupted by a newer change: that one takes over
    });
  });
}

/* ---------- Combat theme and motion: Comfort (Vertical tabs) ----------
 * The Comfort showcase of the design prototype (#comfortShow), on Combat pages only (body.combat):
 *   - a strip of thumbnails, one per feature, copied from each tab's image (no extra content):
 *     a column between the list and the image from 900px, a row under the list below. They are
 *     for the pointer only (aria-hidden, not focusable): the tab buttons stay the controls
 *   - a feature is selected by hovering its name or thumbnail (mouse and trackpad), as well as
 *     by a click or the keyboard as on every tabs block
 *   - its description shows under its name: from 900px it opens (0.5s power3.inOut) as the one
 *     before closes, and one bar on the rail follows the open feature. The description shown
 *     there is a copy for the eye (aria-hidden); the panel keeps the real one for screen readers
 *   - the new image fades in over the old one (0.6s) while it settles from 106% (1.2s power3.out)
 * Layout in tabs.css (Combat theme: Comfort). The arrival of the section (tabs.css) needs
 * body.combat-motion. Without motion allowed (checked at each change) everything switches at
 * once.
 */
const COMFORT_OPEN_MS = 500;
// GSAP's power3.inOut, which the prototype eases the descriptions with
const power3InOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - ((-2 * t + 2) ** 3) / 2);

/**
 * @param {HTMLElement} block
 * @param {HTMLElement} list the tab bar
 * @param {HTMLButtonElement[]} buttons
 * @param {HTMLElement[]} panels
 * @param {function(number): void} select
 */
function wireCombatComfortMotion(block, list, buttons, panels, select) {
  const motionOk = () => window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  block.classList.add('combat-comfort');

  // each feature's description under its name, and the bar
  const mores = buttons.map((button, i) => {
    const more = document.createElement('div');
    more.className = 'tabs-tab-more';
    more.setAttribute('aria-hidden', 'true');
    more.style.setProperty('--tab-index', i);
    const inner = document.createElement('div');
    const content = panels[i].querySelector(':scope > .tabs-panel-content');
    if (content) inner.append(...[...content.childNodes].map((n) => n.cloneNode(true)));
    inner.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    more.append(inner);
    button.after(more);
    return more;
  });
  const bar = document.createElement('span');
  bar.className = 'tabs-bar';
  bar.setAttribute('aria-hidden', 'true');
  list.append(bar);

  // the thumbnails: a copy of each tab's picture, decorative (the tab button has its name)
  const strip = document.createElement('div');
  strip.className = 'tabs-thumbs';
  strip.setAttribute('aria-hidden', 'true');
  const thumbs = panels.map((panel, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'tabs-thumb';
    thumb.style.setProperty('--tab-index', i);
    const picture = panel.querySelector(':scope > .tabs-panel-image picture, :scope > .tabs-panel-image img');
    if (picture) {
      const copy = picture.cloneNode(true);
      const img = copy.tagName === 'IMG' ? copy : copy.querySelector('img');
      img?.setAttribute('alt', '');
      img?.setAttribute('loading', 'lazy');
      img?.removeAttribute('fetchpriority');
      thumb.append(copy);
    }
    thumb.addEventListener('click', () => select(i));
    strip.append(thumb);
    return thumb;
  });
  block.style.setProperty('--tabs-count', panels.length);
  list.after(strip);

  let active = buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true');
  const markThumb = () => thumbs.forEach((t, i) => t.classList.toggle('is-active', i === active));
  markThumb();
  // how open each description is, 0 to 1
  const open = buttons.map((_, i) => (i === active ? 1 : 0));
  const place = () => {
    mores.forEach((more, i) => {
      more.style.height = `${(more.firstElementChild.offsetHeight * open[i]).toFixed(2)}px`;
    });
    const tab = buttons[active];
    if (!tab) return;
    bar.style.translate = `0 ${tab.offsetTop}px`;
    bar.style.height = `${tab.offsetHeight + mores[active].offsetHeight}px`;
  };
  place();
  new ResizeObserver(() => place()).observe(list);
  document.fonts?.ready.then(place);

  let frame = 0;
  const openTo = (index) => {
    cancelAnimationFrame(frame);
    if (!motionOk()) {
      open.forEach((_, i) => { open[i] = i === index ? 1 : 0; });
      place();
      return;
    }
    const from = open.slice();
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / COMFORT_OPEN_MS);
      const e = power3InOut(k);
      from.forEach((v, i) => { open[i] = v * (1 - e) + (i === index ? e : 0); });
      place();
      frame = k < 1 ? requestAnimationFrame(step) : 0;
    };
    frame = requestAnimationFrame(step);
  };

  // the image: the old one stays under the new one while it fades in
  let underlayTimer = 0;
  const crossfade = (from, to) => {
    const cell = to.querySelector(':scope > .tabs-panel-image');
    const img = cell?.querySelector('img');
    const prev = from.querySelector(':scope > .tabs-panel-image img');
    clearTimeout(underlayTimer);
    block.querySelectorAll('.tabs-panel-image-prev').forEach((n) => n.remove());
    if (!img) return;
    if (prev) {
      const under = document.createElement('div');
      under.className = 'tabs-panel-image-prev';
      under.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('img');
      copy.src = prev.currentSrc || prev.src;
      copy.alt = '';
      under.append(copy);
      cell.prepend(under);
      underlayTimer = setTimeout(() => under.remove(), 700);
    }
    img.getAnimations().forEach((a) => a.cancel());
    img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: 'ease' });
    img.animate([{ transform: 'scale(1.06)' }, { transform: 'none' }], {
      duration: 1200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    });
  };

  block.addEventListener('tabs:change', ({ detail: { index, previous } }) => {
    active = index;
    markThumb();
    openTo(index);
    if (motionOk() && panels[previous]) crossfade(panels[previous], panels[index]);
  });

  // hover selects, where there is a pointer that hovers. Only a pointer that moves: as the
  // descriptions open and close the names move, and one sliding under a still pointer is not
  // picked (or the list would run on by itself)
  const hovers = window.matchMedia('(hover: hover) and (pointer: fine)');
  const hoverSelect = (container, items, selector) => {
    let last = null;
    container.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !hovers.matches) return;
      const moved = !last || Math.abs(e.clientX - last.x) + Math.abs(e.clientY - last.y) > 1;
      last = { x: e.clientX, y: e.clientY };
      const i = items.indexOf(e.target.closest(selector));
      if (moved && i >= 0 && i !== active) select(i);
    });
    container.addEventListener('pointerleave', () => { last = null; });
  };
  hoverSelect(list, buttons, '.tabs-tab');
  hoverSelect(strip, thumbs, '.tabs-thumb');
}

/**
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  const editing = inEditor();

  // 1. settings
  const [openCell, activationCell, lightCell] = consumeSettingsRows(block, 3);
  const openIndex = (parseInt(openCell?.textContent, 10) || 1) - 1;
  const manual = activationCell?.textContent.trim().toLowerCase() === 'manual';
  // Light Mode toggle: tabs.css styles .tabs.light as a white card
  if (lightCell?.textContent.trim().toLowerCase() === 'true') block.classList.add('light');

  const rows = [...block.children];
  if (!rows.length) {
    if (editing) block.dataset.placeholder = 'Add a tab to get started';
    return;
  }

  // 2. tab bar + panels. Each row becomes a panel and keeps its editor
  // instrumentation, so every tab stays selectable in Universal Editor.
  const list = document.createElement('div');
  list.className = 'tabs-list';
  list.setAttribute('role', 'tablist');
  if (block.classList.contains('vertical')) list.setAttribute('aria-orientation', 'vertical');

  const taken = new Set();
  const ids = [];
  const panels = rows;
  const buttons = rows.map((row, i) => {
    const [titleCell, contentCell, fragmentCell, imageCell] = [...row.children];
    const title = titleCell?.textContent.trim() || '';
    const id = uniqueId(title, i, taken);
    ids.push(id);
    titleCell?.remove();
    contentCell?.classList.add('tabs-panel-content');

    const fragmentPath = fragmentCell ? cellVal(fragmentCell) : '';
    if (fragmentPath) {
      fragmentCell.className = 'tabs-panel-fragment';
      fragmentCell.dataset.fragment = fragmentPath;
      fragmentCell.replaceChildren();
    } else {
      fragmentCell?.remove();
    }

    // optional image (4th cell): keep it only when it holds a picture. An image from outside
    // AEM Assets (e.g. https://…/photo.webp) is delivered as a link to it: it becomes the image
    const imageLink = !imageCell?.querySelector('picture, img')
      && [...(imageCell?.querySelectorAll('a[href]') || [])]
        .find((a) => /\.(png|jpe?g|webp|avif|gif|svg)(?:[?#]|$)/i.test(a.getAttribute('href')));
    if (imageLink) {
      const img = document.createElement('img');
      img.src = imageLink.href;
      const text = imageLink.title || imageLink.textContent.trim();
      img.alt = text && text !== imageLink.getAttribute('href') && text !== imageLink.href ? text : '';
      img.loading = 'lazy';
      moveInstrumentation(imageLink, img);
      (imageLink.closest('p') || imageLink).replaceWith(img);
    }
    if (imageCell?.querySelector('picture, img')) imageCell.classList.add('tabs-panel-image');
    else if (imageCell && !editing) imageCell.remove();

    row.className = 'tabs-panel';
    row.id = `tabpanel-${id}`;
    row.setAttribute('role', 'tabpanel');
    row.setAttribute('aria-labelledby', `tab-${id}`);
    row.tabIndex = 0;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.textContent = title || `Tab ${i + 1}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', row.id);

    // position for layouts that interleave tabs and panels (accordion-mobile)
    button.style.setProperty('--tab-index', i);
    row.style.setProperty('--tab-index', i);

    list.append(button);
    return button;
  });

  // one tab: no bar for visitors; the editor keeps it so the tab stays visible
  if (buttons.length === 1 && !editing) list.classList.add('tabs-list-single');
  block.prepend(list);

  // 3. selection
  let active = -1;
  const select = (index, focus = false) => {
    if (index === active) {
      if (focus) buttons[index].focus();
      return;
    }
    const previous = active;
    active = index;
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
    });
    panels.forEach((panel, i) => { panel.hidden = i !== index; });
    if (focus) buttons[index].focus();
    loadPanelFragment(panels[index]);
    if (previous >= 0) {
      block.dispatchEvent(new CustomEvent('tabs:change', {
        bubbles: true,
        detail: { index, previous },
      }));
    }
  };
  select(Math.min(Math.max(openIndex, 0), buttons.length - 1));
  // Specs: a row with a value per model gets its label on each value (tabs.css shows it over
  // the value on the spec sheet); the first row is the model names
  if (block.classList.contains('specs')) {
    panels.forEach((panel) => {
      panel.querySelectorAll('.tabs-panel-content > ul > li:not(:first-child)').forEach((row) => {
        const label = row.querySelector(':scope > p')?.textContent.trim();
        const values = [...row.querySelectorAll(':scope > :is(ul, ol) > li')];
        if (!label || values.length < 2) return;
        row.classList.add('has-labels');
        values.forEach((value) => { value.dataset.label = label; });
      });
    });
  }

  // the spec sheet's sliding underline: Combat pages, and a Light Side Panel page (the pop-up)
  const lightSheet = !!block.closest('.section.side-panel.light');
  if (!editing && block.classList.contains('specs')
    && (document.body.classList.contains('combat') || lightSheet)) {
    wireCombatSpecsMotion(block, list, buttons, panels);
  }
  if (!editing && block.classList.contains('vertical') && document.body.classList.contains('combat')) {
    wireCombatComfortMotion(block, list, buttons, panels, select);
  }

  buttons.forEach((button, i) => {
    button.addEventListener('click', () => select(i));
    button.addEventListener('keydown', (e) => {
      const last = buttons.length - 1;
      const target = {
        ArrowRight: i === last ? 0 : i + 1,
        ArrowDown: i === last ? 0 : i + 1,
        ArrowLeft: i === 0 ? last : i - 1,
        ArrowUp: i === 0 ? last : i - 1,
        Home: 0,
        End: last,
      }[e.key];
      if (target === undefined) return;
      e.preventDefault();
      e.stopPropagation(); // not a page step for the section snap
      if (manual) buttons[target].focus(); // manual: Enter/Space selects
      else select(target, true);
    });
  });

  // 4. links to a tab: #tabpanel-{id}, #tab-{id} or #{id}
  const openFromHash = () => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    // a bare #name that already names something else on the page (e.g. a section
    // anchor #safety) belongs to that element, not to a tab of the same name
    const owner = hash && document.getElementById(hash);
    const bareOk = !owner || block.contains(owner);
    const index = ids.findIndex((id) => (bareOk && id === hash)
      || [`tab-${id}`, `tabpanel-${id}`].includes(hash));
    if (index < 0) return;
    select(index);
    // the section snap scrolls to a real id; give it the panel's
    if (hash !== panels[index].id) window.history.replaceState(null, '', `#${panels[index].id}`);
  };
  if (!editing) {
    openFromHash();
    const onHashChange = () => {
      if (!block.isConnected) window.removeEventListener('hashchange', onHashChange);
      else openFromHash();
    };
    window.addEventListener('hashchange', onHashChange);
  }

  // 5. Universal Editor: show the tab whose content the author selects
  if (editing) {
    const onEditorSelect = ({ detail }) => {
      if (!block.isConnected) {
        document.removeEventListener('aue:ui-select', onEditorSelect, true);
        return;
      }
      if (!detail?.selected || !detail.resource) return;
      const el = document.querySelector(`[data-aue-resource="${CSS.escape(detail.resource)}"]`);
      const index = panels.findIndex((panel) => panel.contains(el));
      if (index >= 0) select(index);
    };
    document.addEventListener('aue:ui-select', onEditorSelect, true);
  }

  // 6. Locations style: its CSS/JS are fetched only when the style is used
  if (block.classList.contains('locations')) {
    const [, { default: decorateLocations }] = await Promise.all([
      loadCSS(`${window.hlx.codeBasePath}/blocks/tabs/tabs-locations.css`),
      import('./tabs-locations.js'),
    ]);
    decorateLocations(block);
  }

  // 7. Vertical in a Light section: big image + thumbnail strip, also lazy-loaded (the Combat
  // theme builds its own strip, step 6)
  if (block.classList.contains('vertical') && block.closest('.section.light')
    && !document.body.classList.contains('combat')) {
    const [, { default: decorateVerticalLight }] = await Promise.all([
      loadCSS(`${window.hlx.codeBasePath}/blocks/tabs/tabs-vertical-light.css`),
      import('./tabs-vertical-light.js'),
    ]);
    decorateVerticalLight(block);
  }
}
