
/**
 * NEV TECH MOTOR — DIAGNOSTIC VERSION
 *
 * Purpose:
 * 1. Inspect the authored card and Modules field.
 * 2. Fetch the AEM Assets API.
 * 3. Log all returned metadata and imageMap data.
 * 4. Parse hotspot IDs and polygon coordinates.
 * 5. Calculate hotspot center X/Y percentages.
 * 6. Match API hotspot IDs against authored module IDs.
 *
 * This version is diagnostic only.
 * It does not render the final carousel or popovers.
 */

const MAX_CARDS = 3;
const MAX_MODULES = 4;

const ASSETS_API_BASE =
  'https://author-p8803-e1283844.adobeaemcloud.com/api/assets/';

const LOG_PREFIX = '[NEV-DIAG]';

function log(label, value) {
  console.log(`${LOG_PREFIX} ${label}`, value);
}

function warn(label, value) {
  console.warn(`${LOG_PREFIX} ${label}`, value);
}

function error(label, value) {
  console.error(`${LOG_PREFIX} ${label}`, value);
}

function getChildren(element) {
  return Array.from(element?.children || []);
}

function getText(element) {
  return element?.textContent?.trim() || '';
}

/* --------------------------------------------------
   1. Read image references
-------------------------------------------------- */

function getReference(element) {
  log('REFERENCE: element', element);

  if (!element) {
    warn('REFERENCE: element is missing', element);
    return '';
  }

  log('REFERENCE: outerHTML', element.outerHTML);

  if (
    element.tagName?.toLowerCase() === 'img'
    && element.src
  ) {
    log('REFERENCE: direct img.src', element.src);
    return element.src;
  }

  const image = element.querySelector?.('img');

  if (image?.src) {
    log('REFERENCE: nested img.src', image.src);
    return image.src;
  }

  const link = element.querySelector?.('a');

  if (link?.href) {
    log('REFERENCE: nested link.href', link.href);
    return link.href;
  }

  const text = getText(element);

  log('REFERENCE: text fallback', text);

  return text;
}

/* --------------------------------------------------
   2. Inspect and parse the Modules field
-------------------------------------------------- */

function findModulesElement(cardElement) {
  log('MODULES: searching card', cardElement);

  // Universal Editor field representation.
  const ueField = cardElement.querySelector(
    '[data-aue-prop="modules"]',
  );

  if (ueField) {
    log('MODULES: found data-aue-prop field', ueField);
    return ueField;
  }

  const fields = getChildren(cardElement);

  log('MODULES: direct card children', fields);
  log(
    'MODULES: direct child count',
    fields.length,
  );

  // Expected card fields:
  // 0 title, 1 description, 2 thumbnail,
  // 3 motor image, 4 modules.
  const candidate = fields[4];

  if (!candidate) {
    warn('MODULES: fifth card field not found', {
      childCount: fields.length,
      cardHTML: cardElement.outerHTML,
    });

    return null;
  }

  log('MODULES: fifth field candidate', candidate);
  log('MODULES: candidate HTML', candidate.outerHTML);

  return candidate;
}

function readModules(element) {
  log('MODULES: starting parser', element);

  if (!element) {
    warn('MODULES: no element supplied', null);
    return [];
  }

  log('MODULES: original innerHTML', element.innerHTML);
  log('MODULES: original textContent', element.textContent);
  log('MODULES: original innerText', element.innerText);

  /*
   * Inspect the HTML representation before parsing.
   * Clone it so the actual authored content is untouched.
   */
  const copy = element.cloneNode(true);

  // Preserve explicit HTML line breaks.
  copy.querySelectorAll('br').forEach((br) => {
    br.replaceWith('\n');
  });

  // Preserve block boundaries.
  copy.querySelectorAll('p, div, li').forEach((node) => {
    node.append('\n');
  });

  const raw = (
    copy.innerText
    || copy.textContent
    || ''
  )
    .replace(/\r/g, '')
    .trim();

  log('MODULES: normalized text', raw);

  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  log('MODULES: parsed lines', lines);

  const modules = lines
    .map((line, index) => {
      log(`MODULES: parsing line ${index + 1}`, line);

      const firstPipe = line.indexOf('|');
      const secondPipe = line.indexOf(
        '|',
        firstPipe + 1,
      );

      if (firstPipe < 1 || secondPipe < 0) {
        warn('MODULES: invalid line format', {
          line,
          expected: 'ID|Title|Description',
        });

        return null;
      }

      const module = {
        id: line.slice(0, firstPipe).trim(),
        title: line
          .slice(firstPipe + 1, secondPipe)
          .trim(),
        description: line
          .slice(secondPipe + 1)
          .trim(),
      };

      log('MODULES: parsed module', module);

      return module;
    })
    .filter(Boolean)
    .slice(0, MAX_MODULES);

  log('MODULES: final authored modules', modules);

  return modules;
}

