# Project memory

## Maintenance agreement

Update this file for **every changeset**, as requested by the user, including
documentation-only work. Record changes, decisions, verification, and unresolved
follow-ups before completing the changeset. Update the README when affected
behavior or workflows change. Keep these updates with their implementation in
the same commit. Persistent agent guidance is in `AGENTS.md`; commit messages
follow `CONTRIBUTING.md`.

For the current TODO workflow, implement **one chapter at a time**, stop, and
report for user review. Wait for an explicit green flag before committing or
starting the next chapter. Apply requested amendments to the active chapter first.

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
- **Filtering:** selections are URL-backed; genus, family, and class replace one another.
  Mycological filters are additive, with OR within a category and AND across
  categories. Closing the filter panel must preserve selections. Thumbnail
  **Family / Class** labels are separate native filter links that preserve other
  selections; the photo and caption independently open the species page. Keep
  taxonomy links outside the photo/detail anchor; never nest anchors.
- **Taxonomy classes:** derive `taxonomicClass` from the final rank of the latest
  profile's family/class or family/order/class taxonomy. Omit absent classes;
  never infer them from genus or older records. `class=<recorded name>` selects
  an exact class. Mixed URLs normalize with precedence genus → family → class.
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
- **Deployment:** new visits use clean URLs, with static species HTML generated
  at `fungi/<id>/index.html`; legacy `/#/...` bookmarks remain browser-compatible.
  Production hosting at `/encyclopedia/` requires `npm run build:encyclopedia` and
  uploading the complete `fungi/` tree. Root browser checks use a root build;
  browser checks use installed Chrome. Home resolves the deployment's parent
  even from nested profile paths.
- **SEO:** `src/lib/seo.mjs` shares metadata between the client and
  `scripts/seo-pages.mjs`. Default canonical origin is `https://fungarium.info`,
  overridable with `SITE_ORIGIN`; the deployment base supplies the path. Builds
  generate per-species HTML, sitemap, and robots template. Merge the Sitemap
  directive into the origin-root robots file when deploying under a subdirectory.
  Filtered collection/error pages are noindex; canonical URLs omit query/hash
  variants. Source-only structured data and factual description fallbacks avoid
  invented scientific facts, dates, accounts, or image licences.
- **Hashtags:** preserve original captions, extract combining marks and
  punctuation/emoji-boundary tags, normalize NFC, and deduplicate/match without
  regard to case while retaining the first source spelling. Meaningful accents
  remain distinct. `npm run audit:metadata` reports coverage and genuine source
  omissions from generated content; never synthesize missing tags or backfill
  scientific profiles from older captions.
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

## Open follow-ups and TODOs

Requested on 2026-10-23. Chapter 1 is implemented and approved by the user;
verified source-content curation remains open. Chapters 2 and 3 are pending.
Existing application/browser checks do not constitute completed WCAG or
Lighthouse audits. Keep this list and the README's **Follow-ups and TODOs** section
in sync as work progresses.

1. **Page metadata and miscellaneous missing data**
   - [x] Audit gallery/species metadata; add factual fallbacks and record genuine
     source omissions in `docs/reviews/chapter-1-metadata.md`.
   - [x] **1a — Hashtags:** verify source coverage, repair Unicode extraction and
     case-equivalent filtering/deduplication, and expose the complete tag list.
   - [x] **1b — HTML/SEO:** implement complete managed page metadata, canonical and
     robots directives, social previews, source-based structured data, static
     species HTML, clean URLs, and sitemap with legacy bookmark compatibility.
   - [ ] **Source-content curation:** add verified missing overviews/descriptions,
     direct GBIF references, publications, and optional encounter data to original
     captions when available. Use `npm run audit:metadata` to locate records;
     never invent content or copy older scientific profiles to fill omissions.
2. **WCAG verification of design and code**
   - [ ] Use WCAG 2.2 AA as the review target, with automated checks plus manual
     keyboard and screen-reader testing.
   - [ ] Check styles, colours, text/control contrast (including photo labels),
     fonts, readability, zoom/reflow, and mobile layouts.
   - [ ] Check semantics, ARIA/labels, focus visibility/order, touch targets,
     navigation, filters, dialogs/lightboxes, slideshow controls, maps, and
     reduced motion. Record issues, fixes, and re-verification.
3. **Lighthouse validation**
   - [ ] Audit mobile and desktop production `/encyclopedia/` pages: gallery,
     filtered collection, and representative species profiles.
   - [ ] Save reports and record Performance, Accessibility, Best Practices,
     and SEO results, including URLs, build, and audit conditions.
   - [ ] Prioritize findings, implement improvements, and rerun affected audits.

## Recent changesets

### 2026-10-24 — Chapter 1 implemented and approved

- Adopted the user's chapter-by-chapter workflow: stop and report after the
  active chapter, with explicit approval required for a commit or the next chapter.
  Updated AGENTS, README, and this memory accordingly.
- Added shared metadata generation/client updates for titles, descriptions,
  canonical links, robots, Open Graph/Twitter cards, source keywords, and
  Schema.org website/collection/profile/taxon/image/breadcrumb data. Tracking
  parameters do not deindex valid pages; filtered collections/errors are noindex.
