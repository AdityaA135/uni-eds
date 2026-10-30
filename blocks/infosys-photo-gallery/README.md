# infosys-photo-gallery

Custom block (structural base: **cards**), migrated from https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/photo-gallery.

Event photo galleries: one card per topic, each opening a modal photo slider. Put the gallery title as an h2 above the block and set the section Anchor for jump links.

## Authoring (Universal Editor / xwalk)

Model: `standalone`

- Infosys Gallery Topic row: title cell + cover picture cell. It starts a new card.
- Infosys Gallery Photo rows after a topic: one picture cell each; they are the photos the topic's modal shows.
- Photos before the first topic are ignored; a topic without photos shows its cover in the modal.
- Put the gallery title as an h2 (Title component) above the block, and set the section Anchor so jump links can reach it.

## Universal Editor fields

- Item `infosys-gallery-topic`:
  - `title` (text) - Topic title
  - `image` (reference) - Cover image
  - `imageAlt` (text) - Cover image alt text
- Item `infosys-gallery-photo`:
  - `image` (reference) - Photo
  - `imageAlt` (text) - Alt text
- Filter `infosys-photo-gallery` allows: `infosys-gallery-topic`, `infosys-gallery-photo`

## Supported variations

No variations.

## Styling

Infosys styles are scoped to this block (and to `body.infosys`, set by page metadata `template: infosys`), so other pages are unaffected. The Infosys fonts are not in this repo: the block uses the stacks `--infosys-body-font` (myriad-pro, arial, sans-serif) and `--infosys-heading-font` (tungstenw05-medium, oswald, sans-serif). The CSS is structural; the design pass refines it.
