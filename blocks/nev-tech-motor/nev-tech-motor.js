
const MAX_CARDS = 3;
const MAX_MODULES = 4;
const SLIDE_CHANGE_DURATION = 260;

const ASSETS_API_BASE =
  'https://author-p8803-e1283844.adobeaemcloud.com/api/assets/';

/* ---------- Author data helpers ---------- */

function childrenOf(element) {
  return Array.from(element?.children || []);
}

function textOf(element) {
  return (
    element?.innerText?.trim()
    || element?.textContent?.trim()
    || ''
  );
}

function referenceOf(element) {
  if (!element) return '';

  if (element.tagName?.toLowerCase() === 'img' && element.src) {
    return element.src;
  }

  const image = element.querySelector?.('img');
  if (image?.src) return image.src;

  const link = element.querySelector?.('a');
  if (link?.href) return link.href;

  return textOf(element);
}

function readModules(element) {
  if (!element) return [];

  const raw = textOf(element);

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, title, ...descriptionParts] = line.split('|');

      return {
        id: (id || '').trim(),
        title: (title || '').trim(),
        description: descriptionParts.join('|').trim(),
      };
    })
    .filter((module) => module.id && module.title)
    .slice(0, MAX_MODULES);
}

function readCard(element) {
  const fields = childrenOf(element);

  return {
    title: textOf(fields[0]),
    description: textOf(fields[1]),
    thumbnail: referenceOf(fields[2]),
    image: referenceOf(fields[3]),
    modules: readModules(fields[4]),
  };
}

function readBlockData(block) {
  const children = childrenOf(block);

  return {
    title: textOf(children[0]),
    cards: children
      .slice(1, 1 + MAX_CARDS)
      .map(readCard)
      .filter((card) => card.title || card.image || card.thumbnail),
  };
}

/* ---------- Dynamic Media API helpers ---------- */
/*
 * Your current UE image URLs use:
 * /adobe/dynamicmedia/deliver/dm-aid--.../powertrain-1.png
 *
 * The Assets API needs a DAM path, not the delivery URL.
 * This POC assumes these assets live in /content/dam/uni-eds/.
 */
function getAssetApiUrl(imageReference) {
  const url = new URL(imageReference, window.location.origin);
  const pathname = decodeURIComponent(url.pathname);

  let assetPath = '';

  if (pathname.startsWith('/content/dam/')) {
    assetPath = pathname.slice('/content/dam/'.length);
  } else if (pathname.includes('/adobe/dynamicmedia/deliver/')) {
    const filename = pathname.split('/').pop();

    if (!filename) {
      throw new Error(`Cannot extract asset filename from ${pathname}`);
    }

    // Adjust this folder if the assets are stored elsewhere in DAM.
    assetPath = `uni-eds/${filename}`;
  } else {
    throw new Error(`Unsupported image URL: ${pathname}`);
  }

  const encodedPath = assetPath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  return `${ASSETS_API_BASE}${encodedPath}.json`;
}

function getImageDimensions(imageUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new Error('Image dimensions are unavailable.'));
        return;
      }

      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      reject(new Error(`Unable to load image: ${imageUrl}`));
    };

    image.src = imageUrl;
  });
}

/*
 * Expected metadata example:
 * [poly(44,44,54,44,54,34,44,34,44,44)"quickview:sku="|""|"engine3"]
 *
 * The hotspot ID is the final quoted value before the closing bracket.
 */
function parseImageMap(imageMap, imageWidth, imageHeight) {
  if (!imageMap || !imageWidth || !imageHeight) {
    console.warn('[NEV-MOTOR] Missing imageMap or image dimensions', {
      imageMap,
      imageWidth,
      imageHeight,
    });
    return [];
  }

  const hotspots = [];
  const entries = imageMap.match(/\[poly\([^)]*\)[^\]]*\]/g) || [];

  entries.forEach((entry) => {
    const coordinateMatch = entry.match(/poly\(([^)]*)\)/);
    const labelMatches = [...entry.matchAll(/"([^"]*)"/g)];

    if (!coordinateMatch || !labelMatches.length) {
      console.warn('[NEV-MOTOR] Could not parse hotspot entry:', entry);
      return;
    }

    // The final quoted string is the Dynamic Media hotspot label.
    const id = labelMatches[labelMatches.length - 1][1].trim();

    const points = [
      ...coordinateMatch[1].matchAll(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g),
    ].map((point) => ({
      x: Number(point[1]),
      y: Number(point[2]),
    }));

    if (!id || !points.length) {
      console.warn('[NEV-MOTOR] Invalid hotspot entry:', entry);
      return;
    }

    /*
     * Use the average of polygon points as the hotspot position.
     * These coordinates are normalized against the source image dimensions.
     */
    const centerX =
      points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const centerY =
      points.reduce((sum, point) => sum + point.y, 0) / points.length;

    hotspots.push({
      id,
      x: (centerX / imageWidth) * 100,
      y: (centerY / imageHeight) * 100,
    });
  });

  console.table(hotspots);
  return hotspots;
}

