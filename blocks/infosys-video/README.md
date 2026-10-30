# infosys-video

Custom block (structural base: **columns**), migrated from https://main--infosyseds--infosys-is-dotcom.aem.live/confluence/2026/us/photo-gallery.

One highlight video (Vidyard or YouTube) with its title beside it, usually in a Light grey section.

## Authoring (Universal Editor / xwalk)

Model: `standalone`

- Row 1: video URL (play.vidyard.com or YouTube watch / youtu.be links are converted to embed URLs).
- Row 2: title (rendered as h2).

## Universal Editor fields

- Block model `infosys-video`:
  - `video` (text) - Video URL: A Vidyard (play.vidyard.com) or YouTube link
  - `title` (text) - Title

## Supported variations

No variations.

## Styling

Infosys styles are scoped to this block (and to `body.infosys`, set by page metadata `template: infosys`), so other pages are unaffected. The Infosys fonts are not in this repo: the block uses the stacks `--infosys-body-font` (myriad-pro, arial, sans-serif) and `--infosys-heading-font` (tungstenw05-medium, oswald, sans-serif). The CSS is structural; the design pass refines it.
