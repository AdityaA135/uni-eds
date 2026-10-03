const MAX_CARDS = 3;
const MAX_MODULES = 4;
const SLIDE_CHANGE_DURATION = 260;

/**
 * Return direct children of an element.
 */
function getChildren(element) {
  return Array.from(element?.children || []);
}

/**
 * Return trimmed text.
 */
function getText(element) {
  return element?.textContent?.trim() || '';
}

/**
 * Return numeric value.
 */
function getNumber(element) {
  const value = Number.parseFloat(getText(element));

  return Number.isFinite(value) ? value : null;
}

/**
 * Read an authored image/reference field.
 *
 * Universal Editor reference fields can result in an image
 * element or a link depending on the generated semantic HTML.
 */
function getReference(element) {
  if (!element) return '';

  const image = element.querySelector('img');

  if (image?.src) {
    return image.src;
  }

  const link = element.querySelector('a');

  if (link?.href) {
    return link.href;
  }

  return getText(element);
}

/**
 * Get the actual field elements from an authored item.
 */
function getFieldElements(element) {
  return getChildren(element);
}

/**
 * Read one module from the Modules multifield.
 *
 * Module model:
 *
 * Title
 * Description
 * X Position
 * Y Position
 */
function readModule(moduleElement) {
  const fields = getFieldElements(moduleElement);

  return {
    title: getText(fields[0]),
    description: getText(fields[1]),
    x: getNumber(fields[2]),
    y: getNumber(fields[3]),
  };
}

/**
 * Determine whether an element looks like a Modules multifield
 * container.
 *
 * The authored structure is:
 *
 * Card
 * ├── Title
 * ├── Description
 * ├── Thumbnail
 * ├── Motor Image
 * └── Modules
 */
function isModulesContainer(element) {
  if (!element) return false;

  return (
    element.dataset?.aueProp === 'modules'
    || element.classList?.contains('modules')
    || element.classList?.contains('nev-tech-card-modules')
  );
}

/**
 * Read a NEV Tech Card.
 *
 * Card model:
 *
 * Title
 * Description
 * Thumbnail
 * Motor Image
 * Modules (multi-field)
 */
function readCard(cardElement) {
  const children = getChildren(cardElement);

  /*
   * The first four direct children represent:
   *
   * 0 = Title
   * 1 = Description
   * 2 = Thumbnail
   * 3 = Motor Image
   */
  const fields = children.slice(0, 4);

  /*
   * The fifth child is the Modules multifield container.
   */
  let modulesContainer = children[4];

  /*
   * Prefer an explicitly identified modules container if
   * Universal Editor provides data-aue-prop/class information.
   */
  const identifiedModulesContainer = children.find(isModulesContainer);

  if (identifiedModulesContainer) {
    modulesContainer = identifiedModulesContainer;
  }

  /*
   * Each direct child of the Modules container represents
   * one complete module entry.
   */
  const moduleElements = modulesContainer
    ? getChildren(modulesContainer).slice(0, MAX_MODULES)
    : [];

  return {
    title: getText(fields[0]),
    description: getText(fields[1]),
    thumbnail: getReference(fields[2]),
    image: getReference(fields[3]),
    modules: moduleElements
      .map(readModule)
      .filter((module) => (
        module.title
        || module.description
        || module.x !== null
        || module.y !== null
      )),
  };
}

/**
 * Determine whether an element is a NEV Tech Card.
 */
function isCard(element) {
  return (
    element?.classList?.contains('nev-tech-card')
    || element?.dataset?.blockName === 'nev-tech-card'
  );
}

/**
 * Read the complete NEV Tech authored data.
 *
 * Structure:
 *
 * NEV Tech
 * ├── Title
 * ├── Card
 * ├── Card
 * └── Card
 */
