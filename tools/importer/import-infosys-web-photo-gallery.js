/* eslint-disable */
/* global WebImporter */

import photoGalleryParser from './parsers/photo-gallery.js';
import infosysWebCleanupTransformer from './transformers/infosys-web-cleanup.js';

const PAGE_TEMPLATE = {
  name: 'infosys-web-photo-gallery',
  urls: [
    'https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/photo-gallery',
  ],
  description: 'Infosys Confluence photo gallery: the Day 1 gallery section (#day2) as one photo-gallery block, imported to /infosys-web/photo-gallery',
  blocks: [
    {
      name: 'photo-gallery',
      instances: ['div.section#day2 .photo-gallery-wrapper'],
    },
  ],
  sections: [
    {
      id: 'day2',
      name: 'Confluence Day 1 photo gallery',
      selector: ['div.section#day2'],
      style: null,
      blocks: ['photo-gallery'],
      defaultContent: [],
    },
  ],
};

// the page's place in the uni-eds site, whatever the source path
const TARGET_PATH = '/infosys-web/photo-gallery';

const parsers = { 'photo-gallery': photoGalleryParser };
const transformers = [infosysWebCleanupTransformer];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try { fn(hookName, element, enhancedPayload); }
    catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
  });
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    executeTransformers('afterTransform', main, payload);

    main.appendChild(document.createElement('hr'));
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    return [{
      element: main,
      path: WebImporter.FileUtils.sanitizePath(TARGET_PATH),
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
