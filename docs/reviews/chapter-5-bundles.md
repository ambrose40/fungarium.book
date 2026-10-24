# Chapter 5 — Production bundle size and chunking

Status: implemented, verified, and approved by the user for commit.
Reviewed: 2026-10-24. The user selected Chapter 5 before the other pending chapters.

## Findings and decisions

- The original `/encyclopedia/` entry was **1,298,586 bytes minified**, above
  Vite's 500,000-byte warning threshold. The generated catalog JSON was the main
  contributor: about 1,101 kB of input JSON, including 214 kB of photo metadata
  and 376 kB of scientific search text. Vue or icons alone were not the cause.
- The shared index unnecessarily included every photograph and gallery-specific
  search/filter data on direct profile visits. Its cover-selection code only
  needs the first photograph of the first encounter with photographs.
- Retain the **500 kB per-chunk budget** and make budget failures reproducible.
  Both final builds emit no oversized-chunk warning.

## Implementation

1. Regenerate a smaller `src/data/index.json` containing shared taxon/SEO metadata,
   common names, hashtags, latest overviews, encounter dates/places, and the same
   single cover-photo reference per taxon. Preserve all encounter entries/counts.
2. Generate gallery-only `search-index.json` and `filter-index.json`. Join them by
   taxon ID through `assembleCatalog`; reuse overviews from shared metadata to
   avoid duplicating them in the scientific-search chunk. Full scientific text,
   field/facet counts, combined searches, and organism/taxonomy filtering remain
   covered by the real-corpus tests.
3. Load both gallery and detail routes dynamically. Move the full-record import
   registry to `src/species-data.js`, loaded with the detail view. Keep the static
   reading view until `router.isReady()` resolves for the initial route.
4. Use explicit manual chunks for `catalog`, `catalog-search`, `catalog-filters`,
   and `vue-vendor`. `onlyExplicitManualChunks` keeps unrelated route dependencies
   out of these groups. A direct profile defers gallery search/filter modules;
   navigation to the collection fetches them and enables normal local search.
5. Write final bundle diagnostics after Vite's preload rewriting, in the
   `writeBundle` hook. `npm run audit:bundle` reads the last build's report and
   fails for JavaScript chunks exceeding 500,000 bytes. The browser suite also
   checks the budget and actual deferred-route loading.

## Measurements

All kB values below use 1,000 bytes. The static entry graph includes the entry
and its recursive static JavaScript imports; it excludes dynamic route imports.
It must not be confused with all scripts needed for the interactive gallery.

### `/encyclopedia/` build

| Metric | Before | After |
| --- | ---: | ---: |
| Largest minified JavaScript chunk | 1,298.59 kB | 476.83 kB |
| Chunks over the 500 kB budget | 1 | 0 |
| Static entry graph, raw | 1,298.59 kB | 592.44 kB |
| Static entry graph, gzip | 283.58 kB | 130.27 kB |
| Static entry graph files | 1 | 3 |
| Total emitted JavaScript chunks | 329 | 335 |

| Final chunk group | Raw | Gzip |
| --- | ---: | ---: |
| Shared catalog | 476.83 kB | 84.84 kB |
| Scientific-search descriptions | 334.31 kB | 86.33 kB |
| Characteristic/filter index | 122.60 kB | 11.83 kB |
| Vue / Vue Router | 95.60 kB | 37.14 kB |
| Detail view and full-record registry | 72.94 kB | 22.82 kB |

The root build also has zero over-budget chunks, the same 476.83 kB maximum,
and a static entry graph of **592.35 kB raw / 130.26 kB gzip**.

### Actual cold-browser requests

Local installed Chrome **155.0.8059.85**, 1440 × 900 viewport, a fresh browser
context per URL, Vite production preview, and the same local assets/configuration
were used before and after. External Google Fonts/Maps requests were blocked for
this JavaScript-loading probe. Each page's interactive cards or profile heading
was awaited, followed by network idle. Browser `PerformanceResourceTiming`
`encodedBodySize` was summed for JavaScript resources; these are compressed body
bytes, excluding headers, HTML, CSS, photographs, and third-party scripts.

Baseline application sources came from commit **`8ec7189`**, rebuilt with a
temporary read-only Git-source overlay and manual chunking disabled. This allowed
an exact baseline rebuild without reverting the working changes. Temporary probe
scripts live outside the repository; the build report and table record the result.

| URL | Before JS bodies | After JS bodies | Reduction | JS requests before → after |
| --- | ---: | ---: | ---: | ---: |
| `/encyclopedia/` | 283,576 B | 247,494 B | 12.7% | 1 → 7 |
| `/encyclopedia/?q=Boletus&scope=scientific` | 283,576 B | 247,494 B | 12.7% | 1 → 7 |
| `/encyclopedia/fungi/boletus-edulis/` | 305,225 B | 166,667 B | 45.4% | 3 → 6 |

Splitting increases request counts, while improving caching boundaries and
deferring gallery-specific data on direct profiles. Gallery savings also come
from removing unused photo-list metadata and duplicate overview text. These are
local payload measurements, not production network timings or Lighthouse scores.

## Reproduction and verification

```sh
npm run build
npm run audit:bundle
npm test
npm run test:ui
npm run build:encyclopedia
npm run audit:bundle
npx playwright test --config=playwright.subpath.config.js
npx playwright test --config=playwright.accessibility.config.js
```

- Root and `/encyclopedia/` production builds: passed, no oversized-chunk warning.
- Bundle audits: passed for both bases, zero chunks above 500 kB.
- Node.js suite: **82 passed**. Tests check reconstructed search/filter content
  against latest scientific profiles, plus exact covers, names, encounter dates,
  locations, and overall metadata. One test consumer initially still loaded only
  the shared index; it now uses the same assembled catalog as the browser.
- Main browser suite: **46 passed**, including the new budget and lazy-loading
  regressions. Existing checks cover all 327 static species responses, metadata,
  clean/legacy navigation, failure states, filters, maps, images, and mobile use.
- Deployment-path suite: **10 passed**.
- Accessibility suite: **11 passed**; its scoped audit and human follow-ups remain
  documented in the Chapter 2 report.
- `git diff --exit-code -- src/data/posts.json src/data/species`: passed. Full
  scientific profiles, captions, and photo lists are unchanged; only shared index
  packaging and the two generated gallery indexes changed.
- `git diff --check`: passed.
- Metadata audit: ran successfully with the previously documented source omissions.
- One final rebuild encountered a transient Windows `ENOTEMPTY` while clearing
  `dist/thumbs`; an identical retry succeeded and regenerated the complete output.

The corpus remains **388 observations, 327 taxa, and 1,641 photographs**.
`dist/` is left configured for `/encyclopedia/`. Generated records were rebuilt
from source inputs; no scientific JSON was manually edited.

Each build writes `dist/.vite/bundle-report.json` with final raw/gzip chunk sizes,
imports, and pre-minification module contribution estimates. The CLI prints a
summary; the JSON is a diagnostic artifact inside ignored build output. Module
contributions are not additive minified byte counts. Reports contain sizes and
module paths, not bundled source code or configuration values.

## Review gate and follow-up

The user approved Chapter 5 and requested its Conventional Commit. The shared
catalog currently uses 476.83 kB of the 500 kB budget; the audit and regression
check make future content growth visible. Chapters 3, 4, 6, and 7 remain pending.
