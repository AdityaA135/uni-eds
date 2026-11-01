/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-infosys-photo-gallery.js
  var import_infosys_photo_gallery_exports = {};
  __export(import_infosys_photo_gallery_exports, {
    default: () => import_infosys_photo_gallery_default
  });

  // tools/importer/parsers/infosys-banner.js
  var DEFAULT_COLOR = "#df9926";
  function toHex(value) {
    if (!value) return "";
    const v = value.trim();
    const hex = v.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/i);
    if (hex) {
      let h = hex[1].toLowerCase();
      if (h.length === 3) h = h.split("").map((c) => c + c).join("");
      return `#${h}`;
    }
    const rgb = v.match(/rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i);
    if (rgb) {
      return `#${rgb.slice(1, 4).map((n) => Math.min(255, parseInt(n, 10)).toString(16).padStart(2, "0")).join("")}`;
    }
    return "";
  }
  function readColor(section) {
    if (!section) return "";
    const style = section.getAttribute("style") || "";
    const decl = style.match(/background(?:-color)?\s*:\s*([^;]+)/i);
    if (decl) return toHex(decl[1]);
    return "";
  }
  function parse(element, { document }) {
    const section = element.querySelector("#speaker_bg") || (element.matches("#speaker_bg") ? element : null);
    const heading = element.querySelector("h1, .speaker-title, h2");
    const color = readColor(section) || DEFAULT_COLOR;
    const title = heading ? heading.textContent.replace(/\s+/g, " ").trim() : "";
    const cells = [];
    const colorCell = document.createDocumentFragment();
    colorCell.appendChild(document.createComment(" field:color "));
    colorCell.appendChild(document.createTextNode(color));
    cells.push([colorCell]);
    const titleCell = document.createDocumentFragment();
    if (title) {
      titleCell.appendChild(document.createComment(" field:title "));
      titleCell.appendChild(document.createTextNode(title));
    }
    cells.push([titleCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "infosys-banner", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/infosys-jumplinks.js
  function normalizeHref(href) {
    if (!href) return "";
    const bookmark = href.match(/^bookmark:\/\/(.+)$/i);
    if (bookmark) return `#${bookmark[1]}`;
    const bareHash = href.match(/^https?:\/\/#(.+)$/i);
    if (bareHash) return `#${bareHash[1]}`;
    return href;
  }
  function parse2(element, { document }) {
    const links = Array.from(element.querySelectorAll("ul > li > a"));
    const cells = [];
    links.forEach((a) => {
      const text = a.textContent.replace(/\s+/g, " ").trim();
      const href = normalizeHref(a.getAttribute("href") || "");
      if (!text && !href) return;
      const link = document.createElement("a");
      link.setAttribute("href", href);
      link.textContent = text || href;
      const cell = document.createDocumentFragment();
      cell.appendChild(document.createComment(" field:link "));
      cell.appendChild(link);
      cells.push([cell]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "infosys-jumplinks", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/infosys-video.js
  function cleanUrl(src) {
    if (!src) return "";
    let url = src.trim();
    if (url.startsWith("//")) url = `https:${url}`;
    return url.split(/[?#]/)[0];
  }
  function parse3(element, { document }) {
    const iframe = element.querySelector("iframe[src]");
    let video = iframe ? cleanUrl(iframe.getAttribute("src")) : "";
    if (!video) {
      const a = element.querySelector("a[href]");
      if (a) video = cleanUrl(a.getAttribute("href"));
    }
    const heading = element.querySelector("h2, h3, h1");
    const title = heading ? heading.textContent.replace(/\s+/g, " ").trim() : "";
    const cells = [];
    const videoCell = document.createDocumentFragment();
    if (video) {
      videoCell.appendChild(document.createComment(" field:video "));
      videoCell.appendChild(document.createTextNode(video));
    }
    cells.push([videoCell]);
    const titleCell = document.createDocumentFragment();
    if (title) {
      titleCell.appendChild(document.createComment(" field:title "));
      titleCell.appendChild(document.createTextNode(title));
    }
    cells.push([titleCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "infosys-video", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/infosys-photo-gallery.js
  var MEANINGLESS_ALT = /^(slider image|image|img|photo|picture|thumbnail)?$/i;
  function absoluteSrc(img, document) {
    const raw = img.getAttribute("src") || img.getAttribute("data-src") || "";
    if (!raw) return "";
    try {
      const base = document.location && document.location.href && document.location.href !== "about:blank" ? document.location.href : "https://main--infosyseds--infosys-is-dotcom.aem.live/";
      return new URL(raw, base).href;
    } catch (e) {
      return raw;
    }
  }
  function altFor(img, fallback) {
    const alt = (img.getAttribute("alt") || "").replace(/\s+/g, " ").trim();
    return MEANINGLESS_ALT.test(alt) ? fallback : alt;
  }
  function pictureCell(document, img, alt) {
    const cell = document.createDocumentFragment();
    const src = absoluteSrc(img, document);
    if (!src) return cell;
    const out = document.createElement("img");
    out.setAttribute("src", src);
    out.setAttribute("alt", alt || "");
    cell.appendChild(document.createComment(" field:image "));
    cell.appendChild(out);
    return cell;
  }
  function findModal(element, document, id) {
    if (!id) return null;
    const sel = `.list_slider_modal[id="${id.replace(/"/g, '\\"')}"]`;
    return element.querySelector(sel) || document.querySelector(sel);
  }
  function parse4(element, { document }) {
    const gallery = element.querySelector("#photo_gallery") || element;
    const titleEl = gallery.querySelector(".gallery-title");
    const galleryTitle = titleEl ? titleEl.textContent.replace(/\s+/g, " ").trim() : "";
    const row = gallery.querySelector(".list_slider_carousel") ? gallery.querySelector(".list_slider_carousel").closest(".row[id]") : null;
    const rowId = row ? row.id : "";
    const items = Array.from(gallery.querySelectorAll(".list_slider_carousel .owl-item:not(.cloned) > .item"));
    const cells = [];
    items.forEach((item, index) => {
      const trigger = item.querySelector(":scope > a") || item.querySelector("a");
      const caption = item.querySelector(".list_slider_caption") || item;
      const coverImg = caption.querySelector("img");
      const heading = caption.querySelector("h2, h3, h4, .h2");
      const title = heading ? heading.textContent.replace(/\s+/g, " ").trim() : "";
      const titleCell = document.createDocumentFragment();
      if (title) {
        titleCell.appendChild(document.createComment(" field:title "));
        titleCell.appendChild(document.createTextNode(title));
      }
      const coverCell = coverImg ? pictureCell(document, coverImg, altFor(coverImg, title)) : document.createDocumentFragment();
      cells.push(["infosys-gallery-topic", titleCell, coverCell]);
      let target = "";
      if (trigger) {
        target = trigger.getAttribute("data-bs-target") || trigger.getAttribute("data-target") || "";
        if (!target) {
          const href = trigger.getAttribute("href") || "";
          if (href.startsWith("#") && href.length > 1) target = href;
        }
      }
      let modalId = target.replace(/^#/, "");
      if (!modalId && rowId) modalId = `${rowId}_${index + 1}`;
      const modal = findModal(element, document, modalId);
      if (!modal) return;
      const photos = Array.from(modal.querySelectorAll(".list_slider_carousel_modal .owl-item:not(.cloned) .item img"));
      photos.forEach((img) => {
        if (!absoluteSrc(img, document)) return;
        cells.push(["infosys-gallery-photo", pictureCell(document, img, altFor(img, title))]);
      });
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "infosys-photo-gallery", cells });
    if (galleryTitle) {
      const h2 = document.createElement("h2");
      h2.textContent = galleryTitle;
      element.replaceWith(h2, block);
    } else {
      element.replaceWith(block);
    }
  }

  // tools/importer/transformers/infosys-cleanup.js
  var CHROME_SELECTORS = [
    "header.header-wrapper",
    "header",
    "nav.navbar",
    ".hamburger-menu-right",
    "footer.footer-wrapper",
    "footer",
    ".footer-wrapper",
    "#onetrust-consent-sdk",
    '[id^="onetrust-"]',
    '[class^="ot-"]',
    '[class*=" ot-"]',
    ".scroll-to-top",
    ".scroll-up",
    "#db_lr_pixel_ad",
    'img[src*="demdex.net"]',
    'img[src*="rlcdn.com"]',
    'img[src*="company-target.com"]'
  ];
  function isAuthorableIframe(iframe) {
    const src = iframe.getAttribute("src") || "";
    return /vidyard\.com/i.test(src) && !!iframe.closest("#video .session, .session");
  }
  function isEmptySection(el) {
    if (el.querySelector("img, picture, video, iframe, a, h1, h2, h3, h4, h5, h6, p, li")) return false;
    return (el.textContent || "").replace(/ /g, " ").trim() === "";
  }
  function removeComments(root) {
    const doc = root.ownerDocument || root;
    const walker = doc.createTreeWalker(
      root,
      128
      /* NodeFilter.SHOW_COMMENT */
    );
    const comments = [];
    while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach((c) => c.remove());
  }
  function transform(hookName, element, payload) {
    if (hookName === "beforeTransform") {
      const root = element.ownerDocument ? element.ownerDocument : element;
      const scope = root.body || element;
      removeComments(scope);
      WebImporter.DOMUtils.remove(scope, CHROME_SELECTORS);
      WebImporter.DOMUtils.remove(scope, ["script", "style", "noscript", "link", "meta"]);
      scope.querySelectorAll("iframe").forEach((iframe) => {
        if (!isAuthorableIframe(iframe)) iframe.remove();
      });
      const main = scope.querySelector("main") || scope;
      let last = main.lastElementChild;
      while (last && last.matches("div.section") && isEmptySection(last)) {
        const prev = last.previousElementSibling;
        last.remove();
        last = prev;
      }
    }
    if (hookName === "afterTransform") {
      const root = element.ownerDocument ? element.ownerDocument : element;
      const scope = root.body || element;
      WebImporter.DOMUtils.remove(scope, [
        "header",
        "footer",
        "#onetrust-consent-sdk",
        ".scroll-to-top",
        ".scroll-up",
        "script",
        "style",
        "noscript",
        "link"
      ]);
      scope.querySelectorAll("[onclick], [data-track], [data-analytics], [data-aue-resource]").forEach((el) => {
        ["onclick", "data-track", "data-analytics"].forEach((a) => el.removeAttribute(a));
      });
    }
  }

  // tools/importer/transformers/infosys-sections.js
  var MARKER = "data-excat-section-id";
  var STYLE_ATTR = "data-excat-section-style";
  var ANCHOR_ATTR = "data-excat-section-anchor";
  var ANCHOR_IDS = ["partner", "day2", "day3", "day4", "networking"];
  function findSectionElement(root, section) {
    const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
    for (const sel of selectors) {
      if (!sel) continue;
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch (e) {
      }
    }
    return null;
  }
  function transform2(hookName, element, payload) {
    const template = payload && payload.template;
    const sections = template && Array.isArray(template.sections) ? template.sections : [];
    if (sections.length < 2) return;
    const doc = element.ownerDocument || element;
    const root = element.querySelector ? element : doc;
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const el = findSectionElement(root, section);
        if (!el) continue;
        const style = section.style || "";
        const sourceId = el.id || "";
        const anchor = ANCHOR_IDS.includes(sourceId) ? sourceId : "";
        const needsMetadata = !!(style || anchor);
        if (i === 0 && !needsMetadata) continue;
        const hr = doc.createElement("hr");
        if (needsMetadata) {
          hr.setAttribute(MARKER, section.id);
          if (style) hr.setAttribute(STYLE_ATTR, style);
          if (anchor) hr.setAttribute(ANCHOR_ATTR, anchor);
        }
        if (i === 0) hr.setAttribute("data-excat-first-section", "true");
        el.parentNode.insertBefore(hr, el);
      }
    }
    if (hookName === "afterTransform") {
      const markers = Array.from(root.querySelectorAll(`hr[${MARKER}]`));
      for (let i = markers.length - 1; i >= 0; i -= 1) {
        const hr = markers[i];
        const style = hr.getAttribute(STYLE_ATTR);
        const anchor = hr.getAttribute(ANCHOR_ATTR);
        const cells = {};
        if (style) cells.style = style;
        if (anchor) cells.anchor = anchor;
        const block = WebImporter.Blocks.createBlock(doc, {
          name: "Section Metadata",
          cells
        });
        hr.after(block);
        hr.removeAttribute(MARKER);
        hr.removeAttribute(STYLE_ATTR);
        hr.removeAttribute(ANCHOR_ATTR);
        if (hr.hasAttribute("data-excat-first-section")) {
          hr.remove();
        }
      }
    }
  }

  // tools/importer/import-infosys-photo-gallery.js
  var PAGE_TEMPLATE = {
    name: "infosys-photo-gallery",
    urls: [
      "https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/photo-gallery"
    ],
    representativeUrl: "https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/photo-gallery",
    description: "Infosys Americas Confluence 2026 photo gallery: colour banner, jump links, highlights video, photo galleries per day",
    blocks: [
      { name: "infosys-banner", instances: [".banner-wrapper"] },
      { name: "infosys-jumplinks", instances: [".jumplinks"] },
      { name: "infosys-video", instances: [".session"] },
      { name: "infosys-photo-gallery", instances: [".photo-gallery-wrapper"] }
    ],
    urlPattern: "/confluence/2026/us/*",
    sections: [
      {
        id: "section-1",
        name: "Highlights banner",
        selector: ["div.section.banner-container"],
        style: null,
        blocks: ["infosys-banner"],
        defaultContent: []
      },
      {
        id: "section-2",
        name: "Jump links",
        selector: ["div.section#speaker-menu", "div.section.jumplinks-container"],
        style: "light-grey",
        blocks: ["infosys-jumplinks"],
        defaultContent: []
      },
      {
        id: "section-3",
        name: "Highlights video",
        selector: ["div.section#video", "div.section.session-container"],
        style: "light-grey",
        blocks: ["infosys-video"],
        defaultContent: []
      },
      {
        id: "section-4",
        name: "Photo gallery - Partners, Analysts & Advisors Day",
        selector: ["div.section#partner", "main > div.section.photo-gallery-container:nth-of-type(4)"],
        style: null,
        blocks: ["infosys-photo-gallery"],
        defaultContent: []
      },
      {
        id: "section-5",
        name: "Photo gallery - Confluence Day 1",
        selector: ["div.section#day2", "main > div.section.photo-gallery-container:nth-of-type(5)"],
        style: null,
        blocks: ["infosys-photo-gallery"],
        defaultContent: []
      },
      {
        id: "section-6",
        name: "Photo gallery - Confluence Day 2",
        selector: ["div.section#day3", "main > div.section.photo-gallery-container:nth-of-type(6)"],
        style: null,
        blocks: ["infosys-photo-gallery"],
        defaultContent: []
      },
      {
        id: "section-7",
        name: "Photo gallery - Confluence Day 3",
        selector: ["div.section#day4", "main > div.section.photo-gallery-container:nth-of-type(7)"],
        style: null,
        blocks: ["infosys-photo-gallery"],
        defaultContent: []
      },
      {
        id: "section-8",
        name: "Photo gallery - Networking & Living Labs Walkthrough",
        selector: ["div.section#networking", "main > div.section.photo-gallery-container:nth-of-type(8)"],
        style: null,
        blocks: ["infosys-photo-gallery"],
        defaultContent: []
      }
    ]
  };
  var TARGET_FOLDER = ["", "infosys-poc"].join("/");
  var PAGE_METADATA = {
    template: "infosys",
    nav: `${TARGET_FOLDER}/nav`,
    footer: `${TARGET_FOLDER}/footer`
  };
  var parsers = {
    "infosys-banner": parse,
    "infosys-jumplinks": parse2,
    "infosys-video": parse3,
    "infosys-photo-gallery": parse4
  };
  var transformers = [transform, transform2];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((fn) => {
      try {
        fn(hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
          pageBlocks.push({ name: blockDef.name, selector, element });
        });
      });
    });
    return pageBlocks;
  }
  function createMetadata(main, document) {
    var _a, _b, _c;
    const meta = {};
    const ogTitle = (_a = document.querySelector('meta[property="og:title"]')) == null ? void 0 : _a.getAttribute("content");
    const title = (ogTitle || document.title || "").trim();
    if (title) meta.Title = title;
    const description = (_c = (_b = document.querySelector('meta[name="description"]')) == null ? void 0 : _b.getAttribute("content")) == null ? void 0 : _c.trim();
    if (description) meta.Description = description;
    Object.assign(meta, PAGE_METADATA);
    main.append(WebImporter.Blocks.getMetadataBlock(document, meta));
  }
  var import_infosys_photo_gallery_default = {
    transform: (payload) => {
      var _a;
      const { document, url, params } = payload;
      const main = document.body;
      const headTitle = ((_a = document.querySelector('meta[property="og:title"]')) == null ? void 0 : _a.getAttribute("content")) || document.title;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (!parser) return;
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      });
      executeTransformers("afterTransform", main, payload);
      main.appendChild(document.createElement("hr"));
      createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const pageName = rawPath.split("/").filter(Boolean).pop() || "index";
      const path = WebImporter.FileUtils.sanitizePath(`${TARGET_FOLDER}/${pageName}`);
      return [{
        element: main,
        path,
        report: { title: headTitle, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) }
      }];
    }
  };
  return __toCommonJS(import_infosys_photo_gallery_exports);
})();
