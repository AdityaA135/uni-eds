import { moveInstrumentation } from '../../scripts/scripts.js';

const ITEM_IDS = ['infosys-gallery-topic', 'infosys-gallery-photo'];
const isDesktop = window.matchMedia('(min-width: 1000px)');

function icon(name) {
  const img = document.createElement('img');
  img.src = `${window.hlx?.codeBasePath || ''}/icons/${name}.svg`;
  img.alt = '';
  img.width = 31;
  img.height = 56;
  img.setAttribute('aria-hidden', 'true');
  return img;
}

function button(className, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  if (label) btn.setAttribute('aria-label', label);
  return btn;
}

/**
 * Reads the authored rows into topics: a topic row (text + cover picture)
 * followed by its photo rows (picture only). Photos before any topic are ignored.
 * @param {Element} block The block element
 * @returns {Array<{row: Element, title: string, cover: Element|null, photos: Element[]}>}
 */
function readTopics(block) {
  const topics = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    // import rows may carry the item id as their first cell
    if (cells.length > 1 && ITEM_IDS.includes(cells[0].textContent.trim())) cells.shift();
    const pictureCells = cells.filter((cell) => cell.querySelector('picture'));
    const textCell = cells.find((cell) => !cell.querySelector('picture') && cell.textContent.trim());
    if (textCell) {
      const pictures = pictureCells.flatMap((cell) => [...cell.querySelectorAll('picture')]);
      topics.push({
        row,
        title: textCell.textContent.trim(),
        textEl: textCell.querySelector('p, h1, h2, h3, h4, h5, h6') || textCell,
        cover: pictures.shift() || null,
        photos: pictures.map((picture) => ({ row: null, picture })),
      });
    } else if (pictureCells.length && topics.length) {
      const topic = topics[topics.length - 1];
      pictureCells.forEach((cell) => cell.querySelectorAll('picture').forEach((picture) => {
        topic.photos.push({ row, picture });
      }));
    }
  });
  return topics;
}

/**
 * Builds the modal dialog: a one-photo slider with arrows and a caption bar.
 * @param {Element} block The block element
 * @returns {{open: Function}}
 */
function buildModal(block) {
  const dialog = document.createElement('dialog');
  dialog.className = 'infosys-photo-gallery-modal';

  const inner = document.createElement('div');
  inner.className = 'infosys-photo-gallery-modal-inner';

  const close = button('infosys-photo-gallery-close', 'Close gallery');
  close.innerHTML = '<span aria-hidden="true">&times;</span>';

  const stage = document.createElement('div');
  stage.className = 'infosys-photo-gallery-stage';
  const track = document.createElement('ul');
  track.className = 'infosys-photo-gallery-track';
  track.setAttribute('aria-live', 'polite');
  const prev = button('infosys-photo-gallery-prev', 'Previous photo');
  prev.append(icon('gallery-prev'));
  const next = button('infosys-photo-gallery-next', 'Next photo');
  next.append(icon('gallery-next'));
  stage.append(track, prev, next);

  const caption = document.createElement('p');
  caption.className = 'infosys-photo-gallery-caption';

  inner.append(close, stage, caption);
  dialog.append(inner);
  block.append(dialog);

  let opener = null;
  const slides = () => [...track.children];
  const currentIndex = () => {
    const width = track.clientWidth || 1;
    return Math.round(track.scrollLeft / width);
  };
  const updateArrows = () => {
    const count = slides().length;
    const index = currentIndex();
    prev.disabled = index <= 0;
    next.disabled = index >= count - 1;
    prev.hidden = count < 2;
    next.hidden = count < 2;
    slides().forEach((slide, i) => slide.setAttribute('aria-hidden', i === index ? 'false' : 'true'));
  };
  const goTo = (index) => {
    const count = slides().length;
    const target = Math.max(0, Math.min(count - 1, index));
    track.scrollTo({ left: target * track.clientWidth, behavior: 'smooth' });
  };

  let scrollTimer;
  track.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(updateArrows, 60);
  }, { passive: true });
  prev.addEventListener('click', () => goTo(currentIndex() - 1));
  next.addEventListener('click', () => goTo(currentIndex() + 1));
  close.addEventListener('click', () => dialog.close());

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentIndex() - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(currentIndex() + 1); }
  });
  // a click on the backdrop (outside the photo, caption and close button) closes
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target === inner) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('infosys-photo-gallery-open');
    track.replaceChildren();
    if (opener) opener.focus();
    opener = null;
  });

  return {
    open(topic, trigger) {
      opener = trigger;
      const pictures = topic.photos.length
        ? topic.photos.map(({ picture }) => picture)
        : [topic.cover].filter(Boolean);
      track.replaceChildren(...pictures.map((picture, i) => {
        const li = document.createElement('li');
        li.className = 'infosys-photo-gallery-slide';
        li.setAttribute('aria-label', `Photo ${i + 1} of ${pictures.length}`);
        const clone = picture.cloneNode(true);
        // the modal copy must not be editable in Universal Editor
        [clone, ...clone.querySelectorAll('*')].forEach((el) => {
          [...el.attributes]
            .filter((a) => a.name.startsWith('data-aue-') || a.name.startsWith('data-richtext-'))
            .forEach((a) => el.removeAttribute(a.name));
        });
        const img = clone.querySelector('img');
        if (img) {
          img.loading = 'eager';
          if (!img.alt) img.alt = `${topic.title} ${i + 1}`;
        }
        li.append(clone);
        return li;
      }));
      caption.textContent = topic.title;
      dialog.setAttribute('aria-label', topic.title);
      document.body.classList.add('infosys-photo-gallery-open');
      dialog.showModal();
      track.scrollLeft = 0;
      updateArrows();
      close.focus();
    },
  };
}

