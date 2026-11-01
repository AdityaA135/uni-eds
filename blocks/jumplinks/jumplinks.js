/* eslint-disable */
// From the Infosys Confluence EDS site: blocks/confluence/jumplinks. Change: its section is
// "speaker-menu" (the id the styles use) unless the author gave it another id.
import { createAemElement } from '../../scripts/scripts.js';

export default function decorate(block) {
  const blockSection = block.closest('.section');
  if (blockSection && !blockSection.id) blockSection.id = 'speaker-menu';
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
  
  const blockParent = document.querySelector('.jumplinks-wrapper');
  blockParent.parentElement.replaceChild(block, blockParent);
}
