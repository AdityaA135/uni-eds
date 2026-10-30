/* eslint-disable no-console */
/**
 * Moves the images of the imported Infosys pages into this project's DAM folder.
 *
 * Run from the project root after each import of the infosys-* templates:
 *   node tools/importer/localize-infosys-assets.mjs
 *
 * For every <img> in content/infosys-poc/*.plain.html that points at the source site's media
 * (https://main--infosyseds--infosys-is-dotcom.aem.live/.../media_<hash>.<ext>?...), it
 * downloads the image once (at up to 2000px wide) to
 *   content/content/dam/uni-eds/infosys-assets/media_<hash>.<ext>
 * (upload that folder to the AEM DAM at /content/dam/uni-eds/infosys-assets/) and rewrites
 * the img src to that DAM path. Images already downloaded are not fetched again.
 */
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_HOST = 'main--infosyseds--infosys-is-dotcom.aem.live';
const PAGES_DIR = path.join('content', 'infosys-poc');
const DAM_FOLDER = ['', 'content', 'dam', 'uni-eds', 'infosys-assets'].join('/');
const ASSETS_DIR = path.join('content', ...DAM_FOLDER.split('/').filter(Boolean));
const MEDIA = /^media_[0-9a-f]+\.(jpe?g|png|gif|webp|svg)$/i;

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch (e) {
    return false;
  }
}

async function download(src, file) {
  const url = new URL(src);
  const ext = path.extname(url.pathname).slice(1).toLowerCase();
  url.search = '';
  if (ext !== 'svg') {
    url.searchParams.set('width', '2000');
    url.searchParams.set('format', ext === 'png' ? 'png' : 'jpg');
    url.searchParams.set('optimize', 'medium');
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  await mkdir(ASSETS_DIR, { recursive: true });
  const pages = (await readdir(PAGES_DIR)).filter((f) => f.endsWith('.plain.html'));
  const done = new Map();
  let fetched = 0;
  for (const page of pages) {
    const file = path.join(PAGES_DIR, page);
    let html = await readFile(file, 'utf8');
    const srcs = [...html.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    let changed = 0;
    for (const src of new Set(srcs)) {
      let url;
      try {
        url = new URL(src);
      } catch (e) {
        continue; // already a project path
      }
      const name = path.basename(url.pathname);
      if (url.hostname !== SOURCE_HOST || !MEDIA.test(name)) continue;
      const target = path.join(ASSETS_DIR, name);
      if (!done.has(name)) {
        if (!(await exists(target))) {
          await download(src, target);
          fetched += 1;
        }
        done.set(name, `${DAM_FOLDER}/${name}`);
      }
      const escaped = src.replace(/&/g, '&amp;');
      html = html.split(`src="${escaped}"`).join(`src="${done.get(name)}"`);
      html = html.split(`src="${src}"`).join(`src="${done.get(name)}"`);
      changed += 1;
    }
    if (changed) await writeFile(file, html);
    console.log(`${page}: ${changed} image(s) now in ${DAM_FOLDER}`);
  }
  console.log(`${done.size} unique image(s), ${fetched} downloaded to ${ASSETS_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
