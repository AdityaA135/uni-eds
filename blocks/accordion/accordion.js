import { moveInstrumentation } from '../../scripts/scripts.js';

/*
 * Accordion: one Accordion Item per row, [title] [content]. Each item is a <details>, numbered
 * 01, 02...; all start closed and one is open at a time. In Universal Editor, selecting an item,
 * or one of its fields, on the page or in the content tree opens it. Dark theme (block option
 * "dark") puts the block on a black band across the page, in white.
 */

// the most characters each text may have: enough for any title and content, not for a wall of
// pasted text (_accordion.json limits the title field to the same). Longer text, saved before
// the limits or in the rich text content, is shortened on the page, and listed in the editor
const MAX_CHARS = {
  title: 120,
  content: 600,
};

const length = (node) => node.textContent.replace(/\s+/g, ' ').trim().length;

/** text cut to at most `max` characters, at a word where it can, ending in an ellipsis */
function clip(text, max) {
  const cut = text.slice(0, Math.max(0, max - 1));
  const atWord = cut.replace(/\s+\S*$/, '');
  return `${(atWord.length >= max / 2 ? atWord : cut).replace(/[\s.,;:–-]+$/, '')}…`;
}

/**
 * Cuts the text in an element (a plain title, or rich text content with its paragraphs,
 * lists and links) to `max` characters: the text past the limit, and the elements left empty,
 * are removed. Returns the text's length if it was cut, else 0
 * @param {Element} node
 * @param {number} max
 * @returns {number}
 */
function clipContent(node, max) {
  const full = length(node);
  if (full <= max) return 0;
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  let left = max;
  texts.forEach((text) => {
    const value = text.textContent.replace(/\s+/g, ' ');
    if (left <= 0) {
      text.remove();
    } else if (value.length <= left) {
      left -= value.length;
    } else {
      text.textContent = clip(value, left);
      left = 0;
    }
  });
  [...node.querySelectorAll('*')].reverse().forEach((el) => {
    if (!el.textContent.trim() && !el.querySelector('img, picture, br')) el.remove();
  });
  return full;
}

/**
 * @param {Element} row [title] [content]
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

  // texts over their limit (MAX_CHARS): shortened, and listed for the author in the editor
  const tooLong = [];
  items.forEach((details, i) => {
    const titleLength = clipContent(details.querySelector('.accordion-item-question'), MAX_CHARS.title);
    if (titleLength) tooLong.push(`item ${i + 1}: its title (${titleLength} of ${MAX_CHARS.title} characters)`);
    const contentLength = clipContent(details.querySelector('.accordion-item-body'), MAX_CHARS.content);
    if (contentLength) tooLong.push(`item ${i + 1}: its content (${contentLength} of ${MAX_CHARS.content} characters)`);
  });

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

  const content = [...items];
  if (editing && tooLong.length) {
    const note = document.createElement('p');
    note.className = 'accordion-limit-note';
    note.textContent = `Too long, so shortened on the page: ${tooLong.join('; ')}. `
      + 'Shorten them in the properties.';
    content.unshift(note);
  }
  block.replaceChildren(...content);
}
