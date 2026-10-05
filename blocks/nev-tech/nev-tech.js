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
 * Normal EDS output can contain:
 * - img
 * - a containing img
 * - a reference wrapper
 * - plain text
 */
function getReference(element) {
  if (!element) {
    return '';
  }

  /*
   * The field itself is an image.
   */
  if (
    element.tagName?.toLowerCase() === 'img'
    && element.src
  ) {
    return element.src;
  }

  /*
   * Look for an image inside the field.
   */
  const image = element.querySelector?.('img');

  if (image?.src) {
    return image.src;
  }

  /*
   * Look for a link containing the reference.
   */
  const link = element.querySelector?.('a');

  if (link?.href) {
    return link.href;
  }

  /*
   * Fallback to the field's text.
   */
  return getText(element);
}

/**
 * Find the modules element inside a card.
 *
 * On Universal Editor we may have:
 *
 * [data-aue-prop="modules"]
 *
 * On the published EDS page we normally have
 * the normal HTML list without the UE attribute.
 */
function findModulesElement(cardElement) {
  if (!cardElement) {
    return null;
  }

  /*
   * First support the UE representation.
   */
  const ueModules = cardElement.querySelector(
    '[data-aue-prop="modules"]',
  );

  if (ueModules) {
    return ueModules;
  }

  /*
   * Published EDS representation:
   *
   * Card
   * ├── title
   * ├── description
   * ├── thumbnail
   * ├── motor image
   * └── modules <ul>
   *
   * The modules field is therefore the fifth field.
   */
  const fields = getChildren(cardElement);

  const modulesField = fields[4];

  if (!modulesField) {
    return null;
  }

  /*
   * The field itself may be the UL/OL.
   */
  const fieldTag = modulesField.tagName?.toLowerCase();

  if (
    fieldTag === 'ul'
    || fieldTag === 'ol'
  ) {
    return modulesField;
  }

  /*
   * Or the list may be wrapped inside the field.
   */
  return modulesField.querySelector?.('ul, ol') || null;
}

/**
 * Read modules from the rich-text Modules field.
 *
 * Expected structure:
 *
 * <ul>
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
 * Nested fields:
 *   0 = title
 *   1 = description
 *   2 = X
 *   3 = Y
 */
function readModules(cardElement) {
  const modulesElement = findModulesElement(
    cardElement,
  );

  if (!modulesElement) {
    return [];
  }

  /*
   * The module list itself can be the element
   * or can contain the list.
   */
  const listTag = modulesElement.tagName?.toLowerCase();

  const lists =
    listTag === 'ul' || listTag === 'ol'
      ? [modulesElement]
      : getChildren(modulesElement).filter(
        (element) => {
          const tag =
            element.tagName?.toLowerCase();

          return tag === 'ul' || tag === 'ol';
        },
      );

  const moduleElements = lists
    .flatMap((list) =>
      getChildren(list).filter(
        (element) =>
          element.tagName?.toLowerCase() === 'li',
      ),
    )
    .slice(0, MAX_MODULES);

  return moduleElements
    .map((moduleElement) => {
      /*
       * Each module contains a nested UL/OL
       * containing the four actual fields.
       */
      const nestedList = Array.from(
        moduleElement.children || [],
      ).find((element) => {
        const tag =
          element.tagName?.toLowerCase();

        return tag === 'ul' || tag === 'ol';
      });

      if (!nestedList) {
        return null;
      }

      const fields = getChildren(nestedList);

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
 * Read a NEV Tech Card from normal EDS markup.
 *
 * Card structure:
 *
 * 0 = Title
 * 1 = Description
 * 2 = Thumbnail
 * 3 = Motor Image
 * 4 = Modules
 */
function readCard(cardElement) {
  const fields = getChildren(cardElement);

  return {
    title: getText(fields[0]),
    description: getText(fields[1]),
    thumbnail: getReference(fields[2]),
    image: getReference(fields[3]),
    modules: readModules(cardElement),
  };
}

/**
 * Read the complete NEV Tech block.
 *
 * Normal published EDS structure:
 *
 * NEV Tech
 * ├── Title
 * ├── Card
 * ├── Card
 * └── Card
 *
 * We intentionally use the normal EDS DOM structure
 * instead of depending on Universal Editor attributes.
 */
function readBlockData(block) {
  const children = getChildren(block);

  if (!children.length) {
    return {
      title: '',
      cards: [],
    };
  }

  /*
   * First child is the block title.
   */
  const titleElement = children[0];

  /*
   * Remaining children are cards.
   */
  const cardElements = children
    .slice(1, 1 + MAX_CARDS);

  return {
    title: getText(titleElement),
    cards: cardElements
      .map(readCard)
      .filter(
        (card) =>
          card.title
          || card.image
          || card.thumbnail,
      ),
  };
}

/**
 * Detect whether the block is currently running
 * inside Universal Editor markup.
 *
 * Published .aem.page markup does not contain
 * data-aue-* attributes.
 */
function isUniversalEditor(block) {
  return Boolean(
    block.querySelector?.('[data-aue-type]')
    || block.closest?.('[data-aue-type]'),
  );
}

/**
 * Create the interactive visual UI.
 */
function createUI() {
  const ui = document.createElement('div');
  ui.className = 'nev-tech__ui';

  /*
   * Content
   */
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

  /*
   * Visual
   */
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

  /*
   * Complete UI.
   */
  ui.append(
    content,
    visual,
  );

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
  /*
   * IMPORTANT:
   *
   * Read the normal EDS DOM BEFORE modifying the block.
   */
  const data = readBlockData(block);

  if (!data.cards.length) {
    return;
  }

  /*
   * Determine whether this is the UE editing DOM
   * or the published EDS DOM.
   */
  const inUniversalEditor = isUniversalEditor(block);

  const ui = createUI();

  /*
   * In Universal Editor:
   *
   * Keep the authored fields in the DOM so UE
   * can continue editing them.
   *
   * On the published .aem.page:
   *
   * The authored EDS data has already been read,
   * so replace it with the actual component UI.
   */
  if (inUniversalEditor) {
    block.appendChild(ui.ui);
  } else {
    block.replaceChildren(ui.ui);
  }

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

      const button =
        document.createElement('button');

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

      const image =
        document.createElement('img');

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
         * Invalid coordinates should not break
         * the component.
         */
        if (
          module.x === null
          || module.y === null
        ) {
          return;
        }

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

        wrapper.style.left = `${x}%`;
        wrapper.style.top = `${y}%`;

        const button =
          document.createElement('button');

        button.type = 'button';

        button.className =
          'nev-tech__hotspot';

        button.setAttribute(
          'aria-label',
          module.title || 'Open module',
        );

        button.setAttribute(
          'aria-expanded',
          'false',
        );

        const icon =
          document.createElement('span');

        icon.setAttribute(
          'aria-hidden',
          'true',
        );

        icon.textContent = '+';

        button.appendChild(icon);

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
          `Close ${module.title || 'module'}`,
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

        /*
         * Open / close hotspot.
         */
        button.addEventListener(
          'click',
          (event) => {
            event.stopPropagation();

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

            icon.textContent =
              isOpen ? '−' : '+';

            openHotspot =
              isOpen ? wrapper : null;
          },
        );

        /*
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

    closePopover();

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