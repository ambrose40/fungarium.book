# Project memory

## Maintenance agreement

Update this file for **every changeset**, as requested by the user, including
documentation-only work. Record changes, decisions, verification, and unresolved
follow-ups before completing the changeset. Update the README when affected
behavior or workflows change. Keep these updates with their implementation in
the same commit. Persistent agent guidance is in `AGENTS.md`; commit messages
follow `CONTRIBUTING.md`.

## Durable project context

- **Product:** Fungarium.INFO Encyclopedia, a Vue 3 + Vite static photographic
  encyclopedia, with one gallery card and detail page per scientific taxon.
- **Design:** black/charcoal theme, original mushroom branding, 3:2 species-photo
  frames, and the square annual TopNine slideshow. The user prioritizes beautiful
  photographs on the first view, especially on small screens, and prefers larger
  single-column species cards on phones.
- **Gallery:** `src/views/GalleryView.vue` owns search, filtering, sorting, and
  pagination. `src/dark-theme.css` supplies the dark palette and layout overrides
  after `src/style.css`.
- **Filtering:** selections are URL-backed; genus and family replace each other.
  Mycological filters are additive, with OR within a category and AND across
  categories. Closing the filter panel must preserve selections.
- **Scientific source:** the latest filename-dated caption supplies the entire
  taxon's scientific profile. Older encounters retain their own metadata and
  full original captions. Source rules and generated outputs are in the README.
- **Local assets:** caption archives, support artwork, downloaded post photos,
  thumbnails, and downloader session/checkpoint files follow `.gitignore`.
  Generated catalog JSON, selected branding, and TopNine assets are tracked.
- **Deployment:** hash routing supports static hosting; production hosting at
  `/encyclopedia/` requires `npm run build:encyclopedia`. Root browser checks use
  a root build. Browser checks use installed Chrome.
- **Commits:** Conventional Commits, imperative summary around 72 characters,
  focused scope, and a body describing significant behavior and verification.

## Recent changesets

### 2026-10-23 — Photo-first gallery and persistent changeset memory

- Replaced the always-expanded filter block with a compact search row and a
  **Filters** disclosure, collapsed by default on all screen sizes. Its badge
  counts selected taxonomy, year, initial-letter, hashtag, and characteristic
  filters; search and search scope remain available outside the panel.
- Kept results, active chips, sorting, and clear controls accessible outside the
  panel. Added a **Show … species** button that closes it and returns to photos.
- Changed **Explore the collection** to focus and scroll directly to
  `#collection-photos`, accounting for the sticky header and reduced motion.
  Wait for Vue's next render before scrolling after the panel closes.
- At widths up to 600 px, moved TopNine photos before the introduction, compacted
  the introduction, and changed species cards to one full-width column with
  larger captions. Removed the decorative photo side note on phones and
  constrained the search scope selector to avoid horizontal overflow.
- Updated browser checks for the disclosure and added coverage for first-view
  photography, full-width mobile cards, direct photo navigation, and retained
  selections when closing/reopening filters. Reviewed mobile-intro and desktop
  gallery screenshots. The user confirmed the layout works.
- Added `AGENTS.md` and this memory file to persist the user's request to update
  project memory with each changeset. Updated README behavior documentation and
  the contribution workflow.
- **Verification:** `npm run build` passed; after the final layout fixes,
  `npx vite build --logLevel error` and `npm run test:ui` passed (23 browser tests).
  `git diff --check` passed. The full Node.js and subpath suites were not run for
  this UI changeset.
- **Unresolved follow-ups:** none identified.
