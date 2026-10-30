import { moveInstrumentation } from '../../scripts/scripts.js';

let panelCount = 0;

/**
 * Removes the button decoration decorateButtons adds to lone links.
 * @param {Element} root The element holding the links
 */
function unbutton(root) {
  root.querySelectorAll('a.button').forEach((a) => a.classList.remove('button', 'primary', 'secondary'));
  root.querySelectorAll('.button-container').forEach((p) => p.classList.remove('button-container'));
}

/**
 * Reads the authored rows: [logo picture], [logo link], [menu list], [site links list].
 * @param {Element} block The block element
 */
function readRows(block) {
  const rows = [...block.children];
  const logoRow = rows.find((row) => row.querySelector('picture'));
  const listRows = rows.filter((row) => row !== logoRow && row.querySelector('ul, ol'));
  const linkRow = rows.find((row) => row !== logoRow && !listRows.includes(row) && row.querySelector('a'));
  // links authored as paragraphs instead of a list still count as a list
  const paragraphLinkRows = rows.filter((row) => row !== logoRow && row !== linkRow
    && !listRows.includes(row) && row.querySelectorAll('a').length > 0);
  const [menuRow, siteRow] = [...listRows, ...paragraphLinkRows];
  return {
    logoRow, linkRow, menuRow, siteRow,
  };
}

function toList(row, className) {
  const ul = document.createElement('ul');
  ul.className = className;
  if (!row) return ul;
  unbutton(row);
  const cell = row.querySelector(':scope > div') || row;
  moveInstrumentation(cell, ul);
  row.querySelectorAll('a').forEach((a) => {
    const li = document.createElement('li');
    li.append(a);
    ul.append(li);
  });
  return ul;
}

/**
 * Infosys header: a fixed bar with the logo and a menu button that opens
 * a panel sliding in from the right.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const {
    logoRow, linkRow, menuRow, siteRow,
  } = readRows(block);

  panelCount += 1;
  const panelId = `infosys-header-panel-${panelCount}`;

  // logo
  const picture = logoRow?.querySelector('picture');
  if (linkRow) unbutton(linkRow);
  const logoHref = linkRow?.querySelector('a')?.getAttribute('href') || '/';
  const logo = document.createElement('a');
  logo.className = 'infosys-header-logo';
  logo.href = logoHref;
  if (picture) {
    logo.append(picture);
    const img = picture.querySelector('img');
    if (img) {
      img.loading = 'eager';
      logo.setAttribute('aria-label', img.alt || 'Home');
    }
    moveInstrumentation(logoRow, logo);
  } else {
    logo.textContent = linkRow?.textContent.trim() || 'Home';
  }

  const bar = document.createElement('div');
  bar.className = 'infosys-header-bar';
  const container = document.createElement('div');
  container.className = 'infosys-header-container';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'infosys-header-toggle';
  toggle.setAttribute('aria-controls', panelId);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open menu');
  toggle.innerHTML = '<span class="infosys-header-bars" aria-hidden="true"><span></span><span></span><span></span></span>';
  container.append(logo, toggle);
  bar.append(container);

  // panel
  const panel = document.createElement('div');
  panel.className = 'infosys-header-panel';
  panel.id = panelId;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Menu');
  panel.inert = true;

  const panelTop = document.createElement('div');
  panelTop.className = 'infosys-header-panel-top';
  const panelLogo = logo.cloneNode(true);
  [panelLogo, ...panelLogo.querySelectorAll('*')].forEach((el) => {
    [...el.attributes].filter((a) => a.name.startsWith('data-aue-') || a.name.startsWith('data-richtext-'))
      .forEach((a) => el.removeAttribute(a.name));
  });
  panelLogo.classList.add('infosys-header-panel-logo');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'infosys-header-close';
  close.setAttribute('aria-label', 'Close menu');
  close.innerHTML = '<span aria-hidden="true">&times;</span>';
  panelTop.append(panelLogo, close);

  const nav = document.createElement('div');
  nav.className = 'infosys-header-nav';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Main');
  nav.append(toList(menuRow, 'infosys-header-menu'));
  const siteLinks = toList(siteRow, 'infosys-header-site-links');

  panel.append(panelTop, nav, siteLinks);
  if (linkRow) moveInstrumentation(linkRow, panelTop);

  block.replaceChildren(bar, panel);

  // open / close
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  let onKeydown;
  let onOutsideClick;
  const setOpen = (open, returnFocus = true) => {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    block.classList.toggle('open', open);
    panel.inert = !open;
    document.body.classList.toggle('infosys-header-menu-open', open);
    if (open) {
      document.addEventListener('keydown', onKeydown);
      document.addEventListener('click', onOutsideClick, true);
      close.focus();
    } else {
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('click', onOutsideClick, true);
      if (returnFocus) toggle.focus();
    }
  };
  onKeydown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    // keep focus inside the panel while it is open
    if (e.key === 'Tab') {
      const focusables = [...panel.querySelectorAll('a[href], button')];
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  onOutsideClick = (e) => {
    if (!panel.contains(e.target) && !toggle.contains(e.target)) setOpen(false, false);
  };

  toggle.addEventListener('click', () => setOpen(!isOpen()));
  close.addEventListener('click', () => setOpen(false));
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false, false);
  });

  // transparent at the top of the page, solid once scrolled
  const onScroll = () => block.classList.toggle('scrolled', window.scrollY > 0);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
