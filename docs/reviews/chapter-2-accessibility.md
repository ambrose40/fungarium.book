# Chapter 2 — Accessibility of design and code

Status: implemented, browser-verified, and approved by the user for commit.
Reviewed: 2026-10-24. Target: **WCAG 2.2 AA**.
Human screen-reader testing remains open. This is a scoped review, not a
comprehensive WCAG conformance statement.

## Conditions and scope

- Local production `/encyclopedia/` build, installed Chrome
  **155.0.8059.85** on Windows, Playwright, and axe-core **4.14**.
- Automated audits use WCAG A/AA tags through 2.2 plus best-practice rules,
  with `target-size` explicitly enabled. No page/component exclusions are applied.
- Representative collection, selected filters, empty results, Boletus edulis
  profile with expanded evidence/original caption, About dialog, photo lightbox,
  no-application-JavaScript profile, mobile collection/navigation, and Amanita
  muscaria profile at 320 CSS-pixel reflow.
- Browser interaction checks cover keyboard focus, modal Tab/Shift+Tab/Escape,
  filter clearing, load-more, reduced motion, forced colours, language annotations,
  control sizes, 200% CSS zoom, and text-spacing overrides. Viewports include
  390 × 844, 320 × 800, and 320 × 256 CSS pixels.
- Automated Maps requests use the shared test double. A separate actual-API
  smoke check reviewed rendered Google Maps and keyboard exit.
- Desktop/mobile screenshots were visually reviewed. Accessibility-tree
  inspection verifies programmatic names/states, not screen-reader speech.

## Findings, fixes, and re-verification

| Area / relevant criteria | Finding and implemented change | Re-verification |
| --- | --- | --- |
| Names and semantics — 1.1.1, 1.3.1, 2.5.3, 4.1.2 | Several custom link names omitted visible text. Use visible species-card content, contextual hidden text on quick links, coordinate text in map-link names, and spaced brand text. Gallery images inside already-labelled links are decorative. Add collection list semantics, a valid labelled carousel section, named dialogs/map region, and pressed states. | Axe audits, existing link/navigation tests, and browser accessibility-tree inspection. |
| Reading and contrast — 1.4.3, 1.4.11 | Secondary text was often 6–10 px. Increase body reading text to 16 px, common controls/secondary text to 14 px, and ancillary labels to 12 px. Photo labels use 75%-opaque backgrounds and black shadows after user review, with verified worst-case contrast. Strengthen input boundaries/primary hover contrast and add two-colour photo focus indicators. | Computed-style contrast measurements below; axe; desktop/mobile visual review. Font sizes are a readability decision, not a WCAG minimum-font-size claim. |
| Bypass, focus, and status — 2.4.1, 2.4.3, 2.4.7, 2.4.11, 4.1.3 | Skip/section links scrolled without consistently moving focus; removals could discard the focused control. Add main/section focus destinations, header-aware scroll margins, focus after chip/field removal, and focus on the first newly loaded card. Separate result status from interactive chips and announce load-more counts. Add a bypass for long taxonomic lists. | Keyboard-driven browser tests verify destination focus below the sticky header, retained input focus, removal destinations, and load-more focus/status. |
| Navigation and dialogs — 2.1.1, 2.1.2, 4.1.2 | Mobile navigation needed Escape/dismissal behavior; modal Tab traversal could leave dialog controls. Add disclosure relationships, Escape/outside/focus-out dismissal, explicit modal Tab wrapping, dialog labels/descriptions, and return focus, including the mobile menu fallback. | Tab/Shift+Tab containment, Escape/return tests; named-dialog axe audits; lightbox arrow navigation and position status. |
| Reflow and spacing — 1.4.4, 1.4.10, 1.4.12 | Larger text needed wrapping controls, scrollable dialogs, and flexible headings/filter rows. Final visual review found a two-row Family/Class badge covering a long mobile species name. Put phone captions in normal flow below the unchanged 3:2 photo; keep separate taxonomy links over the image. Move the desktop decorative slideshow note below its caption to avoid overlap. | 200% CSS zoom, 320 CSS-pixel reflow, spacing overrides, existing responsive tests, and a long-name geometry/screenshot regression check. Real browser zoom remains a human follow-up. |
| Targets and selected states — 1.4.1, 2.5.8 | Small chip controls/checkboxes and tiny text made interaction difficult. Standalone controls meet 24 px minimums; common controls are 32–44 px. Compact thumbnail taxonomy links retain a 24 × 24 px minimum after user review. Add non-colour selected-state decoration and forced-colour focus rules. | Explicit size measurements, axe target-size, keyboard/phone navigation, forced-colour checks. Inline prose links are assessed with the applicable target-size exception. |
| Language — 3.1.2 | Recorded non-English common names/caption lines lacked language changes. Annotate supported recorded labels/flags in interactive/static views without guessing unknown languages or changing caption characters. | Unit tests preserve mixed line endings/combining characters; browser checks verify Estonian/Russian names and caption spans. |
| Motion and maps — 2.1.1, 2.1.2, 2.2.2 | Preserve slideshow pause/manual controls and reduced-motion startup; remove animated scrolling/transitions under reduced motion. Give the map a valid labelled region, status, and coordinate-link alternative. | Existing slideshow suite, reduced-motion checks, mocked map/failure coverage, and the separate live-map smoke check below. |

## Measured contrast

Ratios use computed colours, WCAG relative luminance, and alpha compositing.
Photo labels have 75%-opaque dark backgrounds. Their ratios below conservatively
composite those backgrounds over a pure-white photo pixel, without crediting
black text shadows or any other dark layers. Darker photo pixels improve contrast.
Text samples meet 4.5:1; the sampled focus indicator and input boundary meet 3:1.

