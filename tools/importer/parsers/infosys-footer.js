/* eslint-disable */
/* global WebImporter */

/**
 * Parser for infosys-footer (xwalk model: logo + logoAlt, logoLink, legalLinks, copyright;
 * items infosys-footer-column with a links list).
 * Source: the footer page as authored (footer.plain.html), its "footer" block, one cell per
 * entry: [logo] [Americas | Insights] [EMEA | Virtual] [APAC] [Follow Us | social links...]
 * [Terms of Use] [Privacy Statement] [Cookie Policy] [Safe Harbour Provision] [] [copyright].
 * The source's labels are plain text and its footer script links them (getLink in
 * /blocks/confluence/footer/footer.js): here they become authored links, the same URLs.
 * Output: the 4 parent rows, then one item row per link column, the social column last
 * (its "Follow Us" label as a paragraph before the links).
 */
const LOGO_ALT = 'Infosys Confluence';
const LOGO_LINK = 'https://www.infosys.com/confluence.html';
const LINKS = {
  Americas: 'https://www.infosys.com/confluence/americas-confluences.html',
  Insights: 'https://www.infosys.com/confluence/insights.html',
  EMEA: 'https://www.infosys.com/confluence/emea-confluences.html',
  Virtual: 'https://www.infosys.com/confluence/virtual.html',
  APAC: 'https://www.infosys.com/confluence/apac-confluences.html',
  'Terms of Use': 'https://www.infosys.com/terms-of-use.html',
  'Privacy Statement': 'https://www.infosys.com/privacy-statement.html',
  'Cookie Policy': 'https://www.infosys.com/privacy-statement/cookie-policy.html',
  'Safe Harbour Provision': 'https://www.infosys.com/safe-harbor-provision.html',
  Trademarks: 'https://www.infosys.com/trademarks.html',
};
// the source footer's social links (footer.plain.html, the "Follow Us" entry)
const SOURCE_SOCIAL_LINKS = [
  'https://www.facebook.com/InfosysConfluence/about/',
  'https://x.com/InfyConfluence',
  'https://www.linkedin.com/showcase/infosys-confluence/',
];

// matched against the link's host name
const SOCIAL = [
  { label: 'Facebook', test: /(^|\.)facebook\.com$/i },
  { label: 'X', test: /(^|\.)(x|twitter)\.com$/i },
  { label: 'LinkedIn', test: /(^|\.)linkedin\.com$/i },
];

function hostOf(href) {
  try {
    return new URL(href).hostname;
  } catch (e) {
    return '';
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
  return (el?.textContent || '').replace(/\s+/g, ' ').trim();
}

function link(document, href, text) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  return a;
}

function list(document, links) {
  if (!links.length) return null;
  const ul = document.createElement('ul');
  links.forEach((a) => {
    const li = document.createElement('li');
    li.appendChild(a);
    ul.appendChild(li);
  });
  return ul;
}

/** the entry's own link, or the source footer script's link for its label */
function entryLink(document, cell) {
  const a = cell.querySelector('a');
  const text = textOf(cell);
  if (a && text) return link(document, a.getAttribute('href'), text);
  return LINKS[text] ? link(document, LINKS[text], text) : null;
}

export default function parse(element, { document }) {
  const entries = [...element.children];
  const [logoEntry, ...rest] = entries;

  const img = (logoEntry || element).querySelector('img');
  let logo = null;
  if (img) {
    logo = document.createElement('img');
    logo.src = img.getAttribute('src');
    logo.alt = (img.getAttribute('alt') || '').trim() || LOGO_ALT;
  }

  const columns = [];
  const legal = [];
  let social = null;
  let copyright = '';
  rest.forEach((entry) => {
    const cells = [...entry.children];
    let hrefs = [...entry.querySelectorAll('a')].map((a) => a.getAttribute('href') || '');
    // the importer drops the source's icon-only links (<a><span class="icon"></span></a>)
    // before parsing, leaving "Follow Us" and empty cells: their URLs are the source footer's
    if (!hrefs.length && /^follow us$/i.test(textOf(entry))) hrefs = SOURCE_SOCIAL_LINKS;
    if (hrefs.length && hrefs.every((h) => SOCIAL.some((s) => s.test.test(hostOf(h))))) {
      // [Follow Us] [facebook] [x] [linkedin]
      const label = cells.filter((c) => !c.querySelector('a')).map(textOf).filter(Boolean).join(' ');
      const links = hrefs.map((h) => link(document, h, SOCIAL.find((s) => s.test.test(hostOf(h))).label));
      social = { label, links };
      return;
    }
    const text = textOf(entry);
    if (!text) return;
    if (/copyright|©/i.test(text)) {
      copyright = text;
      return;
    }
    const links = cells.map((c) => entryLink(document, c)).filter(Boolean);
    if (cells.length > 1 || ['Americas', 'EMEA', 'APAC', 'Insights', 'Virtual'].includes(text)) {
      columns.push(links);
    } else {
      legal.push(...links);
    }
  });

  let logoLink = null;
  logoLink = link(document, LOGO_LINK, LOGO_LINK);

  const cells = [
    [fieldCell(document, 'logo', logo)],
    [fieldCell(document, 'logoLink', logoLink)],
    [fieldCell(document, 'legalLinks', list(document, legal))],
    [fieldCell(document, 'copyright', copyright ? document.createTextNode(copyright) : null)],
  ];
  columns.forEach((links) => {
    cells.push(['infosys-footer-column', fieldCell(document, 'links', list(document, links))]);
  });
  if (social) {
    const p = document.createElement('p');
    p.textContent = social.label;
    cells.push(['infosys-footer-column', fieldCell(document, 'links', social.label ? p : null, list(document, social.links))]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'infosys-footer', cells });
  element.replaceWith(block);
}
