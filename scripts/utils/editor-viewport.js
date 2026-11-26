const SCREEN_HEIGHT = 900;
const HAS_UNIT = /(?:\d|\.)(?:s|d|l)?vh\b/;
const UNIT = /(-?(?:\d+\.?\d*|\.\d+))(?:s|d|l)?vh\b/g;

const done = new WeakSet();

const toPx = (text) => text.replace(UNIT, (_, n) => `${+((n * SCREEN_HEIGHT) / 100).toFixed(3)}px`);

function fixRules(rules) {
  [...rules].forEach((rule) => {
    if (rule.style && HAS_UNIT.test(rule.style.cssText)) {
      rule.style.cssText = toPx(rule.style.cssText);
    }
    if (rule.cssRules?.length) fixRules(rule.cssRules);
  });
}

function fixSheet(sheet) {
  if (!sheet || done.has(sheet)) return;
  let rules;
  try {
    rules = sheet.cssRules;
  } catch {
    return;
  }
  done.add(sheet);
  fixRules(rules);
}

function watch(node) {
  if (!(node instanceof HTMLLinkElement || node instanceof HTMLStyleElement)) return;
  if (node.sheet) fixSheet(node.sheet);
  node.addEventListener('load', () => fixSheet(node.sheet));
}

export default function fixEditorViewport() {
  [...document.styleSheets].forEach(fixSheet);
  document.querySelectorAll('link[rel="stylesheet"], style').forEach(watch);
  new MutationObserver((records) => {
    records.forEach(({ addedNodes }) => addedNodes.forEach(watch));
  }).observe(document.head, { childList: true });
}
