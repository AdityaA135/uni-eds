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

  // tools/importer/import-infosys-footer.js
  var import_infosys_footer_exports = {};
  __export(import_infosys_footer_exports, {
    default: () => import_infosys_footer_default
  });

  // tools/importer/parsers/infosys-footer.js
  var LOGO_ALT = "Infosys Confluence";
  var LOGO_LINK = "https://www.infosys.com/confluence.html";
  var LINKS = {
    Americas: "https://www.infosys.com/confluence/americas-confluences.html",
    Insights: "https://www.infosys.com/confluence/insights.html",
    EMEA: "https://www.infosys.com/confluence/emea-confluences.html",
    Virtual: "https://www.infosys.com/confluence/virtual.html",
    APAC: "https://www.infosys.com/confluence/apac-confluences.html",
    "Terms of Use": "https://www.infosys.com/terms-of-use.html",
    "Privacy Statement": "https://www.infosys.com/privacy-statement.html",
    "Cookie Policy": "https://www.infosys.com/privacy-statement/cookie-policy.html",
    "Safe Harbour Provision": "https://www.infosys.com/safe-harbor-provision.html",
    Trademarks: "https://www.infosys.com/trademarks.html"
  };
  var SOURCE_SOCIAL_LINKS = [
    "https://www.facebook.com/InfosysConfluence/about/",
    "https://x.com/InfyConfluence",
    "https://www.linkedin.com/showcase/infosys-confluence/"
  ];
  var SOCIAL = [
    { label: "Facebook", test: /(^|\.)facebook\.com$/i },
    { label: "X", test: /(^|\.)(x|twitter)\.com$/i },
    { label: "LinkedIn", test: /(^|\.)linkedin\.com$/i }
  ];
  function hostOf(href) {
    try {
      return new URL(href).hostname;
    } catch (e) {
      return "";
    }
  }
  function fieldCell(document, name, ...nodes) {
    const cell = document.createDocumentFragment();
    const content = nodes.filter(Boolean);
    if (content.length) {
      cell.appendChild(document.createComment(` field:${name} `));
      content.forEach((n) => cell.appendChild(n));
    }
    return cell;
  }
  function textOf(el) {
    return ((el == null ? void 0 : el.textContent) || "").replace(/\s+/g, " ").trim();
  }
  function link(document, href, text) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    return a;
  }
  function list(document, links) {
    if (!links.length) return null;
    const ul = document.createElement("ul");
    links.forEach((a) => {
      const li = document.createElement("li");
      li.appendChild(a);
      ul.appendChild(li);
    });
    return ul;
  }
  function entryLink(document, cell) {
    const a = cell.querySelector("a");
    const text = textOf(cell);
    if (a && text) return link(document, a.getAttribute("href"), text);
    return LINKS[text] ? link(document, LINKS[text], text) : null;
  }
  function parse(element, { document }) {
    const entries = [...element.children];
    const [logoEntry, ...rest] = entries;
    const img = (logoEntry || element).querySelector("img");
    let logo = null;
    if (img) {
      logo = document.createElement("img");
      logo.src = img.getAttribute("src");
      logo.alt = (img.getAttribute("alt") || "").trim() || LOGO_ALT;
    }
    const columns = [];
    const legal = [];
    let social = null;
    let copyright = "";
    rest.forEach((entry) => {
      const cells2 = [...entry.children];
      let hrefs = [...entry.querySelectorAll("a")].map((a) => a.getAttribute("href") || "");
      if (!hrefs.length && /^follow us$/i.test(textOf(entry))) hrefs = SOURCE_SOCIAL_LINKS;
      if (hrefs.length && hrefs.every((h) => SOCIAL.some((s) => s.test.test(hostOf(h))))) {
        const label = cells2.filter((c) => !c.querySelector("a")).map(textOf).filter(Boolean).join(" ");
        const links2 = hrefs.map((h) => link(document, h, SOCIAL.find((s) => s.test.test(hostOf(h))).label));
        social = { label, links: links2 };
        return;
      }
      const text = textOf(entry);
      if (!text) return;
      if (/copyright|©/i.test(text)) {
        copyright = text;
        return;
      }
      const links = cells2.map((c) => entryLink(document, c)).filter(Boolean);
      if (cells2.length > 1 || ["Americas", "EMEA", "APAC", "Insights", "Virtual"].includes(text)) {
        columns.push(links);
      } else {
        legal.push(...links);
      }
    });
    let logoLink = null;
    logoLink = link(document, LOGO_LINK, LOGO_LINK);
    const cells = [
      [fieldCell(document, "logo", logo)],
      [fieldCell(document, "logoLink", logoLink)],
      [fieldCell(document, "legalLinks", list(document, legal))],
      [fieldCell(document, "copyright", copyright ? document.createTextNode(copyright) : null)]
    ];
    columns.forEach((links) => {
      cells.push(["infosys-footer-column", fieldCell(document, "links", list(document, links))]);
    });
    if (social) {
      const p = document.createElement("p");
      p.textContent = social.label;
      cells.push(["infosys-footer-column", fieldCell(document, "links", social.label ? p : null, list(document, social.links))]);
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "infosys-footer", cells });
    element.replaceWith(block);
  }

  // tools/importer/import-infosys-footer.js
  var PAGE_TEMPLATE = {
    name: "infosys-footer",
    urls: [
      "https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/footer.plain.html"
    ],
    description: "Infosys Confluence footer page (authored content, imported as its .plain.html): one infosys-footer block",
    blocks: [
      { name: "infosys-footer", instances: [".footer"] }
    ],
    sections: []
  };
  var TARGET_FOLDER = ["", "infosys-poc"].join("/");
  var parsers = {
    "infosys-footer": parse
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
  var import_infosys_footer_default = {
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
  return __toCommonJS(import_infosys_footer_exports);
})();
