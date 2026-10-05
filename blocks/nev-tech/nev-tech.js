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
 * Convert text to a number.
 */
function getNumberFromText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const number = Number.parseFloat(
    String(value).trim(),
  );

  return Number.isFinite(number) ? number : null;
}

/**
 * Read an authored image/reference field.
 *
 * Universal Editor reference fields can result in an image
 * element or a link depending on the generated semantic HTML.
 */
function getReference(element) {
  if (!element) {
    return '';
  }

  /*
   * The field itself can sometimes be an image.
   */
  if (
    element.tagName?.toLowerCase() === 'img'
    && element.src
  ) {
    return element.src;
  }

  /*
   * Normal reference field containing an image.
   */
  const image = element.querySelector?.('img');

  if (image?.src) {
    return image.src;
  }

  /*
   * Reference field containing a link.
   */
  const link = element.querySelector?.('a');

  if (link?.href) {
    return link.href;
  }

  return getText(element);
}

/**
 * Read modules from the rich-text Modules field.
 *
 * Expected authored HTML:
 *
 * <ul data-richtext-prop="modules">
 *   <li>
 *     Module-1
 *     <ul>
 *       <li>Title</li>
 *       <li>Description</li>
 *       <li>20</li>
 *       <li>30</li>
 *     </ul>
 *   </li>
 * </ul>
 *
 * The first/natural text of the outer LI is the module label.
 *
 * The nested UL contains:
 *   0 = title
 *   1 = description
 *   2 = X
 *   3 = Y
 */
function readModules(cardElement) {
  const modulesElement = cardElement.querySelector(
    '[data-aue-prop="modules"]',
  );

  if (!modulesElement) {
    return [];
  }

  const moduleElements = getChildren(modulesElement)
    .filter(
      (element) =>
        element.tagName?.toLowerCase() === 'ul'
        || element.tagName?.toLowerCase() === 'ol',
    )
    .flatMap((list) =>
      getChildren(list).filter(
        (element) =>
          element.tagName?.toLowerCase() === 'li',
      ),
    )
    .slice(0, MAX_MODULES);

  return moduleElements
    .map((moduleElement) => {
      const nestedList = Array.from(
        moduleElement.children || [],
      ).find(
        (element) =>
          element.tagName?.toLowerCase() === 'ul'
          || element.tagName?.toLowerCase() === 'ol',
      );

      if (!nestedList) {
        return null;
      }

      const fields = getChildren(nestedList);

      // A module is valid only when all 4
      // module fields are present.
      if (fields.length < 4) {
        return null;
      }

      const title = getText(fields[0]);
      const description = getText(fields[1]);

      const x = getNumberFromText(
        getText(fields[2]),
      );

      const y = getNumberFromText(
        getText(fields[3]),
      );

      return {
        title,
        description,
        x,
        y,
      };
    })
    .filter(Boolean);
}

/**
 * Determine whether an element is a NEV Tech Card.
 */
function isCard(element) {
  return (
    element?.classList?.contains('nev-tech-card')
    || element?.dataset?.blockName === 'nev-tech-card'
    || element?.dataset?.aueComponent === 'nev-tech-card'
  );
}

/**
 * Read a NEV Tech Card.
 *
 * Card structure:
 *
 * Title
 * Description
 * Thumbnail
 * Motor Image
 * Modules rich-text
 */
function readCard(cardElement) {
  const children = getChildren(cardElement);

  /*
   * Find the actual authored fields.
   *
   * The Universal Editor can wrap fields in divs, so
   * we use the known first four card fields.
   */
  const fields = children.slice(0, 4);

  return {
    title: getText(fields[0]),
    description: getText(fields[1]),
    thumbnail: getReference(fields[2]),
    image: getReference(fields[3]),
    modules: readModules(cardElement),
  };
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
        (card) =>
          card.title
          || card.image,
      ),
  };
}

/**
 * Create the interactive visual UI.
 */
function createUI(block) {
  const ui = document.createElement('div');
  ui.className = 'nev-tech__ui';

  // Content
  const content = document.createElement('div');
  content.className = 'nev-tech__content';

  const headline = document.createElement('h2');
  headline.className = 'nev-tech__headline';

  const details = document.createElement('div');
  details.className = 'nev-tech__details';

  const counter = document.createElement('div');
  counter.className = 'nev-tech__counter';

  const title = document.createElement('h3');
  title.className = 'nev-tech__title';

  const description = document.createElement('p');
  description.className = 'nev-tech__description';

  const thumbnails = document.createElement('div');
  thumbnails.className = 'nev-tech__thumbnails';
  thumbnails.setAttribute(
    'aria-label',
    'Technology options',
  );

  details.append(
    counter,
    title,
    description,
    thumbnails,
  );

  content.append(
    headline,
    details,
  );

  // Visual
  const visual = document.createElement('div');
  visual.className = 'nev-tech__visual';

  const stage = document.createElement('div');
  stage.className = 'nev-tech__stage';

  const imageWrap = document.createElement('div');
  imageWrap.className = 'nev-tech__image-wrap';

  const mainImage = document.createElement('img');
  mainImage.className = 'nev-tech__main-image';
  mainImage.alt = '';

  const hotspots = document.createElement('div');
  hotspots.className = 'nev-tech__hotspots';

  imageWrap.append(mainImage);

  stage.append(
    imageWrap,
    hotspots,
  );

  visual.append(stage);

  // Complete UI
  ui.append(
    content,
    visual,
  );

  // Keep authored UE markup in the DOM.
  block.appendChild(ui);

  return {
    ui,
    headline,
    counter,
    title,
    description,
    thumbnails,
    imageWrap,
    mainImage,
    hotspots,
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

    const buttonIcon = button?.querySelector(
      'span',
    );

    if (buttonIcon) {
      buttonIcon.textContent = '+';
    }

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
   *
   * X and Y come directly from the rich-text module data
   * and are interpreted as percentages.
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
       module.x === null
          || module.y === null
        ) {
          return;
        }

        /*
         * Keep coordinates inside the image bounds.
         */
        const x = Math.min(
          100,
          Math.max(0, module.x),
        );

        const y = Math.min(
          100,
          Math.max(0, module.y),
        );

        const wrapper =
          document.createElement('div');

        wrapper.className =
          'nev-tech__hotspot-wrapper';

        /*
         * Author-controlled position.
         */
        wrapper.style.left = `${x}%`;
        wrapper.style.top = `${y}%`;

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

            const buttonIcon =
              button.querySelector('span');

            if (buttonIcon) {
              buttonIcon.textContent =
                isOpen ? '−' : '+';
            }

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