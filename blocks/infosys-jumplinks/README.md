# infosys-jumplinks

Custom block (structural base: **cards**), migrated from https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/photo-gallery.

In-page navigation to sections that set the section Anchor field (e.g. day2), usually in a Light grey section under the banner.

## Authoring (Universal Editor / xwalk)

Model: `standalone`

- One row per Infosys Jumplink item: a single link. Use #anchor (a section's Anchor field) to link within the page; bookmark://x and https://#x are turned into #x.

## Universal Editor fields

- Item `infosys-jumplink`:
  - `link` (aem-content) - Link: An anchor on this page, e.g. #day2 (a section's Anchor), or any page
  - `linkText` (text) - Link text
- Filter `infosys-jumplinks` allows: `infosys-jumplink`

## Supported variations

No variations.

## Styling

Infosys styles are scoped to this block (and to `body.infosys`, set by page metadata `template: infosys`), so other pages are unaffected. The Infosys fonts are not in this repo: the block uses the stacks `--infosys-body-font` (myriad-pro, arial, sans-serif) and `--infosys-heading-font` (tungstenw05-medium, oswald, sans-serif). The CSS is structural; the design pass refines it.
