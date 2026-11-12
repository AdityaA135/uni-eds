import { moveInstrumentation } from '../../scripts/scripts.js';

/*
 * Accordion: one Accordion Item per row, [question] [answer]. Each item is a <details>, numbered
 * 01, 02...; all start closed and one is open at a time. In Universal Editor, selecting an item,
 * or one of its fields, on the page or in the content tree opens it. Dark theme (block option
 * "dark") puts the block on a black band across the page, in white.
 */

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
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const items = [...block.children].map(buildItem);

  // one item open at a time
  items.forEach((details) => details.addEventListener('toggle', () => {
    if (details.open) items.forEach((other) => { if (other !== details) other.open = false; });
  }));

  // Universal Editor: selecting an item, or one of its fields, in the content tree or on the
  // page opens that item. Listened to while capturing, so it is heard wherever it is dispatched
  if (editing && items.length) {
    document.addEventListener('aue:ui-select', (e) => {
      if (!block.isConnected || !e.detail?.selected) return;
      const { resource } = e.detail;
      const item = items.find((details) => (resource && details.dataset.aueResource === resource)
        || (e.target instanceof Node && details.contains(e.target)));
      if (item) item.open = true;
    }, true);
  }

  block.replaceChildren(...items);
}