/* --------------------------------------------------
   3. Read card fields
-------------------------------------------------- */

function readCard(cardElement, index) {
  console.group(`${LOG_PREFIX} CARD ${index + 1}`);

  log('CARD: full HTML', cardElement.outerHTML);

  const fields = getChildren(cardElement);

  log('CARD: direct child count', fields.length);

  fields.forEach((field, fieldIndex) => {
    log(`CARD: field ${fieldIndex}`, {
      html: field.outerHTML,
      text: getText(field),
    });
  });

  const modulesElement = findModulesElement(cardElement);

  const card = {
    title: getText(fields[0]),
    description: getText(fields[1]),
    thumbnail: getReference(fields[2]),
    image: getReference(fields[3]),
    modules: readModules(modulesElement),
  };

  log('CARD: extracted data', card);

  console.groupEnd();

  return card;
}

function readBlockData(block) {
  console.group(`${LOG_PREFIX} BLOCK INSPECTION`);

  log('BLOCK: element', block);
  log('BLOCK: outerHTML', block.outerHTML);

  const children = getChildren(block);

  log('BLOCK: direct child count', children.length);

  children.forEach((child, index) => {
    log(`BLOCK: child ${index}`, {
      tag: child.tagName,
      text: getText(child),
      html: child.outerHTML,
    });
  });

  const title = getText(children[0]);

  const cards = children
    .slice(1, 1 + MAX_CARDS)
    .map((element, index) => readCard(element, index))
    .filter((card) => (
      card.title || card.image || card.thumbnail
    ));

  const data = {
    title,
    cards,
  };

  log('BLOCK: final extracted data', data);

  console.groupEnd();

  return data;
}

/* --------------------------------------------------
   4. Construct the Assets API URL
-------------------------------------------------- */

function getAssetApiUrl(imageReference) {
  log('API URL: input image reference', imageReference);

  if (!imageReference) {
    throw new Error('Motor image reference is empty.');
  }

  const url = new URL(
    imageReference,
    window.location.href,
  );

  log('API URL: resolved URL', url.href);
  log('API URL: origin', url.origin);
  log('API URL: pathname', url.pathname);

  const pathname = decodeURIComponent(url.pathname);
  const prefix = '/content/dam/';

  if (!pathname.startsWith(prefix)) {
    throw new Error(
      `Image path does not start with ${prefix}: ${pathname}`,
    );
  }

  const relativePath = pathname.slice(prefix.length);

  const apiUrl = ASSETS_API_BASE
    + relativePath
      .split('/')
      .map(encodeURIComponent)
      .join('/')
    + '.json';

  log('API URL: relative asset path', relativePath);
  log('API URL: final endpoint', apiUrl);

  return apiUrl;
}

/* --------------------------------------------------
   5. Inspect API response and metadata
-------------------------------------------------- */

async function fetchAssetMetadata(imageReference) {
  console.group(`${LOG_PREFIX} API REQUEST`);

  let apiUrl;

  try {
    apiUrl = getAssetApiUrl(imageReference);
  } catch (exception) {
    error('API URL: construction failed', exception);
    console.groupEnd();
    throw exception;
  }

  log('API: fetch endpoint', apiUrl);
  log('API: credentials mode', 'include');

  let response;

  try {
    response = await fetch(apiUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (exception) {
    error('API: fetch threw an exception', {
      name: exception.name,
      message: exception.message,
      endpoint: apiUrl,
      hint: 'Check browser Network tab, authentication and CORS.',
    });

    console.groupEnd();
    throw exception;
  }

  log('API: HTTP status', response.status);
  log('API: HTTP status text', response.statusText);
  log('API: response OK', response.ok);
  log('API: response URL', response.url);
  log(
    'API: content type',
    response.headers.get('content-type'),
  );

  if (!response.ok) {
    const responseText = await response.text();

    error('API: error response body', responseText);

    console.groupEnd();

    throw new Error(
      `Assets API returned HTTP ${response.status}`,
    );
  }

  let asset;

  try {
    asset = await response.json();
  } catch (exception) {
    error('API: JSON parsing failed', exception);
    console.groupEnd();
    throw exception;
  }

  log('API: complete JSON response', asset);
  log('API: top-level keys', Object.keys(asset || {}));
  log('API: asset properties', asset?.properties);
  log('API: metadata object', asset?.properties?.metadata);

  const metadata = asset?.properties?.metadata || {};

  log('API: imageMap raw value', metadata.imageMap);
  log('API: imageMap type', typeof metadata.imageMap);
  log('API: imageMap length', metadata.imageMap?.length || 0);

  log('API: TIFF width property', metadata['tiff:ImageWidth']);
  log('API: TIFF height property', metadata['tiff:ImageLength']);

  log('API: asset name', asset?.properties?.['cq:name']);
  log('API: parent path', asset?.properties?.['cq:parentPath']);

  console.groupEnd();

  return {
    asset,
    apiUrl,
    metadata,
    imageMap: metadata.imageMap || '',
  };
}

/* --------------------------------------------------
   6. Get actual image dimensions
-------------------------------------------------- */

function getImageDimensions(imageReference) {
  log('DIMENSIONS: loading image', imageReference);

  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const dimensions = {
        width: image.naturalWidth,
        height: image.naturalHeight,
        displayedWidth: image.width,
        displayedHeight: image.height,
        src: image.currentSrc || image.src,
      };

      log('DIMENSIONS: image loaded', dimensions);

      if (!dimensions.width || !dimensions.height) {
        reject(new Error('Image natural dimensions are zero.'));
        return;
      }

      resolve(dimensions);
    };

    image.onerror = (event) => {
      error('DIMENSIONS: image failed to load', {
        src: image.src,
        event,
      });

      reject(new Error(
        `Unable to load image for dimensions: ${image.src}`,
      ));
    };

    image.src = imageReference;
  });
}