| Sample | Contrast |
| --- | ---: |
| Hero description / slideshow caption | 9.42:1 |
| Muted statistics, footer, decorative note | 6.57:1 |
| Selected slideshow year | 8.88:1 |
| Species-card scientific name, worst-case white photo | 8.24:1 |
| Species-card secondary caption, worst-case white photo | 5.40:1 |
| Family / class / encounter-count labels, worst-case white photo | 6.72:1 |
| Photo focus indicator against its dark surround | 10.53:1 |
| Primary button / hover text | 5.45:1 / 6.14:1 |
| Input boundary against its background | 5.40:1 |
| Characteristic count | 6.08:1 |

These are representative measurements, not a complete colour/state inventory.

### User code-review amendment

- Move taxonomy badges to top/left 2 px and encounter counts to top/right 2 px;
  reduce label/count padding to 2 px and remove secondary-caption top margin.
- Use `32px 2px 2px` desktop caption padding. Phone captions stay in normal flow
  with 2 px padding, without an unnecessary 32 px gap below the photo.
- Replace the initially opaque name/taxonomy/count backplates with 75%-opaque
  dark backgrounds and black text shadows; remove the broad desktop caption
  gradient so more of the photograph remains visible.
- Keep taxonomy links at least 24 × 24 px rather than `min-height: 0`, which
  would yield approximately 22 px with this font/line-height/padding. Adjust their
  focus outline inward so it stays visible at the tighter image edge.
- Recheck actual phone taps, keyboard focus, long names, forced colours, reflow,
  and worst-case text contrast. Desktop normal/focus and 320 px mobile screenshots
  were visually reviewed.

## Automated audit results and incomplete checks

All ten audited states have **zero axe violations**. Incomplete findings remain
visible in the saved raw reports; they are not counted as passes or suppressed.

| State | Violations | Incomplete nodes |
| --- | ---: | ---: |
| Desktop gallery | 0 | 151 contrast |
| Expanded/selected filters | 0 | 14 contrast |
| Empty results with filters expanded | 0 | 8 contrast |
| Profile with expanded evidence/caption | 0 | 4 contrast |
| Photo lightbox | 0 | 0 |
| About dialog | 0 | 0 |
| 320 CSS-pixel reflow profile | 0 | 0 |
| Static profile without application JavaScript | 0 | 0 |
| Mobile gallery | 0 | 79 contrast |
| Mobile navigation open | 0 | 79 contrast |

The translucent labels increase axe image-background contrast incompletes:
axe cannot determine the underlying photograph's pixel colours. The conservative
white-photo calculations above cover those shared label styles. Raw findings
remain recorded, with compact per-state summaries alongside the full JSON.
Other filter findings concern text partly clipped in the scrollable characteristic
panel and single-digit counts; shared text/count styles are separately checked.
The profile/empty-state reports include sticky-header overlap/image-background
uncertainty. Scrolling, keyboard access, and contextual human review of the
remaining findings still matter; incomplete findings are not automatic passes.

### Actual Google Maps smoke check

The live API rendered the combined Boletus edulis map in Chrome, reached the
`ready` state, and retained four individual coordinate links. Keyboard traversal
exited the map with Tab after eight steps in that session. Axe reported zero
violations, with **11 incomplete contrast nodes and one incomplete target-size
node** in third-party content. That smoke check does not establish full map
accessibility or screen-reader usability; retain the coordinate-link alternative
and include actual map controls in the human review.

## Verification and reproduction

| Command/check | Result |
| --- | --- |
| `npm test` | 81 passed |
| `npm run build -- --logLevel error` | Root production build passed |
| `npm run test:ui` | 44 passed |
| `npm run build:encyclopedia -- --logLevel error` | Subdirectory production build passed |
| `npx playwright test --config=playwright.accessibility.config.js` | 11 passed, including ten axe snapshots |
| `npx playwright test --config=playwright.subpath.config.js` | 10 passed |
| `git diff --check` | Passed |
| `git diff --exit-code -- src/data` | Passed; generated corpus unchanged |

After the compact/translucent-label amendment, both builds and all three browser
suites passed again (44 / 11 / 10). The contrast-calculation unit test passed;
the unchanged full Node suite's 81-test result is from the initial chapter review.

Use **`npm run test:a11y`** to rebuild and reproduce the dedicated suite on
`http://127.0.0.1:4176/encyclopedia/`. Installed Chrome and local source/media
inputs are required as described in the README. `@axe-core/playwright` is a
development dependency. Raw JSON, contrast ratios, an accessibility-tree
snapshot, and a mobile long-name screenshot are saved under ignored
`accessibility-results/`; rerunning that suite replaces its output. Other
browser suites use `test-results/`.

The build still contains 388 observations, 327 taxa, and 1,641 photos. Scientific
profiles and original captions have not been edited. `dist/` is configured for
`/encyclopedia/`.

## Outstanding human verification and review gate

- **NVDA + Chrome:** headings/landmarks/link-list reading, scientific/common-name
  pronunciation and language switching, search/filter/result announcements,
  removal/load-more focus, native disclosures, dialogs, slideshow, and actual map
  entry/exit/alternatives. No human screen-reader session was performed here.
- **VoiceOver + Safari and real devices:** repeat key reading/navigation/dialog
  workflows; verify touch, real browser 200%/400% zoom, text spacing, and focus
  visibility. CSS zoom/viewport emulation is not a substitute for these checks.
- Contextually review the remaining incomplete contrast/third-party target-size
  findings. Browser accessibility-tree snapshots do not prove spoken output.
- The user approved the reviewed implementation, including compact translucent
  labels, and requested its Conventional Commit. Publication was not requested.
  **Stop here; Chapter 3 Lighthouse work awaits an explicit green flag.**
