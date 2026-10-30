/* eslint-disable */
/* global WebImporter */

/**
 * Parser for infosys-banner (xwalk model: color, title).
 * Source: .banner-wrapper > .banner.block > section#speaker_bg h1.speaker-title
 * Row 1: background colour (hex) from the inline style of section#speaker_bg,
 *        falling back to the model default #df9926 when no inline colour exists.
 * Row 2: the h1 text.
 */
const DEFAULT_COLOR = '#df9926';

function toHex(value) {
  if (!value) return '';
  const v = value.trim();
  const hex = v.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/i);
  if (hex) {
    let h = hex[1].toLowerCase();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return `#${h}`;
  }
  const rgb = v.match(/rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i);
  if (rgb) {
    return `#${rgb.slice(1, 4).map((n) => Math.min(255, parseInt(n, 10)).toString(16).padStart(2, '0')).join('')}`;
  }
  return '';
}

function readColor(section) {
  if (!section) return '';
  const style = section.getAttribute('style') || '';
  const decl = style.match(/background(?:-color)?\s*:\s*([^;]+)/i);
  if (decl) return toHex(decl[1]);
  return '';
}

export default function parse(element, { document }) {
  const section = element.querySelector('#speaker_bg') || (element.matches('#speaker_bg') ? element : null);
  const heading = element.querySelector('h1, .speaker-title, h2');

  const color = readColor(section) || DEFAULT_COLOR;
  const title = heading ? heading.textContent.replace(/\s+/g, ' ').trim() : '';

  const cells = [];

  const colorCell = document.createDocumentFragment();
  colorCell.appendChild(document.createComment(' field:color '));
  colorCell.appendChild(document.createTextNode(color));
  cells.push([colorCell]);

  const titleCell = document.createDocumentFragment();
  if (title) {
    titleCell.appendChild(document.createComment(' field:title '));
    titleCell.appendChild(document.createTextNode(title));
  }
  cells.push([titleCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'infosys-banner', cells });
  element.replaceWith(block);
}