function readBlockData(block) {
  const children = getChildren(block);

  /*
   * First authored field is the main NEV Tech title.
   */
  const titleElement = children.find(
    (child) => !isCard(child),
  );

  /*
   * Cards are direct child blocks.
   */
  const cardElements = children
    .filter(isCard)
    .slice(0, MAX_CARDS);

  return {
    title: getText(titleElement),
    cards: cardElements
      .map(readCard)
      .filter(
        (card) => card.title || card.image,
      ),
  };
}

/**
 * Create the interactive visual UI.
 */
function createUI(block) {
  const ui = document.createElement('div');

  ui.className = 'nev-tech__ui';

  ui.innerHTML = `
    <div class="nev-tech__content">

      <h2 class="nev-tech__headline"></h2>

      <div class="nev-tech__details">

        <div class="nev-tech__counter"></div>

        <h3 class="nev-tech__title"></h3>

        <p class="nev-tech__description"></p>

        <div
          class="nev-tech__thumbnails"
          aria-label="Technology options"
        ></div>

      </div>

    </div>

    <div class="nev-tech__visual">

      <div class="nev-tech__stage">

        <div class="nev-tech__image-wrap">

          <img
            class="nev-tech__main-image"
            alt=""
          />

        </div>

        <div class="nev-tech__hotspots"></div>

      </div>

    </div>
  `;

  block.appendChild(ui);

  return {
    ui,
    headline: ui.querySelector(
      '.nev-tech__headline',
    ),
    counter: ui.querySelector(
      '.nev-tech__counter',
    ),
    title: ui.querySelector(
      '.nev-tech__title',
    ),
    description: ui.querySelector(
      '.nev-tech__description',
    ),
    thumbnails: ui.querySelector(
      '.nev-tech__thumbnails',
    ),
    imageWrap: ui.querySelector(
      '.nev-tech__image-wrap',
    ),
    mainImage: ui.querySelector(
      '.nev-tech__main-image',
    ),
    hotspots: ui.querySelector(
      '.nev-tech__hotspots',
    ),
  };
}

/**
 * Main block decoration.
 */
