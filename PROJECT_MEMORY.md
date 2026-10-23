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
  categories. Closing the filter panel must preserve selections. Thumbnail family
  badges are native filter links that preserve other selections; the photo and
  caption independently open the species page. Keep these links as siblings,
  never nested anchors.
- **Scientific search:** generate fields and searchable category text from each
  taxon's latest scientific traits. `scope=trait:<id>` selects one category for
  the main search; `sc.<id>` adds independent description fields, combined with
  AND. All-fields search includes descriptions; Scientific name stays name-only.
  Category options include specialist structures and normalize label casing.
- **Organism groups:** Fungi and Slime moulds are independent checkboxes, both
  checked by default. `organisms=fungi|slime-moulds|none` restricts the collection;
  omission means both. Recorded slime-mould taxonomy overrides historical mushroom
  markers. Use the latest caption, without genus hardcoding or old-profile
  backfilling. Unclassified taxa remain in the default both-groups view.
- **Scientific source:** captions, text metadata, and local Bash helpers live in
  `instagram-meta/`, resolved through `scripts/project-paths.mjs`. The latest
  filename-dated caption supplies the entire taxon's scientific profile. Older
  encounters retain their own metadata and full original captions. Recorded
  `sourceFile` values remain basenames relative to `instagram-meta/`. Source
  rules and generated outputs are in the README.
- **Local assets:** the entire `instagram-meta/` archive, support artwork,
  downloaded post photos, thumbnails, and downloader session/checkpoint files
  follow `.gitignore`.
  Generated catalog JSON, selected branding, and TopNine assets are tracked.
- **Deployment:** hash routing supports static hosting; production hosting at
  `/encyclopedia/` requires `npm run build:encyclopedia`. Root browser checks use
  a root build. Browser checks use installed Chrome.
- **Observation maps:** `ObservationMap.vue` renders one lazy JavaScript Google
  Map per species above its encounter list, collecting pins from all usable
  observation coordinates, including historical and collapsed encounters. Fit
  all locations; use zoom 14 for a single location. Keep the 300 px desktop /
  260 px phone frame and retain individual external coordinate links. Share the
  API through `src/lib/google-maps.mjs` and reuse the existing coordinate parser.
  Vite reads `GOOGLE_MAPS_API_KEY` (environment or `.env.local`) before the ignored
  `secrets/maps-api.key`; an empty environment value disables maps. The browser
  key is compiled into the client bundle; never commit its literal value or copy
  the secrets folder into public assets. Automated browser suites mock Maps API
  requests via `tests/helpers/browser.js`.
- **Commits:** Conventional Commits, imperative summary around 72 characters,
  focused scope, and a body describing significant behavior and verification.

## Recent changesets

### 2026-10-23 — Scientific category search and organism group filters

- Added main-search scopes and optional independent text fields for categories
  from the latest scientific profiles. The current generated list has 41 fields,
  including all requested common categories and specialist structures such as
  peridium, plasmodium, perithecia, and sporangia. Normalize category casing and
  count distinct taxa with recorded text.
- Put multi-field search under the collapsed Filters panel in its own disclosure:
  choose a category, add a field, and combine its words and other categories with
  AND. Added removable active chips, field/category clearing, active counts, and
  URL-backed `sc.*` values. `scope=trait:<id>` selects a category for the main
  search, and All fields now includes scientific description text. Scientific
  name remains the dedicated name-only mode.
- Added independent Fungi/Slime moulds checkboxes, both on by default, including
  an explicit neither-selected empty state and reset controls. Source-based
  classification finds 320 fungi and 7 slime moulds. Recorded Myxogastria and
  Protosteliomycetes classifications correctly include older slime-mould captions
  that use 🍄; unresolved classifications are retained in the default view.
- Added `scientific-search.mjs`, `organism-groups.mjs`, and
  `ScientificSearchFilters.vue`. Regenerated catalog JSON with latest category
  text, field definitions/counts, and organism groups. Original captions and
  scientific profile paragraphs were not edited.
