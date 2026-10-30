/* eslint-disable */
/* global WebImporter */

/**
 * Import script for the "infosys-photo-gallery" template: the Infosys Confluence photo gallery
 * (https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/photo-gallery),
 * imported into this project's "infosys-poc" folder under the source page's name.
 * Images keep their source URLs here; tools/importer/localize-infosys-assets.mjs then moves them
 * to the DAM folder /content/dam/uni-eds/infosys-assets/ (run it after each import).
 */

import infosysBannerParser from './parsers/infosys-banner.js';
import infosysJumplinksParser from './parsers/infosys-jumplinks.js';
import infosysVideoParser from './parsers/infosys-video.js';
import infosysPhotoGalleryParser from './parsers/infosys-photo-gallery.js';
import infosysCleanupTransformer from './transformers/infosys-cleanup.js';
import infosysSectionsTransformer from './transformers/infosys-sections.js';

const PAGE_TEMPLATE = {
  name: 'infosys-photo-gallery',
  urls: [
    'https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/photo-gallery',
  ],
  representativeUrl: 'https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/photo-gallery',
  description: 'Infosys Americas Confluence 2026 photo gallery: colour banner, jump links, highlights video, photo galleries per day',
  blocks: [
    { name: 'infosys-banner', instances: ['.banner-wrapper'] },
    { name: 'infosys-jumplinks', instances: ['.jumplinks'] },
    { name: 'infosys-video', instances: ['.session'] },
    { name: 'infosys-photo-gallery', instances: ['.photo-gallery-wrapper'] },
  ],
  urlPattern: '/confluence/2026/us/*',
  sections: [
    {
      id: 'section-1', name: 'Highlights banner', selector: ['div.section.banner-container'], style: null, blocks: ['infosys-banner'], defaultContent: [],
    },
    {
      id: 'section-2', name: 'Jump links', selector: ['div.section#speaker-menu', 'div.section.jumplinks-container'], style: 'light-grey', blocks: ['infosys-jumplinks'], defaultContent: [],
    },
    {
      id: 'section-3', name: 'Highlights video', selector: ['div.section#video', 'div.section.session-container'], style: 'light-grey', blocks: ['infosys-video'], defaultContent: [],
    },
    {
      id: 'section-4', name: 'Photo gallery - Partners, Analysts & Advisors Day', selector: ['div.section#partner', 'main > div.section.photo-gallery-container:nth-of-type(4)'], style: null, blocks: ['infosys-photo-gallery'], defaultContent: [],
    },
    {
      id: 'section-5', name: 'Photo gallery - Confluence Day 1', selector: ['div.section#day2', 'main > div.section.photo-gallery-container:nth-of-type(5)'], style: null, blocks: ['infosys-photo-gallery'], defaultContent: [],
    },
    {
      id: 'section-6', name: 'Photo gallery - Confluence Day 2', selector: ['div.section#day3', 'main > div.section.photo-gallery-container:nth-of-type(6)'], style: null, blocks: ['infosys-photo-gallery'], defaultContent: [],
    },
    {
      id: 'section-7', name: 'Photo gallery - Confluence Day 3', selector: ['div.section#day4', 'main > div.section.photo-gallery-container:nth-of-type(7)'], style: null, blocks: ['infosys-photo-gallery'], defaultContent: [],
    },
    {
      id: 'section-8', name: 'Photo gallery - Networking & Living Labs Walkthrough', selector: ['div.section#networking', 'main > div.section.photo-gallery-container:nth-of-type(8)'], style: null, blocks: ['infosys-photo-gallery'], defaultContent: [],
    },
  ],
};

// the folder the imported pages go to in this project, and their page metadata
const TARGET_FOLDER = ['', 'infosys-poc'].join('/');
const PAGE_METADATA = {
  template: 'infosys',
  nav: `${TARGET_FOLDER}/nav`,
  footer: `${TARGET_FOLDER}/footer`,
};

const parsers = {
  'infosys-banner': infosysBannerParser,
  'infosys-jumplinks': infosysJumplinksParser,
  'infosys-video': infosysVideoParser,
  'infosys-photo-gallery': infosysPhotoGalleryParser,
};

// cleanup first, then the section breaks and section metadata
const transformers = [infosysCleanupTransformer, infosysSectionsTransformer];

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

/** the page metadata: the source page's title, plus this project's template, nav and footer */
function createMetadata(main, document) {
  const meta = {};
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const title = (ogTitle || document.title || '').trim();
  if (title) meta.Title = title;
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
  if (description) meta.Description = description;
  Object.assign(meta, PAGE_METADATA);
  main.append(WebImporter.Blocks.getMetadataBlock(document, meta));
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    const headTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title;

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
    createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // the source page's name, in this project's folder (e.g. photo-gallery)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const pageName = rawPath.split('/').filter(Boolean).pop() || 'index';
    const path = WebImporter.FileUtils.sanitizePath(`${TARGET_FOLDER}/${pageName}`);

    return [{
      element: main,
      path,
      report: { title: headTitle, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
