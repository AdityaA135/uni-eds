import { moveInstrumentation } from '../../scripts/scripts.js';

const SOCIAL = [
  { name: 'facebook', label: 'Facebook', hosts: ['facebook.com', 'fb.com'] },
  { name: 'x', label: 'X', hosts: ['x.com', 'twitter.com'] },
  { name: 'linkedin', label: 'LinkedIn', hosts: ['linkedin.com'] },
];

function unbutton(root) {
  root.querySelectorAll('a.button').forEach((a) => a.classList.remove('button', 'primary', 'secondary'));
  root.querySelectorAll('.button-container').forEach((p) => p.classList.remove('button-container'));
}

function socialFor(href) {
  try {
    const host = new URL(href, window.location.href).hostname.replace(/^www\./, '');
    return SOCIAL.find(({ hosts }) => hosts.some((h) => host === h || host.endsWith(`.${h}`)));
  } catch (e) {
    return null;
  }
}

/**
 * Moves the links of a row into a list.
 * @param {Element|undefined} row The authored row
 * @param {string} className The list class
 * @returns {Element} The list
 */
function toList(row, className) {
  const ul = document.createElement('ul');
  ul.className = className;
  if (!row) return ul;
  unbutton(row);
  // the field's instrumentation sits on the cell (the row of a column item keeps its own)
  moveInstrumentation(row.querySelector(':scope > div') || row, ul);
  row.querySelectorAll('a').forEach((a) => {
    const li = document.createElement('li');
    li.append(a);
    ul.append(li);
  });
  return ul;
}

function textOf(row) {
  return row ? row.textContent.trim() : '';
}

/**
 * Sorts the authored rows by content, so a missing or empty field does not shift the others.
 * Block field rows come first ([logo], [logo link], [legal links], [copyright]), then one row
 * per link column. The last row without links or pictures (the copyright) ends the field rows.
 * A column whose links all go to a social network is the social column: its links show as
 * icons and its other text (e.g. "Follow Us") is its label.
 * @param {Element} block The block element
 */
function readRows(block) {
  const rows = [...block.children];
  const isPlain = (row) => !row.querySelector('a, picture');
  let split = -1;
  rows.forEach((row, i) => { if (isPlain(row) && i < 4) split = i; });
  if (split < 0) split = Math.min(rows.length, 4) - 1;
  const fieldRows = rows.slice(0, split + 1);
  const columnRows = rows.slice(split + 1);

  const logoRow = fieldRows.find((row) => row.querySelector('picture'));
  const linkRows = fieldRows.filter((row) => row !== logoRow && row.querySelector('a'));
  // the logo link is a single link; the legal links a list (or the only other link row)
  const linkRow = linkRows.find((row) => row.querySelectorAll('a').length === 1 && !row.querySelector('ul, ol'));
  const legalRow = linkRows.find((row) => row !== linkRow);
  const copyrightRow = fieldRows.filter((row) => row !== logoRow && isPlain(row)).pop();

  const isSocial = (row) => {
    const links = [...row.querySelectorAll('a')];
    return links.length && links.every((a) => socialFor(a.href));
  };
  const socialRow = columnRows.find(isSocial);
  return {
    logoRow,
    linkRow,
    legalRow,
    copyrightRow,
    socialRow,
    columnRows: columnRows.filter((row) => row !== socialRow),
  };
}

/**
 * The label of the social column: its text outside the links.
 * @param {Element} row The social column row
 * @returns {string} The label
 */
function socialLabel(row) {
  const copy = row.cloneNode(true);
  copy.querySelectorAll('a').forEach((a) => a.remove());
  return copy.textContent.trim();
}

/**
 * Infosys footer: logo, link columns (one of them may be the social links), legal links and
 * copyright.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  // an imported column row may still start with its item id (the converter's hint, not
  // rendered in AEM): it is not content
  [...block.children].forEach((row) => {
    const first = row.firstElementChild;
    if (row.children.length > 1 && first.textContent.trim() === 'infosys-footer-column') first.remove();
  });
  const {
    logoRow, linkRow, legalRow, copyrightRow, socialRow, columnRows,
  } = readRows(block);

  // logo
  const logo = document.createElement('a');
  logo.className = 'infosys-footer-logo';
  if (linkRow) unbutton(linkRow);
  logo.href = linkRow?.querySelector('a')?.getAttribute('href') || textOf(linkRow) || '/';
  const picture = logoRow?.querySelector('picture');
  if (picture) {
    logo.append(picture);
    logo.setAttribute('aria-label', picture.querySelector('img')?.alt || 'Home');
  }
  if (logoRow) moveInstrumentation(logoRow, logo);
  const brand = document.createElement('div');
  brand.className = 'infosys-footer-brand';
  brand.append(logo);

  // link columns
  const columns = document.createElement('div');
  columns.className = 'infosys-footer-columns';
  columnRows.forEach((row) => {
    const list = toList(row, 'infosys-footer-column-links');
    if (!list.children.length) return;
    const col = document.createElement('div');
    col.className = 'infosys-footer-column';
    moveInstrumentation(row, col);
    col.append(list);
    columns.append(col);
  });

  // social
  const social = document.createElement('div');
  social.className = 'infosys-footer-social';
  const socialTitle = document.createElement('p');
  socialTitle.className = 'infosys-footer-social-title';
  socialTitle.textContent = socialRow ? socialLabel(socialRow) : '';
  // the social column is an item of its own: it keeps its instrumentation
  if (socialRow) moveInstrumentation(socialRow, social);
  const socialList = toList(socialRow, 'infosys-footer-social-links');
  socialList.querySelectorAll('a').forEach((a) => {
    const network = socialFor(a.href);
    const label = a.textContent.trim() || network?.label || 'Social link';
    a.setAttribute('aria-label', label);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if (network) {
      const img = document.createElement('img');
      img.src = `${window.hlx?.codeBasePath || ''}/icons/${network.name}.svg`;
      img.alt = '';
      img.width = 20;
      img.height = 20;
      img.setAttribute('aria-hidden', 'true');
      a.replaceChildren(img);
      a.classList.add(`infosys-footer-social-${network.name}`);
    }
  });
  if (socialTitle.textContent) social.append(socialTitle);
  social.append(socialList);

  const top = document.createElement('div');
  top.className = 'infosys-footer-top';
  top.append(brand, columns, social);

  // legal + copyright
  const legal = toList(legalRow, 'infosys-footer-legal');
  const copyright = document.createElement('p');
  copyright.className = 'infosys-footer-copyright';
  copyright.textContent = textOf(copyrightRow);
  if (copyrightRow) moveInstrumentation(copyrightRow, copyright);

  const bottom = document.createElement('div');
  bottom.className = 'infosys-footer-bottom';
  bottom.append(legal, copyright);

  const container = document.createElement('div');
  container.className = 'infosys-footer-container';
  container.append(top, bottom);
  block.replaceChildren(container);
}
