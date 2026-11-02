/* eslint-disable */
// From the Infosys Confluence EDS site: blocks/confluence/session. Change: the Universal Editor
// block's two fields (Video URL, Title) render as two rows; they become the source's one row
// [video] [title], the title an h2. Only the block's own wrapper div is replaced (never its section,
// when Universal Editor renders the block again).
import { createAemElement } from '../../scripts/scripts.js';

function joinAuthoredRows(block) {
  const [videoRow, titleRow] = block.children;
  if (!videoRow || !titleRow || videoRow.children.length !== 1 || titleRow.children.length !== 1) return;
  const titleCell = titleRow.firstElementChild;
  if (!titleCell.querySelector('h1, h2, h3, h4, h5, h6') && titleCell.textContent.trim()) {
    const h2 = document.createElement('h2');
    h2.textContent = titleCell.textContent.trim();
    titleCell.replaceChildren(h2);
  }
  videoRow.append(titleCell);
  titleRow.remove();
}

export default function decorate(block) {
  joinAuthoredRows(block);
  const fragment = document.createDocumentFragment();
  const container = document.createElement('div');
  container.innerHTML = block.innerHTML;
  block.innerHTML = '';
  const getChild = (parent, ...idx) => idx.reduce((el, i) => ((el && el.children && el.children[i]) ? el.children[i] : null), parent);

  function buildSpeakerCard(li) {
    let text = '';
    const firstChild = li.childNodes[0];
    
    if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
      text = firstChild.textContent.trim();
    } else if (firstChild && firstChild.tagName === 'P') {
      text = firstChild.textContent.trim();
      text = text.replace(/,\s*$/, '');
    } else {
      text = li.textContent.split('\n')[0].trim();
    }
    
    
    const liList = li.querySelectorAll('li');
    const imageURL = liList[0]?.innerText || '';
    const speakerDesignation = liList[1]?.innerText || '';
    const speakerLink = liList[2]?.innerText || '';
    
    const card = createAemElement('div', ['col-lg-4', 'col-md-4', 'col-sm-4', 'col-xs-12', 'p-0', 'mb-20'], null, null);
    const anchor = createAemElement('a', ['sp-href'], { title: text, href: speakerLink }, null);
    const detailsDiv = createAemElement('div', ['speaker-details'], null, null);
    const imgDiv = createAemElement('div', ['speaker-img'], null, null);
    const img = createAemElement('img', [], { alt: text, src: imageURL }, null);
    const h5 = document.createElement('h5');
    const bold = document.createElement('b');
    bold.textContent = text;
    const span = document.createElement('span');
    span.className = 'd-block';
    span.textContent = speakerDesignation;
    h5.append(bold, span);
    imgDiv.append(img);
    detailsDiv.append(imgDiv, h5);
    anchor.append(detailsDiv);
    card.append(anchor);
    return card;
  }

  const mainSection = getChild(container, 0);
  const textSection = getChild(mainSection, 0); // First column
  const mediaSection = getChild(mainSection, 1); // Second column
  const detailsSection = getChild(container, 1);
  const peopleSection = getChild(container, 2);

  if (detailsSection && !peopleSection) {
    if (detailsSection.children.length > 1) {
      peopleSection = detailsSection;
      detailsSection = null;
    }
  }

  function hasMediaContent(section) {
    if (!section) return false;
    
    // Check for direct images
    const directImg = section.querySelector('img');
    if (directImg && directImg.src) return true;
    
    // If there's substantial text content (more than 100 characters), treat as text
    const textContent = section.textContent?.trim() || '';
    if (textContent.length > 100) {
      return false; // This is text content, not media
    }
    
    // Otherwise, if there's a link, treat as media
    const mediaAnchor = section.querySelector('a');
    const mediaURL = mediaAnchor ? mediaAnchor.getAttribute('href') : '';
    return mediaURL.length > 0;
  }

  const firstColumnHasMedia = hasMediaContent(textSection);
  const secondColumnHasMedia = hasMediaContent(mediaSection);

  let actualTextContent, actualMediaContent;
  let isMediaInLeftColumn = false;

  if (firstColumnHasMedia && !secondColumnHasMedia) {
    actualMediaContent = textSection;
    actualTextContent = mediaSection;
    isMediaInLeftColumn = true;
  } else if (!firstColumnHasMedia && secondColumnHasMedia) {
    actualTextContent = textSection;
    actualMediaContent = mediaSection;
    isMediaInLeftColumn = false;
  } else {
    actualTextContent = textSection;
    actualMediaContent = mediaSection;
    isMediaInLeftColumn = false;
  }


  const textDiv = createAemElement('div', ['col-lg-6', 'col-md-6', 'col-sm-12', 'col-xs-12', 'mb-30', 'wow', 'fadeInUp', 'animated'], null, null);
  if (actualTextContent) {
    Array.from(actualTextContent.childNodes).forEach((child) => {
      textDiv.appendChild(child.cloneNode(true));
    });
  }

  function isImage(url) {
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
  }

  const mediaDiv = createAemElement('div', ['col-lg-6', 'col-md-6', 'col-sm-12', 'col-xs-12', 'mb-30'], null, null);
  let mediaURL = '';
  let directImage = null;
  
  if (actualMediaContent) {
    // Check for direct image elements first
    const existingImg = actualMediaContent.querySelector('img');
    if (existingImg) {
      directImage = existingImg;
    } else {
      // Check for anchor links
      const mediaAnchor = actualMediaContent.querySelector('a');
      mediaURL = mediaAnchor ? mediaAnchor.getAttribute('href') : '';
    }
  }
  
  if (directImage) {
    // Handle direct image
    const img = createAemElement('img', ['img-responsive'], { 
      src: directImage.src, 
      alt: directImage.alt || '' 
    }, null);
    mediaDiv.append(img);
  } else if (mediaURL) {
    // Handle image and video links
    const isMediaImage = isImage(mediaURL);
    if (isMediaImage) {
      const img = createAemElement('img', ['img-responsive'], { src: mediaURL }, null);
      mediaDiv.append(img);
    } else {
      const videoPlayerContainer = createAemElement('div', ['video-player-container'], null, null);
      const videoPlayerInner = createAemElement('div', ['video-player-inner-container'], null, null);
      const iframe = createAemElement('iframe', [], { src: mediaURL, allow: 'autoplay; fullscreen', allowfullscreen: '' }, null);
      videoPlayerInner.append(iframe);
      videoPlayerContainer.append(videoPlayerInner);
      mediaDiv.append(videoPlayerContainer);
    }
  }

  function isSpeakerModerator(text) {
    const lowerText = text.toLowerCase();
    return /\b(speaker|speakers|moderator|moderators)\b/.test(lowerText);
  }

  let additionalDetailsClasses = ['col-md-12', 'col-sm-12', 'col-xs-12'];
  let hasAdditionalContent = false;
  
  if (detailsSection) {
    const allParagraphs = detailsSection.getElementsByTagName('p');
    const speakerLists = detailsSection.querySelectorAll('ol, ul');
    const h2Headers = detailsSection.querySelectorAll('h2');
    
    let actualContentParagraphs = [];
    Array.from(allParagraphs).forEach(p => {
      let isInsideSpeakerList = false;
      let isSpeakerHeader = false;
      speakerLists.forEach(list => {
        if (list.contains(p)) {
          isInsideSpeakerList = true;
        }
      });
      
      const pText = p.textContent?.trim().toLowerCase() || '';
      if (pText.includes('speaker') || pText.includes('moderator')) {
        isSpeakerHeader = true;
      }
 
      const nextSibling = p.nextElementSibling;
      if (nextSibling && (nextSibling.tagName === 'OL' || nextSibling.tagName === 'UL')) {
        isSpeakerHeader = true;
      }
      const strongElements = p.querySelectorAll('strong');
      if (strongElements.length > 0) {
        const strongText = Array.from(strongElements).map(s => s.textContent.trim().toLowerCase()).join(' ');
        if (strongText.includes('speaker') || strongText.includes('moderator')) {
          isSpeakerHeader = true;
        }
      }

      if (!isInsideSpeakerList && !isSpeakerHeader && pText.length > 0) {
        actualContentParagraphs.push(p);
      }
    });
    if (actualContentParagraphs.length > 0) {
      hasAdditionalContent = true;
      additionalDetailsClasses.push('expandable-content'); // Hide if there's additional content
    } else {
      additionalDetailsClasses.push('showIt'); // Show by default if no additional content
    }
  } else {
    additionalDetailsClasses.push('showIt'); // Show by default if no additional content
  }
  
  const additionalDetails = createAemElement('div', additionalDetailsClasses, null, null);
  
  if (hasAdditionalContent) {
    additionalDetails.appendChild(detailsSection);
  }

  // Moderator and Speaker sections
  function buildPeopleSection(section, label) {
    const wrapper = createAemElement('div', ['col-lg-12', 'col-md-12', 'col-sm-12', 'col-xs-12', 'p-0'], null, null);
    if (section && section.innerHTML.trim() !== '') {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      const h2 = section.querySelector('h2');
      strong.textContent = h2 ? h2.innerText : label;
      p.append(strong);
      wrapper.append(p);
      
      const peopleList = section.querySelectorAll('div > ol > li');
      
      if (peopleList.length === 0) {
        // Try alternative selectors if the standard one doesn't work
        const altPeopleList1 = section.querySelectorAll('ol > li');
        const altPeopleList2 = section.querySelectorAll('li');
        
        if (altPeopleList1.length > 0) {
          altPeopleList1.forEach((person) => {
            wrapper.append(buildSpeakerCard(person));
          });
        } else if (altPeopleList2.length > 0) {
          altPeopleList2.forEach((person) => {
            wrapper.append(buildSpeakerCard(person));
          });
        }
      } else {
        peopleList.forEach((person) => {
          wrapper.append(buildSpeakerCard(person));
        });
      }
    } else {
      console.log(`Debug - buildPeopleSection for ${label}: section is empty or null`);
    }
    return wrapper;
  }
  let moderatorSection = null;
  let speakerSection = null;
  
  if (hasAdditionalContent && peopleSection) {

    moderatorSection = getChild(peopleSection, 0);
    speakerSection = getChild(peopleSection, 1);
  } else if (!hasAdditionalContent && detailsSection) {
    const detailChildren = Array.from(detailsSection.children);
    detailChildren.forEach((child, index) => {
      if (child.innerHTML && (child.innerHTML.includes('Moderator') || child.innerHTML.includes('Moderators'))) {
        moderatorSection = child;
      }
      if (child.innerHTML && (child.innerHTML.includes('Speaker') || child.innerHTML.includes('Speakers'))) {
        speakerSection = child;
      }
    });
  } else if (peopleSection) {
    moderatorSection = getChild(peopleSection, 0);
    speakerSection = getChild(peopleSection, 1);
  }
  
  const moderator = buildPeopleSection(moderatorSection, 'Moderator');
  const speaker = buildPeopleSection(speakerSection, 'Speaker');
  let peopleContainerClasses = ['col-md-12', 'col-sm-12', 'col-xs-12'];
  
  if (hasAdditionalContent) {
    peopleContainerClasses.push('expandable-content'); // Hide if there's additional content to expand
  } else {
    peopleContainerClasses.push('showIt'); // Show by default if no additional content
  }
  
  const peopleContainer = createAemElement('div', peopleContainerClasses, null, null);
  peopleContainer.append(moderator, speaker);

  let hasPeopleContent = false;
  if (peopleSection && peopleSection.innerHTML.trim() !== '') {
    hasPeopleContent = true;
  }
  let readMoreButton = null;
  let readLessButton = null;
  let readLessContainer = null;

  if (hasAdditionalContent) { 
    readMoreButton = createAemElement('a', ['moreless-button'], { 
      href: 'javascript:void(0)',
      style: 'display: inline-block;'
    }, null);
    readMoreButton.textContent = 'Read more';

    readLessButton = createAemElement('a', ['readless-button'], { 
      href: 'javascript:void(0)',
      style: 'display: none;'
    }, null);
    readLessButton.textContent = 'Read less';
    
    // Add Read More button directly to the text div
    const buttonWrapper = createAemElement('div', ['read-more-wrapper'], null, null);
    buttonWrapper.append(readMoreButton);
    textDiv.append(buttonWrapper);

    const readLessClasses = ['col-md-12', 'col-sm-12', 'col-xs-12', 'expandable-content'];
    readLessContainer = createAemElement('div', readLessClasses, null, null);
    readLessContainer.append(readLessButton);
  }

  // Compose main structure
  const innerDiv = createAemElement('div', ['col-md-12', 'col-sm-12', 'col-xs-12', 'mt-50', 'mb-50', 'session-inner-container'], null, null);
  
  // Add content in the exact order it was authored
  if (isMediaInLeftColumn) {
    innerDiv.append(mediaDiv, textDiv);
  } else {
    innerDiv.append(textDiv, mediaDiv);
  }
  innerDiv.append(additionalDetails, peopleContainer);
  if (readLessContainer) {
    innerDiv.append(readLessContainer);
  }

  // Add event listeners after innerDiv is fully constructed
  if (hasAdditionalContent && readMoreButton && readLessButton) {
    readMoreButton.addEventListener('click', () => {
      // Close all other expanded session blocks on the page
      document.querySelectorAll('.session-inner-container').forEach(otherInnerDiv => {
        if (otherInnerDiv !== innerDiv) {
          const otherExpandableContent = otherInnerDiv.querySelectorAll('.expandable-content');
          const otherReadMore = otherInnerDiv.querySelector('.moreless-button');
          const otherReadLess = otherInnerDiv.querySelector('.readless-button');
          
          otherExpandableContent.forEach(el => {
            el.classList.remove('show');
          });
          
          if (otherReadMore) otherReadMore.style.display = 'inline-block';
          if (otherReadLess) otherReadLess.style.display = 'none';
        }
      });
      
      // Show expandable content only within this session block
      innerDiv.querySelectorAll('.expandable-content').forEach(el => {
        el.classList.add('show');
      });

      readMoreButton.style.display = 'none';
      readLessButton.style.display = 'inline-block';
    });

    readLessButton.addEventListener('click', () => {
      // Hide expandable content only within this session block
      innerDiv.querySelectorAll('.expandable-content').forEach(el => {
        el.classList.remove('show');
      });
      readMoreButton.style.display = 'inline-block';
      readLessButton.style.display = 'none';
    });
  }
  
  const rowDiv = createAemElement('div', ['row']);
  rowDiv.append(innerDiv);
  const article = createAemElement('article', ['container']);
  article.append(rowDiv);
  fragment.append(article);
  block.append(fragment);

  // Replace parent
  // only the block's own wrapper div: when Universal Editor renders the block again it sits in the
  // section, which then has the wrapper class too
  const blockParent = block.parentElement;
  if (blockParent?.classList.contains('session-wrapper') && !blockParent.classList.contains('section')) {
    blockParent.replaceWith(block);
  }

  // Add class to h2 if id contains 'image'
  document.querySelectorAll('.session-container').forEach((div) => {
    const id = div.id || '';
    if (id.includes('image')) {
      const h2 = div.querySelector('h2');
      if (h2) {
        h2.classList.add('h2-head');
      }
    }
  });
}