/**
 * Builds the dots of the mobile one-card carousel.
 * @param {Element} list The card list (the scroll-snap track)
 * @returns {Element} The dots container
 */
function buildDots(list) {
  const dots = document.createElement('div');
  dots.className = 'infosys-photo-gallery-dots';
  const cards = [...list.children];
  cards.forEach((card, i) => {
    const dot = button('infosys-photo-gallery-dot', `Show card ${i + 1} of ${cards.length}`);
    dot.addEventListener('click', () => {
      list.scrollTo({ left: card.offsetLeft - list.offsetLeft, behavior: 'smooth' });
    });
    dots.append(dot);
  });
  const update = () => {
    const index = Math.round(list.scrollLeft / (list.clientWidth || 1));
    [...dots.children].forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
      dot.setAttribute('aria-current', i === index ? 'true' : 'false');
    });
  };
  let timer;
  list.addEventListener('scroll', () => {
    clearTimeout(timer);
    timer = setTimeout(update, 60);
  }, { passive: true });
  update();
  return dots;
}

/**
 * Infosys photo gallery: topic cards that each open a modal photo slider.
 * Desktop shows the cards in rows of four; below 1000px a one-card carousel.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const topics = readTopics(block);

  const list = document.createElement('ul');
  list.className = 'infosys-photo-gallery-cards';

  topics.forEach((topic) => {
    const li = document.createElement('li');
    moveInstrumentation(topic.row, li);

    const card = button('infosys-photo-gallery-card');
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-label', `${topic.title}: open photo gallery`);
    const image = document.createElement('span');
    image.className = 'infosys-photo-gallery-cover';
    if (topic.cover) image.append(topic.cover);
    const title = document.createElement('span');
    title.className = 'infosys-photo-gallery-title';
    title.textContent = topic.title;
    moveInstrumentation(topic.textEl, title);
    card.append(image, title);
    li.append(card);

    // keep the photos (and their Universal Editor instrumentation) in the DOM, hidden
    if (topic.photos.length) {
      const photos = document.createElement('ul');
      photos.className = 'infosys-photo-gallery-photos';
      photos.hidden = true;
      topic.photos.forEach((photo) => {
        const item = document.createElement('li');
        if (photo.row) moveInstrumentation(photo.row, item);
        item.append(photo.picture);
        photos.append(item);
      });
      li.append(photos);
    }

    list.append(li);
  });

  block.replaceChildren(list);
  if (topics.length > 1) block.append(buildDots(list));

  const modal = buildModal(block);
  list.querySelectorAll('.infosys-photo-gallery-card').forEach((card, i) => {
    card.addEventListener('click', () => modal.open(topics[i], card));
  });

  // back to the first card when switching to the desktop grid
  isDesktop.addEventListener('change', () => { list.scrollLeft = 0; });
}
