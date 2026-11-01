/* eslint-disable */
// From the Infosys Confluence EDS site: blocks/confluence/photo-gallery. Changes: the popup
// photos are read from the topic's third cell (Universal Editor renders a multi-image field as
// a list), the block stays in the page (so the editor can select it and its topics), and the
// libraries load from this block's folder.
import { moveInstrumentation } from '../../scripts/scripts.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(src);
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export default function decorate(block) {

  const dayClass = Array.from(block.classList).find(cls => /^day\d+$/.test(cls));
  const sectionId = dayClass || 'default';
  const section = document.createElement('section');
  section.id = 'photo_gallery';
  section.classList.add('pt-0');

  const article = document.createElement('article');
  article.classList.add('container');

  const row = document.createElement('div');
  row.classList.add('row');
  row.id = sectionId;

  const cards = [...block.children];

  // Title
  const titleDiv = document.createElement('div');
  titleDiv.className = 'col-md-12 col-sm-12 col-xs-12 title-bg mt-md-0';
  const titleText = cards[0]?.querySelector('p')?.textContent || 'Gallery';
  titleDiv.innerHTML = `<p class="gallery-title">${titleText}</p>`;
  row.appendChild(titleDiv);

  // Carousel container
  const carouselContainer = document.createElement('div');
  carouselContainer.className = 'col-md-12 col-sm-12 col-xs-12';
  const carousel = document.createElement('div');
  carousel.className = 'owl-carousel owl-theme list_slider_carousel';

  const modals = [];

  for (let i = 1; i < cards.length; i++) {
    const card = cards[i];
    const title = card.querySelector('div > p')?.textContent?.trim() || `Slide ${i}`;
    const coverImg = card.querySelector('picture img')?.getAttribute('src') || '';
    const modalId = `${sectionId}_${i}`;

    // Carousel Slide
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
        <a href="javascript:void(0);" data-bs-toggle="modal" data-bs-target="#${modalId}">
          <div class="list_slider_caption">
            <img src="${coverImg}" alt="Slider image" class="img-responsive">
            <h2 class="h2">${title}</h2>
          </div>
        </a>
      `;
    moveInstrumentation(card, item);
    carousel.appendChild(item);

    // Modal
    const modal = document.createElement('div');
    modal.className = 'modal fade1 list_slider_modal';
    modal.id = modalId;
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'myModalLabel');

    
    const modalPictures = card.children[2]?.querySelectorAll('picture') || [];

    const modalImages = Array.from(modalPictures).map(pic => {
    const img = pic.querySelector('img');
      return `<div class="item">${img?.outerHTML || ''}</div>`;
    }).join('');

    modal.innerHTML = `
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-body">
            <button type="button" class="close" data-bs-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
            <div class="owl-carousel owl-theme list_slider_carousel_modal">
              ${modalImages}
            </div>
            <div class="list_slider_modal_caption">
              <h2 class="h2" style="margin-bottom: 0px !important;">${title}</h2>
            </div>
          </div>
        </div>
      </div>
    `;
    modals.push(modal);
  }

  carouselContainer.appendChild(carousel);
  row.appendChild(carouselContainer);
  article.appendChild(row);
  section.appendChild(article);

  // Replace the block's rows with the new section, the modals after it
  block.replaceChildren(section, ...modals);

  loadScript(`${window.hlx.codeBasePath}/blocks/photo-gallery/owl-carousel-min.js`);
  loadScript(`${window.hlx.codeBasePath}/blocks/photo-gallery/bootstrap.min.js`);
  loadScript(`${window.hlx.codeBasePath}/blocks/photo-gallery/photo-gallery-slider.js`);
}

