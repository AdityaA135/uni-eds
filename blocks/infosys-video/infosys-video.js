import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Turns a Vidyard or YouTube page link into an embeddable URL.
 * @param {string} href The authored video link
 * @returns {string|null} The embed URL, or null when it is not a URL
 */
export function toEmbedUrl(href) {
  let url;
  try {
    url = new URL(href.trim());
  } catch (e) {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'play.vidyard.com' || host.endsWith('.vidyard.com')) {
    const id = url.pathname.split('/').filter(Boolean).pop()?.replace(/\.(html|js)$/, '');
    if (id) return `https://play.vidyard.com/${id}`;
  }
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1);
    if (id) return `https://www.youtube.com/embed/${id}`;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname.startsWith('/embed/')) return url.href;
    const id = url.searchParams.get('v') || url.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
    if (id) return `https://www.youtube.com/embed/${id}`;
  }
  return url.href;
}

/**
 * Infosys video: a 16:9 video next to its title.
 * Rows: [video link] then [title].
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const isUrl = (text) => /^https?:\/\//i.test(text.trim());
  const videoRow = rows.find((row) => row.querySelector('a') || isUrl(row.textContent));
  const titleRow = rows.find((row) => row !== videoRow && row.textContent.trim());

  const link = videoRow?.querySelector('a');
  const href = link ? link.href : (videoRow?.textContent.trim() || '');
  const title = titleRow ? titleRow.textContent.trim() : '';

  const media = document.createElement('div');
  media.className = 'infosys-video-media';
  if (videoRow) moveInstrumentation(videoRow, media);

  const text = document.createElement('div');
  text.className = 'infosys-video-text';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  if (titleRow) {
    const cell = titleRow.querySelector(':scope > div') || titleRow;
    moveInstrumentation(cell.querySelector('h1, h2, h3, h4, h5, h6, p') || cell, h2);
    moveInstrumentation(titleRow, text);
  }
  if (title) text.append(h2);

  block.replaceChildren(media, text);

  const src = href ? toEmbedUrl(href) : null;
  if (!src) return;

  const addIframe = () => {
    if (media.querySelector('iframe')) return;
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = title || 'Video';
    iframe.setAttribute('allow', 'autoplay; fullscreen');
    iframe.setAttribute('loading', 'lazy');
    media.append(iframe);
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        addIframe();
      }
    }, { rootMargin: '300px' });
    observer.observe(block);
  } else {
    addIframe();
  }
}
