import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateBlock,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  getMetadata,
  loadBlock,
  waitForFirstImage,
  loadScript,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * The Infosys Confluence pages use the Infosys site's styles, libraries, header and footer (as the
 * Infosys site does under /confluence): pages with the "infosys" template, pages under an
 * /infosys-... folder, and pages with an Infosys block (banner, jumplinks, session, photo-gallery).
 */
const INFOSYS = getMetadata('template') === 'infosys'
  || /\/infosys-[^/]+\//.test(window.location.pathname)
  || !!document.querySelector('main .banner, main .jumplinks, main .session, main .photo-gallery');

/**
 * Creates an element with classes, attributes and an id (the Infosys blocks' helper).
 * @param {string} tag The tag name
 * @param {string[]|null} classes Class names
 * @param {Object|null} attributes Attributes
 * @param {string|null} elementId The id
 * @returns {Element} The element
 */
export function createAemElement(tag, classes, attributes, elementId) {
  const element = document.createElement(tag);
  if (classes) element.classList.add(...classes);
  Object.entries(attributes || {}).forEach(([name, value]) => element.setAttribute(name, value));
  if (elementId) element.id = elementId;
  return element;
}

/**
 * The Infosys pages' scroll-to-top button (from the Infosys site's scripts.js).
 * @param {Element} main The main element
 */
function buildInfosysScrollToTop(main) {
  const button = document.createElement('div');
  button.classList.add('scroll-to-top');
  button.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const img = document.createElement('img');
  img.src = 'https://www.infosys.com/content/dam/infosys-web/en/global-resource/background-image/arrow_up.png';
  img.alt = 'Arrow up';
  img.className = 'img-responsive';
  img.title = 'Scroll top';
  button.append(img);
  window.addEventListener('scroll', () => {
    button.classList.toggle('show', window.scrollY >= 800);
    button.classList.toggle('visible', window.scrollY > 10 && window.innerWidth >= 992);
  });
  main.append(button);
}

/**
 * Loads an Infosys header or footer block into the page's header or footer.
 * @param {Element} region The header or footer element
 * @param {string} blockName The block
 */
async function loadInfosysRegion(region, blockName) {
  const block = buildBlock(blockName, '');
  region.append(block);
  decorateBlock(block);
  return loadBlock(block);
}

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  if (INFOSYS) buildInfosysScrollToTop(main);
  decorateSections(main);
  // a section's "id" metadata is its anchor (AEM authoring renders it as the id already)
  main.querySelectorAll('.section[data-id]').forEach((section) => {
    section.id = section.dataset.id;
  });
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  if (INFOSYS) {
    // the Infosys site's global styles replace this site's
    document.querySelector('head link[rel="stylesheet"][href$="/styles/styles.css"]')?.remove();
    await loadCSS(`${window.hlx.codeBasePath}/styles/infosys.css`);
    await loadScript(`${window.hlx.codeBasePath}/scripts/jquery.js`);
    // Owl Carousel 2.2.1, the version the Infosys site runs (the photo gallery's own copy)
    await loadScript(`${window.hlx.codeBasePath}/blocks/photo-gallery/owl-carousel-min.js`);
  }
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  if (INFOSYS) {
    loadInfosysRegion(doc.querySelector('header'), 'infosys-header');
    loadInfosysRegion(doc.querySelector('footer'), 'infosys-footer');
  } else {
    loadHeader(doc.querySelector('header'));
    loadFooter(doc.querySelector('footer'));
  }

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