export default function decorate(block) {
  const data = readBlockData(block);

  /*
   * Nothing to render if no cards have been authored.
   */
  if (!data.cards.length) {
    return;
  }

  const ui = createUI(block);

  let activeIndex = 0;
  let openHotspot = null;

  /**
   * Close currently open hotspot.
   */
  function closePopover() {
    if (!openHotspot) {
      return;
    }

    const button = openHotspot.querySelector(
      '.nev-tech__hotspot',
    );

    const popover = openHotspot.querySelector(
      '.nev-tech__popover',
    );

    button?.classList.remove('is-open');

    button?.setAttribute(
      'aria-expanded',
      'false',
    );

    popover?.classList.remove('is-open');

    openHotspot = null;
  }

  /**
   * Render thumbnails.
   */
  function renderThumbnails() {
    ui.thumbnails.innerHTML = '';

    data.cards.forEach((card, index) => {
      if (!card.thumbnail) {
        return;
      }

      const button = document.createElement('button');

      button.type = 'button';

      button.className =
        'nev-tech__thumbnail';

      button.setAttribute(
        'aria-label',
        `Show ${card.title || `slide ${index + 1}`}`,
      );

      button.setAttribute(
        'aria-pressed',
        String(index === activeIndex),
      );

      if (index === activeIndex) {
        button.classList.add('is-active');
      }

      const image = document.createElement('img');

      image.src = card.thumbnail;

      image.alt = '';

      button.appendChild(image);

      button.addEventListener(
        'click',
        () => {
          selectSlide(index);
        },
      );

      ui.thumbnails.appendChild(button);
    });
  }

  /**
   * Render hotspots for the active card.
   */
  function renderHotspots() {
    ui.hotspots.innerHTML = '';

    const card = data.cards[activeIndex];

    if (!card) {
      return;
    }

    card.modules
      .slice(0, MAX_MODULES)
      .forEach((module) => {
        /*
         * Invalid module data should not break
         * the rest of the component.
         */
        if (
          !module.title
          || module.x === null
          || module.y === null
        ) {
          return;
        }

        const wrapper =
          document.createElement('div');

        wrapper.className =
          'nev-tech__hotspot-wrapper';

        /*
         * Author-controlled position.
         */
        wrapper.style.left =
          `${module.x}%`;

        wrapper.style.top =
          `${module.y}%`;

        const button =
          document.createElement('button');

        button.type = 'button';

        button.className =
          'nev-tech__hotspot';

        button.setAttribute(
          'aria-label',
          module.title,
        );

        button.setAttribute(
          'aria-expanded',
          'false',
        );

        button.innerHTML = `
          <span aria-hidden="true">+</span>
        `;

        const popover =
          document.createElement('div');

        popover.className =
          'nev-tech__popover';

        popover.setAttribute(
          'role',
          'dialog',
        );

        const closeButton =
          document.createElement('button');

        closeButton.type = 'button';

        closeButton.className =
          'nev-tech__popover-close';

        closeButton.setAttribute(
          'aria-label',
          `Close ${module.title}`,
        );

        closeButton.textContent = '−';

        const popoverTitle =
          document.createElement('h4');

        popoverTitle.className =
          'nev-tech__popover-title';

        popoverTitle.textContent =
          module.title;

        const popoverDescription =
          document.createElement('p');

        popoverDescription.className =
          'nev-tech__popover-description';

        popoverDescription.textContent =
          module.description;

        popover.append(
          closeButton,
          popoverTitle,
          popoverDescription,
        );

        /**
         * Open / close hotspot.
         */
        button.addEventListener(
          'click',
          (event) => {
            event.stopPropagation();

            /*
             * Only one hotspot can be open.
             */
            if (
              openHotspot
              && openHotspot !== wrapper
            ) {
              closePopover();
            }

            const isOpen =
              popover.classList.toggle(
                'is-open',
              );

            button.classList.toggle(
              'is-open',
              isOpen,
            );

            button.setAttribute(
              'aria-expanded',
              String(isOpen),
            );

            openHotspot =
              isOpen ? wrapper : null;
          },
        );

        /**
         * Close popover.
         */
        closeButton.addEventListener(
          'click',
          (event) => {
            event.stopPropagation();

            closePopover();

            button.focus();
          },
        );

        wrapper.append(
          button,
          popover,
        );

        ui.hotspots.appendChild(wrapper);
      });
  }

  /**
   * Render currently selected card.
   */
  function renderCard() {
    const card =
      data.cards[activeIndex];

    if (!card) {
      return;
    }

    ui.counter.textContent =
      `${activeIndex + 1}/${data.cards.length}`;

    ui.title.textContent =
      card.title;

    ui.description.textContent =
      card.description;

    ui.mainImage.alt =
      card.title || 'Powertrain technology';

    ui.mainImage.src =
      card.image;

    renderThumbnails();

    renderHotspots();
  }

  /**
   * Change active slide.
   */
  function selectSlide(index) {
    if (
      index === activeIndex
      || !data.cards[index]
    ) {
      return;
    }

    /*
     * Close any currently open module
     * before changing the image.
     */
    closePopover();

    /*
     * CSS will use this class to perform
     * the fade / upward transition.
     */
    ui.imageWrap.classList.add(
      'is-changing',
    );

    window.setTimeout(() => {
      activeIndex = index;

      renderCard();

      requestAnimationFrame(() => {
        ui.imageWrap.classList.remove(
          'is-changing',
        );
      });
    }, SLIDE_CHANGE_DURATION);
  }

  /**
   * Clicking outside a hotspot closes it.
   */
  ui.ui.addEventListener(
    'click',
    (event) => {
      if (
        !event.target.closest(
          '.nev-tech__hotspot-wrapper',
        )
      ) {
        closePopover();
      }
    },
  );

  /**
   * Escape closes the active popover.
   */
  ui.ui.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        closePopover();
      }
    },
  );

  /*
   * Main block title.
   */
  ui.headline.textContent =
    data.title;

  /*
   * Initial slide.
   */
  renderCard();
}
