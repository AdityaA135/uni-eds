/* eslint-disable no-console, import/no-unresolved, import/no-extraneous-dependencies */
/**
 * Writes the AEM page content (JCR XML) of the imported Infosys pages, for installing them in
 * AEM (CRXDE / a content package), like migration-work/jcr-content/jsw-final-poc.xml.
 *
 * Run from the project root after the import and localize-infosys-assets.mjs:
 *   node tools/importer/export-infosys-jcr.mjs <converter node_modules dir>
 * where the directory holds @adobe/helix-html2md and @adobe/helix-md2jcr (the content-import
 * scripts' node_modules). It converts content/infosys-poc/*.plain.html against this project's
 * component models (models/_component-*.json merged, as `npm run build:json` does) and writes
 *   migration-work/jcr-content/infosys-poc/<page>.xml
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PAGES_DIR = path.join('content', 'infosys-poc');
const OUT_DIR = path.join('migration-work', 'jcr-content', 'infosys-poc');
const SILENT = {
  info() {}, debug() {}, trace() {}, warn() {}, error() {},
};

async function load(modulesDir, name) {
  const require = createRequire(path.join(path.resolve(modulesDir), 'noop.js'));
  return import(pathToFileURL(require.resolve(name)).href);
}

async function main() {
  const modulesDir = process.argv[2];
  if (!modulesDir) throw new Error('usage: node tools/importer/export-infosys-jcr.mjs <converter node_modules dir>');
  const { html2md } = await load(modulesDir, '@adobe/helix-html2md');
  const { md2jcr } = await load(modulesDir, '@adobe/helix-md2jcr');
  // the same merged models the repo root component-*.json files hold (npm run build:json)
  const [models, definition, filters] = await Promise.all(
    ['component-models.json', 'component-definition.json', 'component-filters.json']
      .map(async (f) => JSON.parse(await readFile(f, 'utf8'))),
  );
  await mkdir(OUT_DIR, { recursive: true });
  const pages = (await readdir(PAGES_DIR)).filter((f) => f.endsWith('.plain.html'));
  for (const page of pages) {
    const html = await readFile(path.join(PAGES_DIR, page), 'utf8');
    const doc = html.includes('<main') ? html : `<body><main>${html}</main></body>`;
    const markdown = await html2md(doc, { log: SILENT });
    const xml = await md2jcr(markdown, {
      models, definition, filters, log: SILENT,
    });
    const out = path.join(OUT_DIR, page.replace(/\.plain\.html$/, '.xml'));
    await writeFile(out, xml);
    console.log(`${out} (${xml.length} bytes)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