- New searches/group restrictions combine with taxonomy, characteristics, year,
  letter, hashtags, and sort, preserving genus/family exclusivity and native
  family-link history. Contextual characteristic counts include the new filters.
- Added unit coverage for field boundaries, generated latest-only text, source
  classification, query preservation/clearing, and unknown categories. Browser
  coverage includes both search styles, specialist categories, every checkbox
  combination, resets, reload/history, family links, and 320 px mobile layouts.
  Reviewed the mobile search-controls screenshot and updated README behavior,
  generated-data documentation, query examples, and test guidance.
- **Verification:** `npm test` passed (65 tests), `npm run test:ui` passed
  (34 tests), and `npx playwright test --config=playwright.subpath.config.js`
  passed (8 tests). Root and `/encyclopedia/` production builds passed.
  `git diff --check` passed. Catalog totals remain 388 observations, 327 taxa,
  and 1,641 photos. Compared regenerated records with HEAD and confirmed all 327
  existing scientific profiles and observation records are preserved alongside
  the added search/group metadata.
- **Build state:** `dist/` is currently configured for `/encyclopedia/`.
- **Unresolved follow-ups:** none identified.

### 2026-10-23 — Consolidate local Instagram metadata in instagram-meta

- Moved all 401 root `.txt` files and both root `.sh` files into
  `instagram-meta/`. Verified SHA-256 hashes for all 403 files immediately after
  moving them and confirmed no root `.txt`/`.sh` files remained. Updated the two
  relocated Bash helpers afterward to read captions beside their script when
  invoked from any working directory.
- Replaced the root text/shell exclusions with `/instagram-meta/` so the whole
  local metadata archive remains excluded from Git.
- Added `scripts/project-paths.mjs` and refactored content generation, the audit,
  and the downloader queue to read captions from `instagram-meta/`. Preserve
  project-root asset/state locations and filename-only `sourceFile` metadata.
- Updated real-corpus tests and downloader fixtures for the new directory. The
  queue regression includes a root-level decoy caption and non-caption files
  inside the metadata folder to verify source selection.
- Updated README setup/source paths, shell commands, project structure, and
  local-input exclusions; refreshed CONTRIBUTING and AGENTS guidance.
- **Verification:** root and `/encyclopedia/` production builds passed;
  `npm test` passed (57 tests), `npm run test:ui` passed (29 tests), and
  `npx playwright test --config=playwright.subpath.config.js` passed (7 tests).
  Generated `src/data/` has no diff: 388 observations, 327 taxa, and 1,641 photos.
  Downloader dry run found all 388 post IDs without network requests or file
  changes. The caption audit ran successfully from `scripts/`. Both Bash helpers
  passed syntax checks and executed from the project root or `scripts/`.
  `git check-ignore` confirmed the moved archive is ignored; `git diff --check`
  passed.
- **Build state:** `dist/` is currently configured for `/encyclopedia/`.
- **Unresolved follow-ups:** none identified.

### 2026-10-23 — One species map for all observation locations

- Replaced repeated encounter maps with one species-level map above the field
  encounter list, using all observations' usable coordinates regardless of
  whether individual encounter panels are expanded.
- Kept the existing frame heights and Google Maps controls. Add one Data-layer
  feature per located observation, including repeated coordinates, with each
  pin titled by location and recorded date/time. Show the pin count in the caption.
- Fit distinct positions with padded bounds. Keep zoom 14 when every observation
  shares one coordinate so a single location does not over-zoom. Omit the map
  when no usable coordinates or configured key are available.
- Key the component by species ID and keep lazy viewport loading, shared API
  loading, and cleanup on navigation. Point failure messages to individual
  coordinate links in the field encounters below.
- Updated browser mocks and coverage for all current/historical pins on one map,
  fitted bounds, single-location centering, no new maps on encounter toggles,
  script reuse across species, cleanup, dimensions, failure fallbacks, and the
  `/encyclopedia/` deployment. Updated README behavior and test documentation.
