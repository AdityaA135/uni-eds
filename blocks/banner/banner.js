/* eslint-disable */
// From the Infosys Confluence EDS site: blocks/confluence/banner. Change: the colour is read as
// text (AEM authoring renders a "#df9926" value as a link).
import { createOptimizedPicture } from '../../scripts/aem.js';
import { createAemElement } from '../../scripts/scripts.js';

export default function decorate(block) {
    //console.log(block);
    const container = document.createElement('div');
    container.innerHTML = block.innerHTML;
    block.innerHTML = '';

    const col = document.createElement('div');
    const h1 = container.querySelector('h1');
    const paragraphs = container.querySelectorAll('p');
    const hasImg= container.querySelector('img') !== null;
    const hasBreadCrumbList = container.querySelectorAll('ul li');
    
    // Find background color paragraph (starts with #) and breadcrumb paragraph (contains /)
    let backgroundColorP = null;
    let breadcrumbParagraph = null;
    let hasBreadcrumbText = false;
    
    paragraphs.forEach(p => {
        const text = p.textContent.trim();
        if (text.startsWith('#')) {
            backgroundColorP = p;
        } else if (text.includes('/') && !text.startsWith('#')) {
            breadcrumbParagraph = p;
            hasBreadcrumbText = true;
        }
    });
    
    const hasP = backgroundColorP !== null;

    const heading = createAemElement('h1', ['h2-head'], null, null);
    heading.innerHTML = h1.innerHTML.trim();

    const section = createAemElement('section', null, null, null);

    if (hasP) {
        section.id = 'speaker_bg';
        //console.log("Background Color:", backgroundColorP.innerHTML);
        section.style.backgroundColor = backgroundColorP.textContent.trim();
        
        // Check heading length and apply appropriate column classes
        const headingText = h1.innerHTML.trim();
        if (headingText.length > 10) {
            col.classList.add('col-lg-7', 'col-md-7', 'col-sm-12', 'col-xs-12', 'bg_margin');
        } else {
            col.classList.add('col-lg-12', 'col-md-12', 'col-sm-12', 'col-xs-12', 'bg_margin');
        }
        
        heading.classList.add('speaker-title');
    }
    if (hasImg) {
        section.classList.add('insight-hero', 'bg-sapphire-dark');
        // Optimize and append the image
        const imageToBeOptimized = container.querySelector('picture').querySelector('img').getAttribute('src');
        const bannerImgOptimized = createOptimizedPicture(imageToBeOptimized, 'EMEA Confuence', true, [{ width: '2048' }]);
        bannerImgOptimized.querySelector('img').classList.add('insight-banner-image');
        bannerImgOptimized.querySelector('img').setAttribute('fetchpriority', 'high');        
        bannerImgOptimized.querySelector('img').setAttribute('width', '1693');
        bannerImgOptimized.querySelector('img').setAttribute('height', '617');
        section.appendChild(bannerImgOptimized);
        col.classList.add('col-lg-8', 'col-md-8', 'col-sm-8', 'col-xs-12', 'wow', 'fadeInDown', 'animated');
        col.setAttribute('data-wow-delay', '0.2s');
        col.setAttribute('style', 'visibility: visible;-webkit-animation-delay: 0.2s; -moz-animation-delay: 0.2s; animation-delay: 0.2s; transform: translateY(0px)');
        heading.classList.add('mb-30');
        heading.classList.add('heading-align');
    }
    // Handle breadcrumbs from ul li structure or paragraph text
    if (hasBreadCrumbList && hasBreadCrumbList.length > 0) {
        const breadcrumb = document.createElement('ol');
        breadcrumb.className = 'hero-bread breadcrumb color-white';

        hasBreadCrumbList.forEach(item => {
            const li = document.createElement('li');
            li.className = 'hero-bread-item breadcrumb-item';

            const span = document.createElement('span');
            span.textContent = item.textContent;
            span.className = 'breadcrumb-href';

            li.appendChild(span);
            breadcrumb.appendChild(li);
        });

        col.append(breadcrumb);
    } else if (hasBreadcrumbText) {
        // Handle breadcrumbs from paragraph text format (e.g., "2024 / Melbourne / Australia")
        const breadcrumb = document.createElement('ol');
        breadcrumb.className = 'hero-bread breadcrumb';
        
        const breadcrumbText = breadcrumbParagraph.textContent.trim();
        const breadcrumbItems = breadcrumbText.split('/').map(item => item.trim());
        
        breadcrumbItems.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'hero-bread-item breadcrumb-item';
            
            const span = document.createElement('span');
            span.textContent = item;
            
            li.appendChild(span);
            breadcrumb.appendChild(li);
        });
        
        col.append(breadcrumb);
        //console.log('Breadcrumbs created from paragraph:', breadcrumbText);
    }
    

    // Create the container div
    const contain = createAemElement('div', ['container'], null, null);

    // Create the row div
    const row = createAemElement('div', ['row'], null, null);
    col.append(heading);
    row.appendChild(col);

    // Append the row to the container
    contain.appendChild(row);

    // Append the container to the main div
    section.appendChild(contain);

    block.append(section);
}