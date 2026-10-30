/* eslint-disable */
/* global WebImporter */

/**
 * Import script for the "infosys-nav" template: the Infosys Confluence nav page, imported from
 * its authored content (nav.plain.html) into this project's "infosys-poc" folder as "nav". It
 * holds one infosys-header block. Images keep their source URLs here;
 * tools/importer/localize-infosys-assets.mjs then moves them to /content/dam/uni-eds/infosys-assets/.
 */

import infosysHeaderParser from './parsers/infosys-header.js';

const PAGE_TEMPLATE = {
  name: 'infosys-nav',
  urls: [
    'https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/nav.plain.html',
  ],
  description: 'Infosys Confluence nav page (authored content, imported as its .plain.html): one infosys-header block',
  blocks: [
    { name: 'infosys-header', instances: ['.header'] },
  ],
  sections: [],
};

// the folder the imported page goes to in this project
const TARGET_FOLDER = ['', 'infosys-poc'].join('/');

const parsers = {
  'infosys-header': infosysHeaderParser,
};

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

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // nav.plain.html -> nav, in this project's folder
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.plain\.html$/, '')
      .replace(/\.html?$/, '');
    const pageName = rawPath.split('/').filter(Boolean).pop() || 'index';
    const path = WebImporter.FileUtils.sanitizePath(`${TARGET_FOLDER}/${pageName}`);

    return [{
      element: main,
      path,
      report: { title: pageName, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
