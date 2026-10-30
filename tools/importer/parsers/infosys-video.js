/* eslint-disable */
/* global WebImporter */

/**
 * Parser for infosys-video (xwalk model: video, title).
 * Source: .session.block .video-player-container iframe[src] + h2
 * Row 1: video URL (iframe src without query/hash; else the first link href).
 * Row 2: the h2 text.
 */
function cleanUrl(src) {
  if (!src) return '';
  let url = src.trim();
  if (url.startsWith('//')) url = `https:${url}`;
  return url.split(/[?#]/)[0];
}

export default function parse(element, { document }) {
  const iframe = element.querySelector('iframe[src]');
  let video = iframe ? cleanUrl(iframe.getAttribute('src')) : '';
  if (!video) {
    const a = element.querySelector('a[href]');
    if (a) video = cleanUrl(a.getAttribute('href'));
  }
  const heading = element.querySelector('h2, h3, h1');
  const title = heading ? heading.textContent.replace(/\s+/g, ' ').trim() : '';

  const cells = [];

  const videoCell = document.createDocumentFragment();
  if (video) {
    videoCell.appendChild(document.createComment(' field:video '));
    videoCell.appendChild(document.createTextNode(video));
  }
  cells.push([videoCell]);

  const titleCell = document.createDocumentFragment();
  if (title) {
    titleCell.appendChild(document.createComment(' field:title '));
    titleCell.appendChild(document.createTextNode(title));
  }
  cells.push([titleCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'infosys-video', cells });
  element.replaceWith(block);
}
