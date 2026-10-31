import { moveInstrumentation } from '../../scripts/scripts.js';

/*
 * Photo gallery: a titled set of topic cards; a card opens its topic's photos in a slider.
 * Rows: [gallery title], then one row per topic: [title] [cover image] [photos].
 * From 1000px the cards sit four to a row; narrower, one card at a time, swiped, with dots.
 */

const GRID = window.matchMedia('(width >= 1000px)');

let instance = 0;

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, value));
  return node;
}

/**
 * Moves a text field's Universal Editor instrumentation to the element that now shows it. EDS
 * wraps a cell's text in a <p> and moves the field's attributes onto it, so they may be on the
 * cell or on that <p>.
 * @param {Element} cell The authored cell
 * @param {Element} to The element showing its text
 */
function moveFieldInstrumentation(cell, to) {
  if (!cell) return;
  moveInstrumentation(cell.querySelector('[data-aue-prop], [data-richtext-prop]') || cell, to);
}

function icon(name) {
  const img = el('img', '', { src: `${window.hlx?.codeBasePath || ''}/icons/photo-gallery-${name}.svg`, alt: '' });
  img.width = 31;
  img.height = 56;
  return img;
}

/**
 * A topic row: [title] [cover] [photos]. Read by position, so an empty cover does not shift the
 * photos; a row laid out otherwise (document authoring: pictures straight in the cells) is read
 * by content: the first picture is the cover, the rest are the photos.
 * @param {Element} row The topic row
 */
function readTopic(row) {
  const cells = [...row.children];
  let titleCell;
  let cover;
  let photos;
  if (cells.length >= 3 && !cells[0].querySelector('picture')) {
    [titleCell] = cells;
    cover = cells[1].querySelector('picture');
    photos = cells.slice(2).flatMap((cell) => [...cell.querySelectorAll('picture')]);
  } else {
    titleCell = cells.find((cell) => !cell.querySelector('picture') && cell.textContent.trim());
    const pictures = [...row.querySelectorAll('picture')];
    [cover] = pictures;
    photos = pictures.slice(1);
  }
  return {
    row,
    titleCell,
    title: titleCell?.textContent.trim() || '',
    cover,
    photos: photos.length ? photos : [cover].filter(Boolean),
  };
}

/**
 * Scrolls a snap list to one of its items.
 * @param {Element} list The scrolling list
 * @param {number} index The item
 * @param {boolean} smooth Whether to animate
 */
function scrollToItem(list, index, smooth = true) {
  list.scrollTo({ left: index * list.clientWidth, behavior: smooth ? 'smooth' : 'instant' });
}

function currentItem(list) {
  return list.clientWidth ? Math.round(list.scrollLeft / list.clientWidth) : 0;
}

/**
 * The popup: one per gallery, filled with the opened topic's photos.
 * @param {string} id The gallery's id
 * @returns {{dialog: HTMLDialogElement, open: Function}}
 */
function buildModal(id) {
  const dialog = el('dialog', 'photo-gallery-modal', { 'aria-labelledby': `${id}-caption` });
  const body = el('div', 'photo-gallery-modal-body');
  const close = el('button', 'photo-gallery-close', { type: 'button', 'aria-label': 'Close' });
  close.append(el('span', '', { 'aria-hidden': 'true' }));
  close.firstChild.textContent = '×';
  const slides = el('ul', 'photo-gallery-slides');
  const prev = el('button', 'photo-gallery-prev', { type: 'button', 'aria-label': 'Previous photo' });
  prev.append(icon('prev'));
  const next = el('button', 'photo-gallery-next', { type: 'button', 'aria-label': 'Next photo' });
  next.append(icon('next'));
  const caption = el('p', 'photo-gallery-caption', { id: `${id}-caption` });
  body.append(close, slides, prev, next, caption);
  dialog.append(body);

  const updateArrows = () => {
    const index = currentItem(slides);
    const last = slides.children.length - 1;
    prev.disabled = index <= 0;
    next.disabled = index >= last;
    prev.hidden = last < 1;
    next.hidden = last < 1;
  };
  let frame = 0;
  slides.addEventListener('scroll', () => {
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        updateArrows();
      });
    }
  }, { passive: true });
  const step = (by) => scrollToItem(slides, currentItem(slides) + by);
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  close.addEventListener('click', () => dialog.close());
  // a click on the backdrop (outside the photo) closes it
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  const open = (topic) => {
    caption.textContent = topic.title;
    slides.replaceChildren(...topic.photos.map((picture, i) => {
      const li = el('li', 'photo-gallery-slide');
      const copy = picture.cloneNode(true);
      const img = copy.querySelector('img');
      if (img) {
        if (!img.getAttribute('alt')) {
          img.alt = topic.photos.length > 1
            ? `${topic.title}, photo ${i + 1} of ${topic.photos.length}`
            : topic.title;
        }
        img.loading = i === 0 ? 'eager' : 'lazy';
      }
      li.append(copy);
      return li;
    }));
    dialog.showModal();
    scrollToItem(slides, 0, false);
    updateArrows();
    close.focus();
  };

  return { dialog, open };
}

/**
 * Below 1000px the cards are a one-at-a-time carousel: dots under it show and pick the card.
 * @param {Element} cards The card list
 * @param {Array} topics The topics
 * @returns {Element|null} The dots, or null for a single card
 */
function buildDots(cards, topics) {
  if (topics.length < 2) return null;
  const dots = el('div', 'photo-gallery-dots');
  const buttons = topics.map((topic, i) => {
    const dot = el('button', 'photo-gallery-dot', { type: 'button', 'aria-label': `Show ${topic.title || `card ${i + 1}`}` });
    dot.addEventListener('click', () => scrollToItem(cards, i));
    dots.append(dot);
    return dot;
  });
  const update = () => {
    const index = currentItem(cards);
    buttons.forEach((dot, i) => dot.setAttribute('aria-current', i === index ? 'true' : 'false'));
  };
  let frame = 0;
  cards.addEventListener('scroll', () => {
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    }
  }, { passive: true });
  GRID.addEventListener('change', update);
  update();
  return dots;
}

/**
 * Loads and decorates the photo gallery block.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  instance += 1;
  const id = `photo-gallery-${instance}`;
  const rows = [...block.children];
  // the first row is the gallery title (no picture in it)
  const titleRow = rows[0] && !rows[0].querySelector('picture') ? rows[0] : null;
  const topics = rows.filter((row) => row !== titleRow).map(readTopic);

  const content = [];
  if (titleRow && titleRow.textContent.trim()) {
    const title = el('h2', 'photo-gallery-title');
    title.textContent = titleRow.textContent.trim();
    moveFieldInstrumentation(titleRow.querySelector(':scope > div') || titleRow, title);
    content.push(title);
  }

  const { dialog, open } = buildModal(id);
  const cards = el('ul', 'photo-gallery-cards');
  topics.forEach((topic) => {
    const card = el('li', 'photo-gallery-card');
    moveInstrumentation(topic.row, card);
    const button = el('button', 'photo-gallery-card-button', { type: 'button', 'aria-haspopup': 'dialog' });
    if (topic.cover) button.append(topic.cover);
    const name = el('span', 'photo-gallery-card-title');
    name.textContent = topic.title;
    moveFieldInstrumentation(topic.titleCell, name);
    button.append(name);
    button.addEventListener('click', () => open(topic));
    card.append(button);
    cards.append(card);
  });
  content.push(cards);

  const dots = buildDots(cards, topics);
  if (dots) content.push(dots);
  content.push(dialog);

  block.replaceChildren(...content);
}
