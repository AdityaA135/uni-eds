/* eslint-disable */
// From the Infosys Confluence EDS site: blocks/confluence/jumplinks. Changes: its section is
// "speaker-menu" (the id the styles use) unless the author gave it another id, and the links are
// authored as Jump Link items [link title] [section ID] [goes to section]: they become the
// source's list of links, and the section titled "goes to section" gets the section ID. Only the
// block's own wrapper div is replaced (never its section, when Universal Editor renders it again).
import { createAemElement, moveInstrumentation } from '../../scripts/scripts.js';

const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Gives the section whose title (a heading, or a block's first line, e.g. a gallery title) is
 * the given text the id, unless an element on the page has that id already.
 * @param {string} id The section ID
 * @param {string} title The section's title
 * @param {Element} own The jump links' own section (not a target)
 */
function assignSectionId(id, title, own) {
  if (!id || !title || document.getElementById(id)) return;
  const wanted = normalize(title);
  const section = [...document.querySelectorAll('main .section')].filter((s) => s !== own).find((s) => [
    ...s.querySelectorAll('h1, h2, h3, h4, h5, h6, .gallery-title, .block > div:first-child'),
  ].some((el) => normalize(el.textContent) === wanted));
  if (section) section.id = id;
}

/**
 * Jump Link items [link title] [section ID] [goes to section] -> the source's single cell with a
 * list of links. A block authored as that list already is left as it is.
 * @param {Element} block The block
 */
function itemsToList(block) {
  if (block.querySelector('ul')) return;
  const list = document.createElement('ul');
  [...block.children].forEach((row) => {
    const [label, anchor, target] = [...row.children].map((cell) => cell.textContent.trim());
    if (!label) return;
    const id = (anchor || '').replace(/^#/, '');
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${id}`;
    a.textContent = label;
    li.append(a);
    moveInstrumentation(row, li);
    list.append(li);
    assignSectionId(id, target, block.closest('.section'));
  });
  const cell = document.createElement('div');
  cell.append(list);
  const row = document.createElement('div');
  row.append(cell);
  block.replaceChildren(row);
}

export default function decorate(block) {
  const blockSection = block.closest('.section');
  if (blockSection && !blockSection.id) blockSection.id = 'speaker-menu';
  itemsToList(block);
  const container = document.createElement('div');
  container.innerHTML = block.innerHTML;
  block.innerHTML = '';

  // console.log(container.innerHTML);

  const ulElement = container.children[0].querySelector('div > div > div > ul');
  const article = createAemElement('article', ['container'], null, null);
  const rowDiv = createAemElement('div', ['row'], null, null);
  const innerDiv = createAemElement('div', ['col-md-12', 'col-sm-12', 'col-xs-12'], null, null);
  innerDiv.append(ulElement);
  rowDiv.append(innerDiv);
  article.append(rowDiv);
  block.append(article);
  
  // Add active state functionality
  const jumpLinks = ulElement.querySelectorAll('a');
  
  // Fix bookmark:// links to anchor links
  jumpLinks.forEach(link => {
    let href = link.getAttribute('href');
    if (href) {
      // Handle bookmark:// format
      if (href.startsWith('bookmark://')) {
        href = '#' + href.replace('bookmark://', '');
        link.setAttribute('href', href);
      }
      // Handle https://#anchor or http://#anchor format
      else if (href.includes('://#')) {
        href = href.substring(href.indexOf('#'));
        link.setAttribute('href', href);
      }
    }
  });
  
  // Function to update active link based on current section
  function updateActiveLink() {
    const scrollPosition = window.scrollY + 100; // Add offset for better detection
    let currentSection = null;
    
    jumpLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          const rect = targetElement.getBoundingClientRect();
          const elementTop = rect.top + window.scrollY;
          const elementBottom = elementTop + rect.height;
          
          // Check if element is in viewport
          if (scrollPosition >= elementTop && scrollPosition <= elementBottom) {
            currentSection = link;
          }
        }
      }
    });
    
    // Update active states
    jumpLinks.forEach(link => {
      link.classList.remove('active');
    });
    
    if (currentSection) {
      currentSection.classList.add('active');
    }
  }
  
  // Handle click events
  jumpLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // Remove active class from all links
      jumpLinks.forEach(otherLink => {
        otherLink.classList.remove('active');
      });
      
      // Add active class to clicked link
      this.classList.add('active');
      
      // Allow default scroll behavior for anchor links
    });
  });
  
  // Handle scroll events
  let scrollTimeout;
  window.addEventListener('scroll', function() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateActiveLink, 10);
  });
  
  // Initial check on page load
  setTimeout(updateActiveLink, 100);
  
  // only the block's own wrapper div: when Universal Editor renders the block again it sits in the
  // section, which then has the wrapper class too
  const blockParent = block.parentElement;
  if (blockParent?.classList.contains('jumplinks-wrapper') && !blockParent.classList.contains('section')) {
    blockParent.replaceWith(block);
  }
}
