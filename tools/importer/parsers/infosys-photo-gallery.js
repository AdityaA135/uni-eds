/* eslint-disable */
/* global WebImporter */

/**
 * Parser for infosys-photo-gallery (xwalk container, two item types:
 * infosys-gallery-topic {title, image, imageAlt} and infosys-gallery-photo {image, imageAlt}).
 *
 * Source: .photo-gallery-wrapper
 *   section#photo_gallery
 *     .gallery-title                                  -> <h2> default content before the block
 *     .list_slider_carousel .owl-item .item > a[data-bs-target]
 *       .list_slider_caption img + h2                -> topic cover + title
 *   .list_slider_modal#<data-bs-target without '#'>
 *     .list_slider_carousel_modal .owl-item:not(.cloned) .item img -> photos of that topic
 *
 * When data-bs-target is missing (cleaned capture), the modal id is derived from
 * the gallery row id and the 1-based card index (e.g. row #day2, 3rd card -> #day2_3),
 * which is how the source names its modals.
 *
 * Rows: [ "infosys-gallery-topic" | title | cover picture ]
 *       [ "infosys-gallery-photo" | picture ]  (one per modal image, in order)
 * The first cell names the item component (helix-md2jcr getBlockItems).
 * imageAlt is a collapsed suffix field: it is carried as the img alt.
 */
const MEANINGLESS_ALT = /^(slider image|image|img|photo|picture|thumbnail)?$/i;

function absoluteSrc(img, document) {
  const raw = img.getAttribute('src') || img.getAttribute('data-src') || '';
  if (!raw) return '';
  try {
    const base = (document.location && document.location.href && document.location.href !== 'about:blank')
      ? document.location.href
      : 'https://main--infosyseds--infosys-is-dotcom.aem.live/';
    return new URL(raw, base).href;
  } catch (e) {
    return raw;
  }
}

function altFor(img, fallback) {
  const alt = (img.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
  return MEANINGLESS_ALT.test(alt) ? fallback : alt;
}

function pictureCell(document, img, alt) {
  const cell = document.createDocumentFragment();
  const src = absoluteSrc(img, document);
  if (!src) return cell;
  const out = document.createElement('img');
  out.setAttribute('src', src);
  out.setAttribute('alt', alt || '');
  cell.appendChild(document.createComment(' field:image '));
  cell.appendChild(out);
  return cell;
}

function findModal(element, document, id) {
  if (!id) return null;
  const sel = `.list_slider_modal[id="${id.replace(/"/g, '\\"')}"]`;
  return element.querySelector(sel) || document.querySelector(sel);
}

export default function parse(element, { document }) {
  const gallery = element.querySelector('#photo_gallery') || element;
  const titleEl = gallery.querySelector('.gallery-title');
  const galleryTitle = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : '';
  const row = gallery.querySelector('.list_slider_carousel') ? gallery.querySelector('.list_slider_carousel').closest('.row[id]') : null;
  const rowId = row ? row.id : '';

  const items = Array.from(gallery.querySelectorAll('.list_slider_carousel .owl-item:not(.cloned) > .item'));
  const cells = [];

  items.forEach((item, index) => {
    const trigger = item.querySelector(':scope > a') || item.querySelector('a');
    const caption = item.querySelector('.list_slider_caption') || item;
    const coverImg = caption.querySelector('img');
    const heading = caption.querySelector('h2, h3, h4, .h2');
    const title = heading ? heading.textContent.replace(/\s+/g, ' ').trim() : '';

    // topic row
    const titleCell = document.createDocumentFragment();
    if (title) {
      titleCell.appendChild(document.createComment(' field:title '));
      titleCell.appendChild(document.createTextNode(title));
    }
    const coverCell = coverImg ? pictureCell(document, coverImg, altFor(coverImg, title)) : document.createDocumentFragment();
    cells.push(['infosys-gallery-topic', titleCell, coverCell]);

    // photo rows from the card's modal
    let target = '';
    if (trigger) {
      target = trigger.getAttribute('data-bs-target') || trigger.getAttribute('data-target') || '';
      if (!target) {
        const href = trigger.getAttribute('href') || '';
        if (href.startsWith('#') && href.length > 1) target = href;
      }
    }
    let modalId = target.replace(/^#/, '');
    if (!modalId && rowId) modalId = `${rowId}_${index + 1}`;
    const modal = findModal(element, document, modalId);
    if (!modal) return;

    const photos = Array.from(modal.querySelectorAll('.list_slider_carousel_modal .owl-item:not(.cloned) .item img'));
    photos.forEach((img) => {
      if (!absoluteSrc(img, document)) return;
      cells.push(['infosys-gallery-photo', pictureCell(document, img, altFor(img, title))]);
    });
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'infosys-photo-gallery', cells });
  if (galleryTitle) {
    const h2 = document.createElement('h2');
    h2.textContent = galleryTitle;
    element.replaceWith(h2, block);
  } else {
    element.replaceWith(block);
  }
}
