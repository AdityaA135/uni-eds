/* eslint-disable */
/* global WebImporter */

/**
 * Infosys section transformer.
 *
 * Uses payload.template.sections (tools/importer/page-templates.json):
 *  - beforeTransform: walks sections in reverse and inserts an <hr> section
 *    break before every non-first section while the source section elements
 *    still exist. Sections that need Section Metadata (style and/or anchor) get
 *    a temporary marker on their <hr>; the anchor value is read from the source
 *    section id (partner, day2, day3, day4, networking) so the jump links land
 *    on the right section.
 *  - afterTransform: walks the markers in reverse and inserts a Section Metadata
 *    block (style, anchor) after each marker, then drops the marker attributes.
 *    A temporary <hr> placed before a styled first section is removed.
 */

const MARKER = 'data-excat-section-id';
const STYLE_ATTR = 'data-excat-section-style';
const ANCHOR_ATTR = 'data-excat-section-anchor';

// Sections whose source id becomes the section-metadata "anchor".
const ANCHOR_IDS = ['partner', 'day2', 'day3', 'day4', 'networking'];

function findSectionElement(root, section) {
  const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
  for (const sel of selectors) {
    if (!sel) continue;
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch (e) {
      // invalid selector - try the next one
    }
  }
  return null;
}

export default function transform(hookName, element, payload) {
  const template = payload && payload.template;
  const sections = template && Array.isArray(template.sections) ? template.sections : [];
  if (sections.length < 2) return;

  const doc = element.ownerDocument || element;
  const root = element.querySelector ? element : doc;

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const el = findSectionElement(root, section);
      if (!el) continue;

      const style = section.style || '';
      const sourceId = el.id || '';
      const anchor = ANCHOR_IDS.includes(sourceId) ? sourceId : '';
      const needsMetadata = !!(style || anchor);

      if (i === 0 && !needsMetadata) continue;

      const hr = doc.createElement('hr');
      if (needsMetadata) {
        hr.setAttribute(MARKER, section.id);
        if (style) hr.setAttribute(STYLE_ATTR, style);
        if (anchor) hr.setAttribute(ANCHOR_ATTR, anchor);
      }
      if (i === 0) hr.setAttribute('data-excat-first-section', 'true');
      el.parentNode.insertBefore(hr, el);
    }
  }

  if (hookName === 'afterTransform') {
    const markers = Array.from(root.querySelectorAll(`hr[${MARKER}]`));
    for (let i = markers.length - 1; i >= 0; i -= 1) {
      const hr = markers[i];
      const style = hr.getAttribute(STYLE_ATTR);
      const anchor = hr.getAttribute(ANCHOR_ATTR);
      const cells = {};
      if (style) cells.style = style;
      if (anchor) cells.anchor = anchor;

      const block = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells,
      });
      hr.after(block);

      hr.removeAttribute(MARKER);
      hr.removeAttribute(STYLE_ATTR);
      hr.removeAttribute(ANCHOR_ATTR);
      if (hr.hasAttribute('data-excat-first-section')) {
        // A styled first section gets no break - drop the temporary <hr>.
        hr.remove();
      }
    }
  }
}
