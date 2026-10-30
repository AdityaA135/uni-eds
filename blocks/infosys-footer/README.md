# infosys-footer

Custom block (structural base: **infosys-footer**), migrated from https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/photo-gallery.

Only on the Infosys footer page (e.g. /infosys-poc/footer); blocks/footer hands over to it.

## Authoring (Universal Editor / xwalk)

Model: `standalone`

- Block rows in order: [logo], [logo link], [social title], [social links list], [legal links list], [copyright]. Rows are read by position, so keep all six fields (empty is fine).
- Then one Infosys Footer Column item per link column (a list of links).
- Social icons are picked from the link host: facebook.com, x.com / twitter.com, linkedin.com (icons in /icons).
- Authored once on the footer page (e.g. /infosys-poc/footer); blocks/footer/footer.js hands over to it.

## Universal Editor fields

- Block model `infosys-footer`:
  - `logo` (reference) - Logo
  - `logoAlt` (text) - Logo alt text
  - `logoLink` (aem-content) - Logo link
  - `socialTitle` (text) - Social title
  - `socialLinks` (richtext) - Social links: A list of links: Facebook, X, LinkedIn (the icon follows the link)
  - `legalLinks` (richtext) - Legal links
  - `copyright` (text) - Copyright
- Item `infosys-footer-column`:
  - `links` (richtext) - Links: A list of links for this column
- Filter `infosys-footer` allows: `infosys-footer-column`

## Supported variations

No variations.

## Styling

Infosys styles are scoped to this block (and to `body.infosys`, set by page metadata `template: infosys`), so other pages are unaffected. The Infosys fonts are not in this repo: the block uses the stacks `--infosys-body-font` (myriad-pro, arial, sans-serif) and `--infosys-heading-font` (tungstenw05-medium, oswald, sans-serif). The CSS is structural; the design pass refines it.
