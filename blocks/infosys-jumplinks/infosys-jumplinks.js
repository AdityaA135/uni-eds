import { moveInstrumentation } from '../../scripts/scripts.js';

const HEADER_OFFSET = 100;

/**
 * Turns the authored href into an in-page hash when it points at an anchor:
 * bookmark://x, https://#x and links to this page with a hash all become #x.
 * @param {string} href The authored href
 * @returns {string} The href to use
 */
function normalizeHref(href) {
  if (!href) return href;
  const bookmark = href.match(/^bookmark:\/\/(.+)$/i);
  if (bookmark) return `#${bookmark[1]}`;
  const bareHash = href.match(/^https?:\/\/#(.+)$/i);
  if (bareHash) return `#${bareHash[1]}`;
  try {
    const url = new URL(href, window.location.href);
    if (url.hash && url.origin === window.location.origin
      && url.pathname.replace(/\.html$/, '') === window.location.pathname.replace(/\.html$/, '')) {
      return url.hash;
    }
  } catch (e) {
    // not a URL: keep as authored
  }
  return href;
}

/**
 * Finds the element an in-page hash points at. A section whose "anchor" section
 * metadata is the id (data-anchor) gets that id.
 * @param {string} id The id without #
 * @returns {Element|null}
 */
function findTarget(id) {
  if (!id) return null;
  let target = document.getElementById(id);
  if (!target) {
    target = [...document.querySelectorAll('main .section[data-anchor]')]
      .find((section) => section.dataset.anchor.trim() === id);
    if (target) target.id = id;
  }
  return target;
}

/**
 * Infosys jump links: a list of links to anchors on the page.
 * Each row holds one link.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const links = row.querySelectorAll('a');
    if (!links.length) return;
    links.forEach((a) => {
      const li = document.createElement('li');
      if (links.length === 1) moveInstrumentation(row, li);
      a.className = '';
      a.closest('.button-container')?.classList.remove('button-container');
      a.setAttribute('href', normalizeHref(a.getAttribute('href')));
      li.append(a);
      ul.append(li);
    });
  });
  block.replaceChildren(ul);

  const items = [...ul.querySelectorAll('a')]
    .filter((a) => a.getAttribute('href')?.startsWith('#'))
    .map((a) => ({ a, id: decodeURIComponent(a.getAttribute('href').slice(1)) }));

  const setActive = (link) => {
    ul.querySelectorAll('a.active').forEach((a) => {
      a.classList.remove('active');
      a.removeAttribute('aria-current');
    });
    if (link) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'location');
    }
  };

  items.forEach(({ a, id }) => {
    a.addEventListener('click', (e) => {
      const target = findTarget(id);
      if (!target) return;
      e.preventDefault();
      setActive(a);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${id}`);
    });
  });

  // mark the link of the section in view
  let ticking = false;
  const update = () => {
    ticking = false;
    let current = null;
    items.forEach((item) => {
      const target = findTarget(item.id);
      if (target && target.getBoundingClientRect().top <= HEADER_OFFSET + 20) current = item.a;
    });
    if (current) setActive(current);
    else setActive(null);
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
}
