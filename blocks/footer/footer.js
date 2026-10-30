import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // a footer page holding an infosys-footer block (decorated by loadFragment)
  // replaces the default footer
  const infosysFooter = fragment?.querySelector('.infosys-footer');
  if (infosysFooter) {
    block.replaceChildren(infosysFooter);
    block.closest('footer')?.classList.add('infosys');
    return;
  }

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  block.append(footer);
}