- **Verification:** root and `/encyclopedia/` production builds passed;
  `npm run test:ui` passed (29 tests), and
  `npx playwright test --config=playwright.subpath.config.js` passed (7 tests).
  A live Chrome smoke check with the supplied key rendered one combined map for
  Boletus edulis with its four observation features, no per-encounter maps, and
  no Google API errors; reviewed the fitted-map screenshot.
  `git diff --check` passed. The unchanged Node.js suite was not rerun.
- **Build state:** `dist/` is currently configured for `/encyclopedia/`.
- **Unresolved follow-ups:** none identified.

### 2026-10-23 — Embedded JavaScript maps for observation coordinates

- Added inline terrain maps with exact coordinate pins, map-type/zoom/fullscreen
  controls, and cooperative touch gestures, between encounter metadata and
  photographs. Reused `parseCoordinates` for DMS and annotated-decimal inputs.
  The Maps Data layer supplies pins without a map ID or geocoding service.
- Load maps only near the viewport inside expanded encounters; share the API
  script across maps, handle loading timeouts and authentication/network failures,
  and clean up listeners/data layers on navigation. Keep original coordinate
  links as the fallback. Omit maps when coordinates or a configured key are absent.
- Wired `secrets/maps-api.key` into Vite through `scripts/maps-config.mjs`, with
  environment/`.env.local` overrides. Read the supplied key without printing it.
  Preserved the user's existing `.gitignore` edit excluding `/secrets`.
- Added key-configuration unit tests, map browser tests, and subpath map coverage.
  All browser suites now use a shared Maps request test double to avoid live API
  calls in automated checks. Map-specific tests skip when built without a key.
- Updated README behavior, key setup, deployment, source structure, and test
  instructions. No new package dependency is required.
- **Verification:** root and `/encyclopedia/` production builds passed;
  `npm test` passed (57 tests); `npm run test:ui` passed (29 tests);
  `npx playwright test --config=playwright.subpath.config.js` passed (7 tests).
  A separate live Chrome smoke check using the supplied key rendered the actual
  Google map and pin with loaded map images, no Google API errors, and no error
  panel; reviewed its screenshot. `git diff --check` passed.
- **Build state:** `dist/` is currently configured for `/encyclopedia/` with the
  supplied browser Maps key.
- **Unresolved follow-ups:** none identified.

### 2026-10-23 — Clickable thumbnail family filters

- Made recorded family names on gallery thumbnails native Vue Router links to
  the corresponding family-filtered collection. Reused `setTaxonomyFilter` to
  replace genus while preserving other filter parameters and sorting. Selection
  updates the URL, active chip, and filter count without opening the panel.
- Split each card into sibling species-detail and family-filter links inside a
  non-interactive `.species-card` wrapper. `.species-card-link` wraps the photo
  and caption. A missing family still displays the plain **Field discovery**
  label. Keep this structure to avoid nested interactive links.
- Added underlining, hover/focus states, a selected-family border and
  `aria-current`, descriptive labels/tooltips, and a 44 px-high mobile family
  target while retaining the small badge text.
- Added desktop keyboard/history/reload coverage, preservation of other filters,
  touch-based mobile badge/photo navigation, and a deployment-base family-link
  check. Updated the README and reviewed the desktop gallery screenshot.
- **Verification:** `npm run build -- --logLevel error` passed;
  `npm run test:ui` passed (25 tests). `npm run test:subpath` built the
  `/encyclopedia/` production output; after correcting the new assertion to check
  a native link's resolved URL rather than require an absolute `href` attribute,
  `npx playwright test --config=playwright.subpath.config.js` passed (6 tests).
  `git diff --check` passed. The Node.js suite was not run for this UI changeset.
- **Build state:** `dist/` is currently configured for `/encyclopedia/`.
- **Unresolved follow-ups:** none identified.

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
