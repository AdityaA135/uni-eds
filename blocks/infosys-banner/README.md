# infosys-banner

Custom block (structural base: **hero**), migrated from https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/photo-gallery.

Page heading band at the top of Infosys Confluence pages; the fixed infosys-header overlays it.

## Authoring (Universal Editor / xwalk)

Model: `standalone`

- Row 1: background colour (text starting with #, default #df9926).
- Row 2: title (rendered as the page h1).

## Universal Editor fields

- Block model `infosys-banner`:
  - `color` (text) - Background colour: A hex colour, e.g. #df9926
  - `title` (text) - Title: Shown as the page heading

## Supported variations

No variations.

## Styling

Infosys styles are scoped to this block (and to `body.infosys`, set by page metadata `template: infosys`), so other pages are unaffected. The Infosys fonts are not in this repo: the block uses the stacks `--infosys-body-font` (myriad-pro, arial, sans-serif) and `--infosys-heading-font` (tungstenw05-medium, oswald, sans-serif). The CSS is structural; the design pass refines it.