/* --------------------------------------------------
   7. Parse imageMap polygons
-------------------------------------------------- */

function parseImageMap(imageMap, imageWidth, imageHeight) {
  console.group(`${LOG_PREFIX} IMAGE MAP PARSER`);

  log('PARSER: raw imageMap', imageMap);
  log('PARSER: width', imageWidth);
  log('PARSER: height', imageHeight);

  if (!imageMap) {
    warn('PARSER: imageMap is empty', imageMap);
    console.groupEnd();
    return [];
  }

  if (!imageWidth || !imageHeight) {
    warn('PARSER: invalid image dimensions', {
      imageWidth,
      imageHeight,
    });

    console.groupEnd();
    return [];
  }

  /*
   * Split into individual polygon entries first.
   * This avoids depending on one greedy regex for the label.
   */
  const entries = imageMap
    .split(']')
    .map((entry) => entry.trim())
    .filter(Boolean);

  log('PARSER: individual entries', entries);

  const hotspots = entries
    .map((entry, index) => {
      console.group(`${LOG_PREFIX} POLYGON ${index + 1}`);

      log('POLYGON: raw entry', entry);

      const polygonMatch = entry.match(
        /poly\(([^)]*)\)/i,
      );

      if (!polygonMatch) {
        warn('POLYGON: poly(...) not found', entry);
        console.groupEnd();
        return null;
      }

      const coordinateText = polygonMatch[1];

      log('POLYGON: coordinate text', coordinateText);

      const points = [
        ...coordinateText.matchAll(
          /(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/g,
        ),
      ].map((match) => ({
        x: Number(match[1]),
        y: Number(match[2]),
      }));

      log('POLYGON: parsed points', points);
      log('POLYGON: point count', points.length);

      /*
       * The known AEM format ends with:
       * |""|"engine3"
       *
       * Match the last quoted value as the hotspot label.
       */
      const labelMatch = entry.match(
        /\|"([^"]*)"\s*$/,
      );

      log('POLYGON: label regex match', labelMatch);

      if (!labelMatch) {
        warn('POLYGON: final label not found', entry);
        console.groupEnd();
        return null;
      }

      const id = labelMatch[1];

      log('POLYGON: extracted ID', id);

      if (!points.length) {
        warn('POLYGON: no coordinate pairs found', entry);
        console.groupEnd();
        return null;
      }

      const sumX = points.reduce(
        (sum, point) => sum + point.x,
        0,
      );

      const sumY = points.reduce(
        (sum, point) => sum + point.y,
        0,
      );

      const centerX = sumX / points.length;
      const centerY = sumY / points.length;

      const x = (centerX / imageWidth) * 100;
      const y = (centerY / imageHeight) * 100;

      const hotspot = {
        id,
        points,
        centerX,
        centerY,
        imageWidth,
        imageHeight,
        x,
        y,
      };

      log('POLYGON: sum X', sumX);
      log('POLYGON: sum Y', sumY);
      log('POLYGON: center X in pixels', centerX);
      log('POLYGON: center Y in pixels', centerY);
      log('POLYGON: X percentage', x);
      log('POLYGON: Y percentage', y);
      log('POLYGON: final hotspot object', hotspot);

      console.groupEnd();

      return hotspot;
    })
    .filter(Boolean);

  log('PARSER: final hotspot array', hotspots);
  log('PARSER: hotspot count', hotspots.length);

  console.table(
    hotspots.map((hotspot) => ({
      id: hotspot.id,
      centerX: hotspot.centerX,
      centerY: hotspot.centerY,
      xPercent: hotspot.x,
      yPercent: hotspot.y,
    })),
  );

  console.groupEnd();

  return hotspots;
}

