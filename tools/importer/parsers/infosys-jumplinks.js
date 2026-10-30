/* eslint-disable */
/* global WebImporter */

/**
 * Parser for infosys-jumplinks (xwalk container; item infosys-jumplink: link, linkText).
 * Source: .jumplinks.block ul > li > a
 * One row per link. linkText is a collapsed suffix field of link, so the single
 * cell holds <!-- field:link --><a href="#x">text</a> (href -> link, text -> linkText).
 */
function normalizeHref(href) {
  if (!href) return '';
  const bookmark = href.match(/^bookmark:\/\/(.+)$/i);
  if (bookmark) return `#${bookmark[1]}`;
  const bareHash = href.match(/^https?:\/\/#(.+)$/i);
  if (bareHash) return `#${bareHash[1]}`;
  return href;
}

export default function parse(element, { document }) {
  const links = Array.from(element.querySelectorAll('ul > li > a'));
  const cells = [];

  links.forEach((a) => {
    const text = a.textContent.replace(/\s+/g, ' ').trim();
    const href = normalizeHref(a.getAttribute('href') || '');
    if (!text && !href) return;
    const link = document.createElement('a');
    link.setAttribute('href', href);
    link.textContent = text || href;
    const cell = document.createDocumentFragment();
    cell.appendChild(document.createComment(' field:link '));
    cell.appendChild(link);
    cells.push([cell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'infosys-jumplinks', cells });
  element.replaceWith(block);
}
