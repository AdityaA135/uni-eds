/* eslint-disable */
/* global WebImporter */

/**
 * Infosys (Confluence) cleanup transformer.
 *
 * Removes non-authorable chrome captured from
 * https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/photo-gallery
 * (selectors taken from migration-work/cleaned.html):
 *  - header.header-wrapper (nav.navbar, .hamburger-menu-right)
 *  - footer.footer-wrapper
 *  - OneTrust cookie banner (#onetrust-consent-sdk, #onetrust-*, .ot-*)
 *  - scroll-to-top button (div.scroll-to-top.section / .scroll-up) inside main
 *  - empty trailing div.section wrappers at the end of main
 *  - tracking iframes / pixels (demdex, company-target, rlcdn) and
 *    script/style/noscript/link nodes
 * The Vidyard iframe inside #video .session is kept (parsed by infosys-video).
 */

const CHROME_SELECTORS = [
  'header.header-wrapper',
  'header',
  'nav.navbar',
  '.hamburger-menu-right',
  'footer.footer-wrapper',
  'footer',
  '.footer-wrapper',
  '#onetrust-consent-sdk',
  '[id^="onetrust-"]',
  '[class^="ot-"]',
  '[class*=" ot-"]',
  '.scroll-to-top',
  '.scroll-up',
  '#db_lr_pixel_ad',
  'img[src*="demdex.net"]',
  'img[src*="rlcdn.com"]',
  'img[src*="company-target.com"]',
];

function isAuthorableIframe(iframe) {
  const src = iframe.getAttribute('src') || '';
  return /vidyard\.com/i.test(src) && !!iframe.closest('#video .session, .session');
}

function isEmptySection(el) {
  if (el.querySelector('img, picture, video, iframe, a, h1, h2, h3, h4, h5, h6, p, li')) return false;
  return (el.textContent || '').replace(/ /g, ' ').trim() === '';
}

function removeComments(root) {
  const doc = root.ownerDocument || root;
  const walker = doc.createTreeWalker(root, 128 /* NodeFilter.SHOW_COMMENT */);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((c) => c.remove());
}

export default function transform(hookName, element, payload) {
  if (hookName === 'beforeTransform') {
    const root = element.ownerDocument ? element.ownerDocument : element;
    const scope = root.body || element;

    // Source HTML comments (commented-out tracking scripts, pixel markers).
    // Only safe here: in afterTransform comments carry XWalk field hints.
    removeComments(scope);

    WebImporter.DOMUtils.remove(scope, CHROME_SELECTORS);

    // Scripts, styles and other non-content nodes.
    WebImporter.DOMUtils.remove(scope, ['script', 'style', 'noscript', 'link', 'meta']);

    // Tracking iframes (Adobe ID sync, company-target, OneTrust resize) -
    // keep the Vidyard player inside the highlights video section.
    scope.querySelectorAll('iframe').forEach((iframe) => {
      if (!isAuthorableIframe(iframe)) iframe.remove();
    });

    // Empty trailing div.section wrappers at the end of main.
    const main = scope.querySelector('main') || scope;
    let last = main.lastElementChild;
    while (last && last.matches('div.section') && isEmptySection(last)) {
      const prev = last.previousElementSibling;
      last.remove();
      last = prev;
    }
  }

  if (hookName === 'afterTransform') {
    const root = element.ownerDocument ? element.ownerDocument : element;
    const scope = root.body || element;

    // Anything chrome-like that slipped through, plus leftover non-content nodes.
    WebImporter.DOMUtils.remove(scope, [
      'header',
      'footer',
      '#onetrust-consent-sdk',
      '.scroll-to-top',
      '.scroll-up',
      'script',
      'style',
      'noscript',
      'link',
    ]);

    // Strip tracking / framework attributes from remaining elements.
    scope.querySelectorAll('[onclick], [data-track], [data-analytics], [data-aue-resource]').forEach((el) => {
      ['onclick', 'data-track', 'data-analytics'].forEach((a) => el.removeAttribute(a));
    });
  }
}
