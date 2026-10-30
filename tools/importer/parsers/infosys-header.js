/* eslint-disable */
/* global WebImporter */

/**
 * Parser for infosys-header (xwalk model: logo + logoAlt, logoLink, menu, siteLinks).
 * Source: the nav page as authored (nav.plain.html), its "header" block:
 *   row 1: [logo picture] [logo link]
 *   row 2: [menu links list] [site links list]
 * Output rows: [logo] [logo link] [menu list] [site links list].
 */
const LOGO_ALT = 'Infosys Americas Confluence';

function fieldCell(document, name, ...nodes) {
  const cell = document.createDocumentFragment();
  const content = nodes.filter(Boolean);
  if (content.length) {
    cell.appendChild(document.createComment(` field:${name} `));
    content.forEach((n) => cell.appendChild(n));
  }
  return cell;
}

/** a clean list of the links in `el` (the source underlines some of them with <u>) */
function linkList(document, el) {
  const ul = document.createElement('ul');
  (el ? [...el.querySelectorAll('a')] : []).forEach((a) => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.textContent = a.textContent.replace(/\s+/g, ' ').trim();
    li.appendChild(link);
    ul.appendChild(li);
  });
  return ul.children.length ? ul : null;
}

export default function parse(element, { document }) {
  const rows = [...element.children];
  const [brandRow, listRow] = rows;
  const lists = listRow ? [...listRow.querySelectorAll('ul')] : [...element.querySelectorAll('ul')];

  const img = element.querySelector('img');
  let logo = null;
  if (img) {
    logo = document.createElement('img');
    logo.src = img.getAttribute('src');
    logo.alt = (img.getAttribute('alt') || '').trim() || LOGO_ALT;
  }
  const brandLink = (brandRow || element).querySelector('a');
  let logoLink = null;
  if (brandLink) {
    logoLink = document.createElement('a');
    logoLink.href = brandLink.getAttribute('href');
    logoLink.textContent = brandLink.getAttribute('href');
  }

  const cells = [
    [fieldCell(document, 'logo', logo)],
    [fieldCell(document, 'logoLink', logoLink)],
    [fieldCell(document, 'menu', linkList(document, lists[0]))],
    [fieldCell(document, 'siteLinks', linkList(document, lists[1]))],
  ];

  const block = WebImporter.Blocks.createBlock(document, { name: 'infosys-header', cells });
  element.replaceWith(block);
}
