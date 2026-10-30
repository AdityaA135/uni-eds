# infosys-header

Custom block (structural base: **infosys-header**), migrated from https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/photo-gallery.

Only on the Infosys nav page (e.g. /infosys-poc/nav); blocks/header hands over to it.

## Authoring (Universal Editor / xwalk)

Model: `standalone`

- Rows: [logo picture (alt from Logo alt text)], [logo link], [menu links: a list], [site links: a list].
- Authored once on the nav page (e.g. /infosys-poc/nav); blocks/header/header.js shows this block instead of the default nav when the nav fragment contains it.

## Universal Editor fields

- Block model `infosys-header`:
  - `logo` (reference) - Logo
  - `logoAlt` (text) - Logo alt text
  - `logoLink` (aem-content) - Logo link
  - `menu` (richtext) - Menu links: A list of links, shown in the menu
  - `siteLinks` (richtext) - Site links: A list of links, shown as buttons under the menu

## Supported variations

No variations.

## Styling

Infosys styles are scoped to this block (and to `body.infosys`, set by page metadata `template: infosys`), so other pages are unaffected. The Infosys fonts are not in this repo: the block uses the stacks `--infosys-body-font` (myriad-pro, arial, sans-serif) and `--infosys-heading-font` (tungstenw05-medium, oswald, sans-serif). The CSS is structural; the design pass refines it.
