/* eslint-disable */
/* global WebImporter */

/**
 * Infosys photo gallery cleanup: the page keeps only the gallery section(s) the template maps
 * (div.section#day2); the header, footer, cookie banner, the other sections and the source's
 * scripts are dropped.
 */
export default function transform(hookName, element, payload) {
  if (hookName !== 'beforeTransform') return;
  const { document } = payload;
  const keep = (payload.template?.sections || [])
    .flatMap((s) => s.selector)
    .map((sel) => document.querySelector(sel))
    .filter(Boolean);
  if (!keep.length) return;

  WebImporter.DOMUtils.remove(element, [
    'header', 'footer', '#onetrust-consent-sdk', 'script', 'style', 'noscript', 'link', 'iframe',
  ]);

  const main = element.querySelector('main') || element;
  const fresh = document.createElement('main');
  keep.forEach((section) => fresh.append(section));
  main.replaceWith(fresh);
  // anything left outside <main> (empty trailing divs, scroll-to-top button)
  [...element.children].filter((child) => child !== fresh).forEach((child) => child.remove());
}