- Added Vite generation of 327 species HTML pages and a readable gallery before
  JavaScript, plus a 328-URL sitemap and robots template. New visits use clean
  routes; old hash bookmarks remain supported, including a mode switch when
  opened from a running clean gallery. Fixed Home and named previous/next links
  for nested routes, and changed the manifest launch URL to the clean collection.
- Added `SITE_ORIGIN` for canonical hosting configuration and documented directory
  index deployment, complete output upload, and origin-root robots merging for
  `/encyclopedia/`. Extended the compact index with latest GBIF URLs so server
  and client metadata agree.
- Added source-faithful hashtag helpers: combining marks now recover the full
  `lillatümak` tag in Leptoporus mollis, and case-only polypore duplicates merge
  in Phaeolus schweinitzii. Comparisons accept case variants and preserve accents.
  Added tag counts, show-all/show-fewer behavior, and an empty state. Compared
  generated records with HEAD: all 327 scientific profiles and 388 original
  caption strings/other observation fields remain unchanged; only tag metadata
  changed in the full corpus.
- Added `npm run audit:metadata` and the Chapter 1 review report. All 388
  observations have source hashtags (1,955 normalized unique tags). Recorded
  gaps include 6 latest overviews, 3 scientific descriptions, 10 direct GBIF
  references, 2 publications, 19 coordinates, and 3 weather entries. Missing
  overview metadata uses a factual fallback; source facts await verified curation.
- **Verification:** `npm test` passed (78 tests); root build and
  `npm run test:ui` passed (44 tests); `/encyclopedia/` build and
  `npx playwright test --config=playwright.subpath.config.js` passed (10 tests).
  Raw HTML metadata was fetched for every published species; no-JavaScript
  reading, clean/legacy navigation, head resets/errors, hashtags, and deployment
  URLs were checked. The development-server smoke check verified static and
  interactive Boletus edulis content. Metadata audit and `git diff --check` passed.
  Commit review moved the hashtag import to the module header for consistency;
  the 13 content/hashtag tests passed again after this non-behavioral cleanup.
- **Build state:** `dist/` is configured for `/encyclopedia/`, with generated
  species pages, sitemap, and robots template.
- **Review gate:** the user approved Chapter 1 and requested its Conventional
  Commit. Chapters 2 (WCAG) and 3 (Lighthouse) await further instruction.
- **Unresolved follow-ups:** verified source curation above and origin-root
  robots merging at release time, plus the two remaining audit chapters.

### 2026-10-23 — Record metadata, WCAG, and Lighthouse follow-ups

- Added synchronized, unchecked follow-up lists to README and project memory
  covering missing metadata, hashtags, HTML/SEO, WCAG design/style/colour/font/code
  verification, and production Lighthouse validation.
- Set WCAG 2.2 AA as the review target and included manual keyboard/screen-reader
  checks alongside automated auditing. Require recorded findings and repeat
  verification when issues are addressed.
- Added the README contents link for the follow-up section. These entries record
  future work; the audits have not been performed by this documentation changeset.
- **Verification:** reviewed Markdown structure and section anchors;
  `git diff --check` passed. Runtime tests were not rerun for documentation-only
  edits.
- **Requested publication target:** `new-origin/master`, at
  `https://github.com/ambrose40/fungarium.book.git`.
- **Unresolved follow-ups:** the three open workstreams listed above.

### 2026-10-23 — Thumbnail class links and taxonomy-class filtering

- Added generated `taxonomicClass` metadata to full and compact species records
  using only the latest scientific taxonomy. The current collection has 16
  recorded classes, including Myxogastria and Protosteliomycetes.
- Changed the thumbnail badge to **Family / Class**, with separate native links,
  accessible names/tooltips, active/focus states, and 44 px-high phone targets.
  Kept these links outside the photo/detail anchor, reserved space for encounter
  counts, and omitted unavailable ranks without dangling separators.
- Added the Taxonomy class dropdown, URL-backed `class` selection, active chip,
  filter count, and clear/reset handling. Selecting any genus/family/class
  replaces the other taxonomy choices while preserving descriptions, organism
  groups, characteristics, search, year, letter, tags, and sorting. Legacy mixed
  URLs prefer genus, then family, then class. All-fields search includes classes.
- Added unit coverage for rank extraction, exact matching, class lists/counts,
  additive filters, normalization, and generated latest-profile class values.
  Browser coverage includes dropdown and keyboard/touch class links, history,
  reloads, native family/detail navigation, empty results, clear controls, and
  deployment-base URLs. Reviewed desktop and 320 px card screenshots.
- Updated README behavior, source rules, generated-data description, query
  examples, and verification guidance; refreshed AGENTS taxonomy guidance.
- **Verification:** `npm test` passed (70 tests), `npm run test:ui` passed
  (38 tests), and `npx playwright test --config=playwright.subpath.config.js`
  passed (9 tests). Root and `/encyclopedia/` production builds passed.
  `git diff --check` passed. Catalog totals remain 388 observations, 327 taxa,
  and 1,641 photos.
- **Build state:** `dist/` is currently configured for `/encyclopedia/`.
- **Unresolved follow-ups:** none identified.

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
