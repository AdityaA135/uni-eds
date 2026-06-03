export default function decorate(block) {
// =========================
// CONTROLS
// =========================

const controlsText =
block.querySelector('[data-aue-prop="controlsText"]')
?.textContent
?.trim() || 'Play,Pause';

const [playLabel, pauseLabel] = controlsText.split(',');

const playText = playLabel?.trim() || 'Play';

const pauseText = pauseLabel?.trim() || 'Pause';

// =========================
// SLIDES
// =========================

const slideNodes = [
...block.querySelectorAll(
'[data-aue-model="dell-hero-slide"]',
),
];

const slides = slideNodes.map((slideNode) => ({
image:
slideNode.querySelector(
'[data-aue-prop="desktopImage"] img',
)?.src || '',


mobileImage:
  slideNode.querySelector(
    '[data-aue-prop="mobileImage"] img',
  )?.src || '',

eyebrow:
  slideNode.querySelector(
    '[data-aue-prop="eyebrow"]',
  )?.textContent?.trim() || '',

title:
  slideNode.querySelector(
    '[data-aue-prop="title"]',
  )?.textContent?.trim() || '',

description:
  slideNode.querySelector(
    '[data-aue-prop="description"]',
  )?.textContent?.trim() || '',

primaryText:
  slideNode.querySelector(
    '[data-aue-prop="primaryText"]',
  )?.textContent?.trim() || '',

primaryLink:
  slideNode.querySelector(
    '[data-aue-prop="primaryLink"] a',
  )?.href || '',

secondaryText:
  slideNode.querySelector(
    '[data-aue-prop="secondaryText"]',
  )?.textContent?.trim() || '',

secondaryLink:
  slideNode.querySelector(
    '[data-aue-prop="secondaryLink"] a',
  )?.href || '',

theme:
  slideNode.querySelector(
    '[data-aue-prop="theme"]',
  )?.textContent?.trim() || 'dark',


}));

// CLEAR ORIGINAL UE MARKUP

block.textContent = '';

// =========================
// MAIN CAROUSEL
// =========================

const carousel = document.createElement('section');

carousel.className = 'hero-carousel-dell-hero-block';

slides.forEach((slide, index) => {
const slideEl = document.createElement('div');


slideEl.className = `
  hero-slide-dell-hero-block
  ${index === 0 ? 'active' : ''}
  ${


slide.theme === 'light'
? 'light-theme-dell-hero-block'
: 'dark-theme-dell-hero-block'
}
`;


slideEl.innerHTML = `
  <div class="hero-content-dell-hero-block">

    <p class="eyebrow-dell-hero-block">
      ${slide.eyebrow || ''}
    </p>

    <h1 class="title-dell-hero-block">
      ${slide.title || ''}
    </h1>

    <p class="desc-dell-hero-block">
      ${slide.description || ''}
    </p>

    <div class="btn-wrap-dell-hero-block">

      ${


slide.primaryText
? `               <a
                href="${slide.primaryLink || '#'}"
                class="primary-btn-dell-hero-block"               >
                ${slide.primaryText}               </a>
            `
: ''
}


      ${


slide.secondaryText
? `               <a
                href="${slide.secondaryLink || '#'}"
                class="outline-btn-dell-hero-block"               >
                ${slide.secondaryText}               </a>
            `
: ''
}


    </div>

  </div>

  <div class="hero-image-dell-hero-block">
    <picture>

      ${slide.mobileImage
? `
        <source
          media="(max-width: 1023px)"
          srcset="${slide.mobileImage}"
        />
      `
: ''}

      <img
        src="${slide.image}"
        alt="${slide.title || 'Hero Banner'}"
      />

    </picture>
  </div>
`;

carousel.append(slideEl);


});

// =========================
// CONTROLS UI
// =========================

const controls = document.createElement('div');

controls.className = 'carousel-controls-dell-hero-block';

controls.innerHTML = ` <div class="controls-group-dell-hero-block">


  <button class="nav-btn-dell-hero-block prev-dell-hero-block">
    &#8592;
  </button>

  <div class="slide-count-dell-hero-block">
    <span class="current-slide-dell-hero-block">
      1
    </span>/${slides.length}
  </div>

  <button class="nav-btn-dell-hero-block next-dell-hero-block">
    &#8594;
  </button>

</div>

<button class="pause-btn-dell-hero-block">
  ${pauseText} ||
</button>


`;

carousel.append(controls);

block.append(carousel);

// =========================
// CAROUSEL LOGIC
// =========================

const heroSlides = block.querySelectorAll(
'.hero-slide-dell-hero-block',
);

const nextBtn = block.querySelector(
'.next-dell-hero-block',
);

const prevBtn = block.querySelector(
'.prev-dell-hero-block',
);

const currentSlideText = block.querySelector(
'.current-slide-dell-hero-block',
);

const pauseBtn = block.querySelector(
'.pause-btn-dell-hero-block',
);

let currentSlide = 0;

let autoPlay = true;

function showSlide(index) {
heroSlides.forEach((slide) => {
slide.classList.remove('active');
});


heroSlides[index].classList.add('active');

currentSlideText.textContent = index + 1;


}

function nextSlide() {
currentSlide += 1;


if (currentSlide >= heroSlides.length) {
  currentSlide = 0;
}

showSlide(currentSlide);


}

function prevSlide() {
currentSlide -= 1;


if (currentSlide < 0) {
  currentSlide = heroSlides.length - 1;
}

showSlide(currentSlide);


}

nextBtn.addEventListener('click', nextSlide);

prevBtn.addEventListener('click', prevSlide);

setInterval(() => {
if (autoPlay) {
nextSlide();
}
}, 5000);

pauseBtn.addEventListener('click', () => {
autoPlay = !autoPlay;
pauseBtn.textContent = autoPlay
  ? `${pauseText} ||`
  : `${playText} ▶`;

});
}
