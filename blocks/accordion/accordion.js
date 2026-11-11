import { moveInstrumentation } from '../../scripts/scripts.js';

/*
 * Accordion: one Accordion Item per row, [question] [answer]. Each item is a <details>, numbered
 * 01, 02...; one item is open at a time, the first one when the page loads. In Universal Editor
 * every item stays open, so every answer can be selected and edited.
 */

/**
 * @param {Element} block
 */
export default function decorate(block) {
  const inEditor = !!block.dataset.aueResource;
  const items = [...block.children].map((row, i) => {
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
    details.open = inEditor || i === 0;
    return details;
  });

  // one item open at a time (not in Universal Editor, where all stay open)
  if (!inEditor) {
    items.forEach((details) => details.addEventListener('toggle', () => {
      if (details.open) items.forEach((other) => { if (other !== details) other.open = false; });
    }));
  }

  block.replaceChildren(...items);
}
