import { moveInstrumentation } from '../../scripts/scripts.js';

/*
 * Accordion. The block's own fields come first, one row each: [title] [text] [button link], then
 * one Accordion Item per row: [question] [answer]. Each item is a <details>; one item is open at
 * a time, the first one when the page loads. In Universal Editor every item stays open, so every
 * answer can be selected and edited.
 *
 * The title, text and button (all optional) sit above the numbered list. Dark theme (block
 * option "dark") puts the block on a black band across the page, in white.
 */

const isItemRow = (row) => row.dataset.aueModel === 'accordion-item' || row.children.length > 1;

/**
 * The title, text and button above the questions.
 * @param {Element[]} rows The block's own field rows: [title] [text] [link]
 * @param {boolean} inEditor
 * @returns {Element|null}
 */
function buildIntro(rows, inEditor) {
  const [titleRow, textRow, linkRow] = rows.map((row) => row.firstElementChild);
  const intro = document.createElement('div');
  intro.className = 'accordion-intro';

  const titleText = titleRow?.textContent.trim();
  if (titleText) {
    const title = document.createElement('h2');
    title.className = 'accordion-intro-title';
    title.textContent = titleText;
    moveInstrumentation(titleRow.querySelector('[data-aue-prop]') || titleRow, title);
    intro.append(title);
  }
  if (textRow?.textContent.trim()) {
    textRow.className = 'accordion-intro-text';
    intro.append(textRow);
  }
  const link = linkRow?.querySelector('a');
  if (link) {
    link.className = 'accordion-intro-button';
    // the link sits in a paragraph (button container): take it out so it styles as a button
    const wrapper = document.createElement('p');
    wrapper.className = 'accordion-intro-action';
    wrapper.append(link);
    intro.append(wrapper);
  }
  return intro.children.length || inEditor ? intro : null;
}

/**
 * @param {Element} row [question] [answer]
 * @param {number} i
 * @returns {HTMLDetailsElement}
 */
function buildItem(row, i) {
  const [label, body] = row.children;

  const summary = document.createElement('summary');
  summary.className = 'accordion-item-label';
  const number = document.createElement('span');
  number.className = 'accordion-item-number';
  number.textContent = String(i + 1).padStart(2, '0');
  number.setAttribute('aria-hidden', 'true');
  const question = document.createElement('span');
  question.className = 'accordion-item-question';
  if (label) question.append(...label.childNodes);
  const icon = document.createElement('span');
  icon.className = 'accordion-item-icon';
  icon.setAttribute('aria-hidden', 'true');
  summary.append(number, question, icon);

  const answer = body || document.createElement('div');
  answer.className = 'accordion-item-body';

  const details = document.createElement('details');
  details.className = 'accordion-item';
  moveInstrumentation(row, details);
  details.append(summary, answer);
  return details;
}

/**
 * @param {Element} block
 */
export default function decorate(block) {
  const inEditor = !!block.dataset.aueResource;
  const rows = [...block.children];
  const items = rows.filter(isItemRow).map(buildItem);
  const intro = buildIntro(rows.filter((row) => !isItemRow(row)), inEditor);

  items.forEach((details, i) => { details.open = inEditor || i === 0; });
  // one item open at a time (not in Universal Editor, where all stay open)
  if (!inEditor) {
    items.forEach((details) => details.addEventListener('toggle', () => {
      if (details.open) items.forEach((other) => { if (other !== details) other.open = false; });
    }));
  }

  const list = document.createElement('div');
  list.className = 'accordion-list';
  list.append(...items);
  block.replaceChildren(...[intro, list].filter(Boolean));
}