async function fetchHotspots(imageReference) {
  if (!imageReference) return [];

  const apiUrl = getAssetApiUrl(imageReference);

  console.info('[NEV-MOTOR] Fetching asset metadata:', apiUrl);

  const response = await fetch(apiUrl, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Assets API returned HTTP ${response.status}: ${apiUrl}`);
  }

  const asset = await response.json();
  const properties = asset?.properties || {};
  const metadata = properties.metadata || {};
  const imageMap = metadata.imageMap || '';

  console.info('[NEV-MOTOR] Asset API response:', asset);
  console.info('[NEV-MOTOR] imageMap:', imageMap);

  /*
   * Prefer original asset dimensions from metadata if present.
   * The delivered image URL may be transformed to a different size.
   */
  let width = Number(
    metadata['tiff:ImageWidth']
      || metadata['dam:extracted']
      || 0,
  );

  let height = Number(metadata['tiff:ImageLength'] || 0);

  if (!width || !height) {
    const dimensions = await getImageDimensions(imageReference);
    width = dimensions.width;
    height = dimensions.height;

    console.warn(
      '[NEV-MOTOR] Using delivered image dimensions as fallback:',
      { width, height },
    );
  }

  const hotspots = parseImageMap(imageMap, width, height);

  console.info('[NEV-MOTOR] Parsed hotspots:', hotspots);
  return hotspots;
}

async function loadCardHotspots(card) {
  try {
    console.info('[NEV-MOTOR] Loading hotspots for:', card.title);
    console.info('[NEV-MOTOR] Image URL:', card.image);
    console.info('[NEV-MOTOR] Authored modules:', card.modules);

    const hotspots = await fetchHotspots(card.image);

    card.modules = card.modules
      .map((module) => {
        const hotspot = hotspots.find(
          (item) => item.id === module.id,
        );

        if (!hotspot) {
          console.warn(
            `[NEV-MOTOR] No hotspot label matches "${module.id}".`,
            'Available labels:',
            hotspots.map((item) => item.id),
          );
          return null;
        }

        return {
          ...module,
          x: hotspot.x,
          y: hotspot.y,
        };
      })
      .filter(Boolean)
      .slice(0, MAX_MODULES);

    console.info('[NEV-MOTOR] Matched modules:', card.modules);
  } catch (error) {
    console.error(
      `[NEV-MOTOR] Could not load hotspots for "${card.title}":`,
      error,
    );

    // Keep the rest of the card UI working if metadata loading fails.
    card.modules = [];
  }
}


/* ---------- UI creation ---------- */

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function createUI() {
  const ui = createElement('div', 'nev-tech__ui');

  const content = createElement('div', 'nev-tech__content');
  const headline = createElement('h2', 'nev-tech__headline');
  const details = createElement('div', 'nev-tech__details');
  const counter = createElement('div', 'nev-tech__counter');
  const title = createElement('h3', 'nev-tech__title');
  const description = createElement('p', 'nev-tech__description');
  const thumbnails = createElement('div', 'nev-tech__thumbnails');

  thumbnails.setAttribute('aria-label', 'Technology options');
  details.append(counter, title, description, thumbnails);
  content.append(headline, details);

  const visual = createElement('div', 'nev-tech__visual');
  const stage = createElement('div', 'nev-tech__stage');
  const imageWrap = createElement('div', 'nev-tech__image-wrap');
  const mainImage = createElement('img', 'nev-tech__main-image');
  const hotspots = createElement('div', 'nev-tech__hotspots');

  mainImage.alt = '';
  imageWrap.append(mainImage);
  stage.append(imageWrap, hotspots);
  visual.append(stage);
  ui.append(content, visual);

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

/* ---------- Block decoration ---------- */

export default function decorate(block) {
  const data = readBlockData(block);

  if (!data.cards.length) return;

  const ui = createUI();

  // Preserve editable source fields in Universal Editor.
  const inUniversalEditor = Boolean(
    block.querySelector('[data-aue-type]')
      || block.closest('[data-aue-type]'),
  );

  if (inUniversalEditor) {
    block.appendChild(ui.ui);
  } else {
    block.replaceChildren(ui.ui);
  }

  let activeIndex = 0;
  let openHotspot = null;

  function closePopover() {
    if (!openHotspot) return;

    const button = openHotspot.querySelector('.nev-tech__hotspot');
    const popover = openHotspot.querySelector('.nev-tech__popover');
    const icon = button?.querySelector('span');

    button?.classList.remove('is-open');
    button?.setAttribute('aria-expanded', 'false');

    if (icon) icon.textContent = '+';

    popover?.classList.remove('is-open');
    openHotspot = null;
  }

  function renderThumbnails() {
    ui.thumbnails.replaceChildren();

    data.cards.forEach((card, index) => {
      if (!card.thumbnail) return;

      const button = createElement('button', 'nev-tech__thumbnail');
      button.type = 'button';
      button.setAttribute(
        'aria-label',
        `Show ${card.title || `slide ${index + 1}`}`,
      );
      button.setAttribute('aria-pressed', String(index === activeIndex));

      if (index === activeIndex) button.classList.add('is-active');

      const image = createElement('img');
      image.src = card.thumbnail;
      image.alt = '';

      button.append(image);
      button.addEventListener('click', () => selectSlide(index));
      ui.thumbnails.append(button);
    });
  }

  function renderHotspots() {
    ui.hotspots.replaceChildren();

    const card = data.cards[activeIndex];
    if (!card) return;

    card.modules.forEach((module) => {
      if (!Number.isFinite(module.x) || !Number.isFinite(module.y)) {
        return;
      }

      const wrapper = createElement(
        'div',
        'nev-tech__hotspot-wrapper',
      );

      wrapper.style.left = `${Math.min(100, Math.max(0, module.x))}%`;
      wrapper.style.top = `${Math.min(100, Math.max(0, module.y))}%`;

      const button = createElement('button', 'nev-tech__hotspot');
      button.type = 'button';
      button.setAttribute('aria-label', module.title);
      button.setAttribute('aria-expanded', 'false');

      const icon = createElement('span', '', '+');
      icon.setAttribute('aria-hidden', 'true');
      button.append(icon);

      const popover = createElement('div', 'nev-tech__popover');
      popover.setAttribute('role', 'dialog');

      const closeButton = createElement(
        'button',
        'nev-tech__popover-close',
        '−',
      );
      closeButton.type = 'button';
      closeButton.setAttribute(
        'aria-label',
        `Close ${module.title}`,
      );

      const popoverTitle = createElement(
        'h4',
        'nev-tech__popover-title',
        module.title,
      );

      const popoverDescription = createElement(
        'p',
        'nev-tech__popover-description',
        module.description,
      );

      popover.append(
        closeButton,
        popoverTitle,
        popoverDescription,
      );

      button.addEventListener('click', (event) => {
        event.stopPropagation();

        if (openHotspot && openHotspot !== wrapper) {
          closePopover();
        }

        const isOpen = popover.classList.toggle('is-open');

        button.classList.toggle('is-open', isOpen);
        button.setAttribute('aria-expanded', String(isOpen));
        icon.textContent = isOpen ? '−' : '+';
        openHotspot = isOpen ? wrapper : null;
      });

      closeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        closePopover();
        button.focus();
      });

      wrapper.append(button, popover);
      ui.hotspots.append(wrapper);
    });
  }

  function renderCard() {
    const card = data.cards[activeIndex];
    if (!card) return;

    ui.counter.textContent = `${activeIndex + 1}/${data.cards.length}`;
    ui.title.textContent = card.title;
    ui.description.textContent = card.description;
    ui.mainImage.alt = card.title || 'Powertrain technology';
    ui.mainImage.src = card.image;

    renderThumbnails();
    renderHotspots();
  }

  function selectSlide(index) {
    if (index === activeIndex || !data.cards[index]) return;

    closePopover();
    ui.imageWrap.classList.add('is-changing');

    window.setTimeout(() => {
      activeIndex = index;
      renderCard();

      window.requestAnimationFrame(() => {
        ui.imageWrap.classList.remove('is-changing');
      });
    }, SLIDE_CHANGE_DURATION);
  }

  ui.ui.addEventListener('click', (event) => {
    if (!event.target.closest('.nev-tech__hotspot-wrapper')) {
      closePopover();
    }
  });

  ui.ui.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePopover();
  });

  ui.headline.textContent = data.title;

  // Render immediately, then replace authored modules with API-positioned ones.
  renderCard();

  loadAllCardHotspots().catch((error) => {
    console.error('NEV Tech Motor hotspot loading failed:', error);
  });

  async function loadAllCardHotspots() {
    await Promise.all(data.cards.map(loadCardHotspots));
    renderCard();
  }
}
