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

  // tools/importer/import-infosys-web-photo-gallery.js
  var import_infosys_web_photo_gallery_exports = {};
  __export(import_infosys_web_photo_gallery_exports, {
    default: () => import_infosys_web_photo_gallery_default
  });

  // tools/importer/parsers/photo-gallery.js
  function picture(document, img) {
    const out = document.createElement("img");
    out.src = img.getAttribute("src");
    const alt = img.getAttribute("alt");
    out.alt = alt && alt !== "Slider image" ? alt : "";
    return out;
  }
  function hinted(document, name, ...content) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${name} `));
    content.forEach((node) => frag.appendChild(node));
    return frag;
  }
  function notCloned(node) {
    return !node.closest(".cloned");
  }
  function readDecorated(element, document) {
    var _a;
    const titleText = ((_a = element.querySelector(".gallery-title")) == null ? void 0 : _a.textContent.trim()) || "";
    const cards = [...element.querySelectorAll(".list_slider_carousel .item")].filter(notCloned).filter((item) => item.querySelector("img"));
    const topics = cards.map((item) => {
      var _a2;
      const link = item.querySelector("[data-bs-target]");
      const modal = link ? element.querySelector(link.getAttribute("data-bs-target")) || document.querySelector(link.getAttribute("data-bs-target")) : null;
      const photos = modal ? [...modal.querySelectorAll(".list_slider_carousel_modal .item img")].filter(notCloned) : [];
      return {
        title: ((_a2 = item.querySelector("h2, .h2")) == null ? void 0 : _a2.textContent.trim()) || "",
        cover: item.querySelector("img"),
        photos
      };
    });
    return { titleText, topics };
  }
  function readPlain(block) {
    const rows = [...block.children];
    const titleRow = rows[0] && !rows[0].querySelector("img") ? rows[0] : null;
    const topics = rows.filter((row) => row !== titleRow).map((row) => {
      var _a;
      const imgs = [...row.querySelectorAll("img")];
      return {
        title: ((_a = row.children[0]) == null ? void 0 : _a.textContent.trim()) || "",
        cover: imgs[0],
        photos: imgs.slice(1)
      };
    });
    return { titleText: (titleRow == null ? void 0 : titleRow.textContent.trim()) || "", topics };
  }
  function parse(element, { document }) {
    const plain = element.querySelector(".photo-gallery:not(.photo-gallery-wrapper)");
    const { titleText, topics } = element.querySelector(".list_slider_carousel") || !plain ? readDecorated(element, document) : readPlain(plain);
    const cells = [];
    cells.push([titleText ? hinted(document, "title", document.createTextNode(titleText)) : ""]);
    topics.forEach((topic) => {
      const titleCell = topic.title ? hinted(document, "title", document.createTextNode(topic.title)) : "";
      const coverCell = topic.cover ? hinted(document, "cover", picture(document, topic.cover)) : "";
      let photosCell = "";
      if (topic.photos.length) {
        const list = document.createElement("ul");
        topic.photos.forEach((img) => {
          const li = document.createElement("li");
          li.append(picture(document, img));
          list.append(li);
        });
        photosCell = hinted(document, "photos", list);
      }
      cells.push([titleCell, coverCell, photosCell]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "photo-gallery", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/infosys-web-cleanup.js
  function transform(hookName, element, payload) {
    var _a;
    if (hookName !== "beforeTransform") return;
    const { document } = payload;
    const keep = (((_a = payload.template) == null ? void 0 : _a.sections) || []).flatMap((s) => s.selector).map((sel) => document.querySelector(sel)).filter(Boolean);
    if (!keep.length) return;
    WebImporter.DOMUtils.remove(element, [
      "header",
      "footer",
      "#onetrust-consent-sdk",
      "script",
      "style",
      "noscript",
      "link",
      "iframe"
    ]);
    const main = element.querySelector("main") || element;
    const fresh = document.createElement("main");
    keep.forEach((section) => fresh.append(section));
    main.replaceWith(fresh);
    [...element.children].filter((child) => child !== fresh).forEach((child) => child.remove());
  }

  // tools/importer/import-infosys-web-photo-gallery.js
  var PAGE_TEMPLATE = {
    name: "infosys-web-photo-gallery",
    urls: [
      "https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/photo-gallery"
    ],
    description: "Infosys Confluence photo gallery: the Day 1 gallery section (#day2) as one photo-gallery block, imported to /infosys-web/photo-gallery",
    blocks: [
      {
        name: "photo-gallery",
        instances: ["div.section#day2 .photo-gallery-wrapper"]
      }
    ],
    sections: [
      {
        id: "day2",
        name: "Confluence Day 1 photo gallery",
        selector: ["div.section#day2"],
        style: null,
        blocks: ["photo-gallery"],
        defaultContent: []
      }
    ]
  };
  var TARGET_PATH = "/infosys-web/photo-gallery";
  var parsers = { "photo-gallery": parse };
  var transformers = [transform];
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
  var import_infosys_web_photo_gallery_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
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
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      return [{
        element: main,
        path: WebImporter.FileUtils.sanitizePath(TARGET_PATH),
        report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) }
      }];
    }
  };
  return __toCommonJS(import_infosys_web_photo_gallery_exports);
})();
