import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Infosys banner: a full-width coloured band with the page heading.
 * Rows: [background colour] then [title].
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const colorRow = rows.find((row) => row.textContent.trim().startsWith('#'));
  const titleRow = rows.find((row) => row !== colorRow && row.textContent.trim());

  const color = colorRow ? colorRow.textContent.trim() : '';
  if (color && CSS.supports('color', color)) block.style.setProperty('--infosys-banner-color', color);

  const inner = document.createElement('div');
  inner.className = 'infosys-banner-inner';
  const h1 = document.createElement('h1');
  if (titleRow) {
    const cell = titleRow.querySelector(':scope > div') || titleRow;
    const source = cell.querySelector('h1, h2, h3, h4, h5, h6, p') || cell;
    h1.textContent = source.textContent.trim();
    moveInstrumentation(source, h1);
    moveInstrumentation(titleRow, inner);
  }
  inner.append(h1);

  // keep the colour row's instrumentation (UE edits it) on a hidden element
  if (colorRow) {
    const colorEl = document.createElement('div');
    colorEl.className = 'infosys-banner-color';
    colorEl.hidden = true;
    colorEl.textContent = color;
    const colorCell = colorRow.querySelector(':scope > div') || colorRow;
    moveInstrumentation(colorCell.querySelector('p') || colorCell, colorEl);
    moveInstrumentation(colorRow, colorEl);
    block.replaceChildren(colorEl, inner);
  } else {
    block.replaceChildren(inner);
  }
}
