/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the photo-gallery block (xwalk).
 * Source: the Infosys Confluence photo gallery (document-based EDS, Owl Carousel + Bootstrap
 * modals), rendered or not:
 *   p.gallery-title                                   -> block field "title"
 *   .list_slider_carousel .item (not owl clones)      -> one Photo Gallery Topic each:
 *     h2                                              -> "title"
 *     img                                             -> "cover" (+ alt -> coverAlt)
 *     the modal its data-bs-target opens:
 *     .list_slider_carousel_modal .item img           -> "photos" (multi), in order
 * Undecorated (plain) markup: rows [title] [cover] [photos...] are read as they are.
 */

function picture(document, img) {
  const out = document.createElement('img');
  out.src = img.getAttribute('src');
  const alt = img.getAttribute('alt');
  // the source's card covers all say "Slider image": not a description, so leave it empty
  out.alt = alt && alt !== 'Slider image' ? alt : '';
  return out;
}

function hinted(document, name, ...content) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${name} `));
  content.forEach((node) => frag.appendChild(node));
  return frag;
}

function notCloned(node) {
  return !node.closest('.cloned');
}

function readDecorated(element, document) {
  const titleText = element.querySelector('.gallery-title')?.textContent.trim() || '';
  const cards = [...element.querySelectorAll('.list_slider_carousel .item')]
    .filter(notCloned)
    .filter((item) => item.querySelector('img'));
  const topics = cards.map((item) => {
    const link = item.querySelector('[data-bs-target]');
    const modal = link ? element.querySelector(link.getAttribute('data-bs-target'))
      || document.querySelector(link.getAttribute('data-bs-target')) : null;
    const photos = modal
      ? [...modal.querySelectorAll('.list_slider_carousel_modal .item img')].filter(notCloned)
      : [];
    return {
      title: item.querySelector('h2, .h2')?.textContent.trim() || '',
      cover: item.querySelector('img'),
      photos,
    };
  });
  return { titleText, topics };
}

function readPlain(block) {
  const rows = [...block.children];
  const titleRow = rows[0] && !rows[0].querySelector('img') ? rows[0] : null;
  const topics = rows.filter((row) => row !== titleRow).map((row) => {
    const imgs = [...row.querySelectorAll('img')];
    return {
      title: row.children[0]?.textContent.trim() || '',
      cover: imgs[0],
      photos: imgs.slice(1),
    };
  });
  return { titleText: titleRow?.textContent.trim() || '', topics };
}

export default function parse(element, { document }) {
  const plain = element.querySelector('.photo-gallery:not(.photo-gallery-wrapper)');
  const { titleText, topics } = element.querySelector('.list_slider_carousel') || !plain
    ? readDecorated(element, document)
    : readPlain(plain);

  const cells = [];
  cells.push([titleText ? hinted(document, 'title', document.createTextNode(titleText)) : '']);

  topics.forEach((topic) => {
    const titleCell = topic.title
      ? hinted(document, 'title', document.createTextNode(topic.title)) : '';
    const coverCell = topic.cover ? hinted(document, 'cover', picture(document, topic.cover)) : '';
    let photosCell = '';
    if (topic.photos.length) {
      const list = document.createElement('ul');
      topic.photos.forEach((img) => {
        const li = document.createElement('li');
        li.append(picture(document, img));
        list.append(li);
      });
      photosCell = hinted(document, 'photos', list);
    }
    cells.push([titleCell, coverCell, photosCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'photo-gallery', cells });
  element.replaceWith(block);
}