/* --------------------------------------------------
   8. Match authored modules to API hotspots
-------------------------------------------------- */

function matchModulesToHotspots(modules, hotspots) {
  console.group(`${LOG_PREFIX} ID MATCHING`);

  log('MATCH: authored modules', modules);
  log('MATCH: API hotspots', hotspots);

  const results = modules.map((module) => {
    const match = hotspots.find(
      (hotspot) => hotspot.id === module.id,
    );

    const result = {
      moduleId: module.id,
      title: module.title,
      description: module.description,
      matched: Boolean(match),
      hotspotId: match?.id || null,
      x: match?.x ?? null,
      y: match?.y ?? null,
    };

    if (match) {
      log(`MATCH: SUCCESS for "${module.id}"`, result);
    } else {
      warn(`MATCH: FAILED for "${module.id}"`, {
        moduleId: module.id,
        availableHotspotIds: hotspots.map((item) => item.id),
      });
    }

    return result;
  });

  log('MATCH: final results', results);

  console.table(results);

  console.groupEnd();

  return results;
}

/* --------------------------------------------------
   9. Run diagnostics for every card
-------------------------------------------------- */

async function diagnoseCard(card, index) {
  console.group(`${LOG_PREFIX} FULL DIAGNOSTIC CARD ${index + 1}`);

  log('CARD: title', card.title);
  log('CARD: motor image', card.image);
  log('CARD: authored modules', card.modules);

  if (!card.image) {
    error('CARD: motor image reference is empty', card);
    console.groupEnd();
    return;
  }

  try {
    const [apiData, dimensions] = await Promise.all([
      fetchAssetMetadata(card.image),
      getImageDimensions(card.image),
    ]);

    log('CARD: API endpoint used', apiData.apiUrl);
    log('CARD: API metadata received', apiData.metadata);
    log('CARD: imageMap received', apiData.imageMap);
    log('CARD: actual image dimensions', dimensions);

    const metadataWidth = Number(
      apiData.metadata['tiff:ImageWidth'],
    );

    const metadataHeight = Number(
      apiData.metadata['tiff:ImageLength'],
    );

    const width = metadataWidth || dimensions.width;
    const height = metadataHeight || dimensions.height;

    log('CARD: final width used for calculation', width);
    log('CARD: final height used for calculation', height);

    if (!metadataWidth || !metadataHeight) {
      warn(
        'CARD: TIFF dimensions missing; using natural image dimensions',
        {
          metadataWidth: apiData.metadata['tiff:ImageWidth'],
          metadataHeight: apiData.metadata['tiff:ImageLength'],
          fallbackWidth: dimensions.width,
          fallbackHeight: dimensions.height,
        },
      );
    }

    const hotspots = parseImageMap(
      apiData.imageMap,
      width,
      height,
    );

    const matches = matchModulesToHotspots(
      card.modules,
      hotspots,
    );

    log('CARD: diagnostic summary', {
      title: card.title,
      image: card.image,
      apiUrl: apiData.apiUrl,
      authoredModuleCount: card.modules.length,
      apiHotspotCount: hotspots.length,
      matchedCount: matches.filter((item) => item.matched).length,
      hotspots,
      matches,
    });
  } catch (exception) {
    error('CARD: diagnostic failed', {
      title: card.title,
      image: card.image,
      message: exception.message,
      stack: exception.stack,
    });
  }

  console.groupEnd();
}

/* --------------------------------------------------
   10. Block entry point
-------------------------------------------------- */

export default function decorate(block) {
  console.clear();

  console.group(`${LOG_PREFIX} START`);
  log('PAGE URL', window.location.href);
  log('PAGE ORIGIN', window.location.origin);
  log('START TIME', new Date().toISOString());

  const data = readBlockData(block);

  log('TOTAL CARDS', data.cards.length);

  console.groupEnd();

  if (!data.cards.length) {
    error(
      'No cards detected. Inspect BLOCK HTML and child structure above.',
      block.outerHTML,
    );
    return;
  }

  Promise.all(
    data.cards.map((card, index) => diagnoseCard(card, index)),
  ).then(() => {
    console.group(`${LOG_PREFIX} ALL DIAGNOSTICS COMPLETE`);
    log('Total cards inspected', data.cards.length);
    log('Finish time', new Date().toISOString());
    console.groupEnd();
  });
}
