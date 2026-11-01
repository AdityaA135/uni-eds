/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
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

  // tools/importer/import-infosys-nav.js
  var import_infosys_nav_exports = {};
  __export(import_infosys_nav_exports, {
    default: () => import_infosys_nav_default
  });

  // tools/importer/parsers/infosys-header.js
  var LOGO_ALT = "Infosys Americas Confluence";
  function fieldCell(document, name, ...nodes) {
    const cell = document.createDocumentFragment();
    const content = nodes.filter(Boolean);
    if (content.length) {
      cell.appendChild(document.createComment(` field:${name} `));
      content.forEach((n) => cell.appendChild(n));
    }
    return cell;
  }
  function linkList(document, el) {
    const ul = document.createElement("ul");
    (el ? [...el.querySelectorAll("a")] : []).forEach((a) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = a.getAttribute("href");
      link.textContent = a.textContent.replace(/\s+/g, " ").trim();
      li.appendChild(link);
      ul.appendChild(li);
    });
    return ul.children.length ? ul : null;
  }
  function parse(element, { document }) {
    const rows = [...element.children];
    const [brandRow, listRow] = rows;
    const lists = listRow ? [...listRow.querySelectorAll("ul")] : [...element.querySelectorAll("ul")];
    const img = element.querySelector("img");
    let logo = null;
    if (img) {
      logo = document.createElement("img");
      logo.src = img.getAttribute("src");
      logo.alt = (img.getAttribute("alt") || "").trim() || LOGO_ALT;
    }
    const brandLink = (brandRow || element).querySelector("a");
    let logoLink = null;
    if (brandLink) {
      logoLink = document.createElement("a");
      logoLink.href = brandLink.getAttribute("href");
      logoLink.textContent = brandLink.getAttribute("href");
    }
    const cells = [
      [fieldCell(document, "logo", logo)],
      [fieldCell(document, "logoLink", logoLink)],
      [fieldCell(document, "menu", linkList(document, lists[0]))],
      [fieldCell(document, "siteLinks", linkList(document, lists[1]))]
    ];
    const block = WebImporter.Blocks.createBlock(document, { name: "infosys-header", cells });
    element.replaceWith(block);
  }

  // tools/importer/import-infosys-nav.js
  var PAGE_TEMPLATE = {
    name: "infosys-nav",
    urls: [
      "https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/nav.plain.html"
    ],
    description: "Infosys Confluence nav page (authored content, imported as its .plain.html): one infosys-header block",
    blocks: [
      { name: "infosys-header", instances: [".header"] }
    ],
    sections: []
  };
  var TARGET_FOLDER = ["", "infosys-poc"].join("/");
  var parsers = {
    "infosys-header": parse
  };
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
  var import_infosys_nav_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
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
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.plain\.html$/, "").replace(/\.html?$/, "");
      const pageName = rawPath.split("/").filter(Boolean).pop() || "index";
      const path = WebImporter.FileUtils.sanitizePath(`${TARGET_FOLDER}/${pageName}`);
      return [{
        element: main,
        path,
        report: { title: pageName, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) }
      }];
    }
  };
  return __toCommonJS(import_infosys_nav_exports);
})();
