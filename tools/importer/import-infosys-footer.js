/* eslint-disable */
/* global WebImporter */

/**
 * Import script for the "infosys-footer" template: the Infosys Confluence footer page, imported
 * from its authored content (footer.plain.html) into this project's "infosys-poc" folder as
 * "footer". It holds one infosys-footer block. Images keep their source URLs here;
 * tools/importer/localize-infosys-assets.mjs then moves them to /content/dam/uni-eds/infosys-assets/.
 */

import infosysFooterParser from './parsers/infosys-footer.js';

const PAGE_TEMPLATE = {
  name: 'infosys-footer',
  urls: [
    'https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/footer.plain.html',
  ],
  description: 'Infosys Confluence footer page (authored content, imported as its .plain.html): one infosys-footer block',
  blocks: [
    { name: 'infosys-footer', instances: ['.footer'] },
  ],
  sections: [],
};

// the folder the imported page goes to in this project
const TARGET_FOLDER = ['', 'infosys-poc'].join('/');

const parsers = {
  'infosys-footer': infosysFooterParser,
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

    // footer.plain.html -> footer, in this project's folder
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
