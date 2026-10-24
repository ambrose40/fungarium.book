# Chapter 3 — Lighthouse validation

Status: implemented, verified, and approved by the user for commit.
Reviewed: 2026-10-24.

## Scope and reproducibility

- Production **`/encyclopedia/`** build, served locally at
  `http://127.0.0.1:4179/encyclopedia/` with Vite preview, not the dev server or
  source-mapped coverage build. No deployed-server measurements were made.
- Windows, Node **24.4.1**, installed Chrome **155.0.8059.85**, Lighthouse
  **13.5.0**. The project minimum is now **Node 22.19** for Lighthouse.
- Baseline application: `7a0759f6ddab9fd03b2e183e538495517f2996b7`, before the
  application performance fixes. Final: Chapter 3 working tree on that revision.
  Reports identify the revision; final summaries also explicitly mark a dirty tree.
- Corpus: **388 observations, 327 taxa, 1,641 photos**. Generated scientific data
  and existing field-guide artwork are byte-identical to HEAD.
- A new Chrome profile is used for every audit, with storage reset and standard
  Lighthouse **simulated** throttling. No audit categories or external resources
  are excluded. Normal Maps configuration is retained; Playwright's Maps test
  double is not used in Lighthouse. This is an initial-navigation audit, not a
  scripted tour of filters, dialogs, slideshow years, or maps below the fold.

| Preset | Viewport | DPR | Simulated RTT / throughput | CPU slowdown |
| --- | --- | ---: | --- | ---: |
| Mobile | 412 × 823 | 1.75 | 150 ms / 1,638.4 Kbps | 4× |
| Desktop | 1,350 × 940 | 1 | 40 ms / 10,240 Kbps | 1× |

The full `configSettings`, requested URL, fetch time, browser user agent, warnings,
and Lighthouse version are saved with each report. Baseline: **one audit per
page/device (8 total)**, 13:46–13:47 UTC. Final: **three per page/device (24 total)**,
14:58–15:02 UTC. Final table values are independent medians for each category or
metric; they need not all belong to the same individual run. Baseline comparison
is directional rather than a repeated-baseline statistical study.

```sh
npm run build:encyclopedia
npm run audit:lighthouse -- --label=chapter-3-final --runs=3
# A focused future check:
npm run audit:lighthouse -- --label=profile-review --runs=3 --pages=boletus,amanita --devices=mobile
```

The runner validates labels, repetitions (1–5), devices, and page IDs; starts a
strict-port production preview; saves redacted HTML/JSON reports and a median
summary; and cleans up Chrome profiles/server. A runtime error fails the command.
Category scores remain reported measurements, not an arbitrary numeric gate.
Incomplete runs have no completed timestamp. Read `summary.json` for the actual
run list rather than assuming every older file in a reused label belongs to it.

## Reports and build identity

Raw evidence is local and Git-ignored:

- `lighthouse-results/baseline/<page>-<device>-1.{html,json}` and `summary.json`.
- `lighthouse-results/chapter-3-final/<page>-<device>-{1,2,3}.{html,json}` and
  `summary.json`.
- Exploratory labels: `iteration`, `static-hero`, `progressive`, `bootstrap`,
  `preload`, `shared-bootstrap`.

`<page>` is `gallery`, `filtered`, `boletus`, or `amanita`; `<device>` is `mobile`
or `desktop`. Saved report JSON is redacted for the configured Maps key before
HTML rendering. Reports and browser profiles are not public build assets.

Build HTML SHA-256 recorded by the runner:

| Build | `dist/index.html` hash |
| --- | --- |
| Baseline | `c438d6f9e8bcfa9b60421a4165f8f0f2e6f4b07646c98fd91bdde87027ce8ffb` |
| Final | `1bafc718800e13b01f15eb05d472d883b0111aec5a4fd57be56e66a50abdb0fb` |

These identify the entry HTML, not a hash of every local photograph. The final
normal build remains in `dist/`; subsequent coverage uses its separate directory.

## Category scores

URLs below are relative to the audited `http://127.0.0.1:4179/encyclopedia/` base.
Performance shows baseline → final median; other category scores were unchanged.

| URL | Device | Performance | Accessibility | Best Practices | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| `/` | Mobile | 70 → **76** | 100 | 100 | 100 |
| `/` | Desktop | 94 → **99** | 100 | 100 | 100 |
| `/?genus=Boletus&mc.hymenium=pores` | Mobile | 70 → **77** | 100 | 100 | **66** |
| `/?genus=Boletus&mc.hymenium=pores` | Desktop | 90 → **99** | 100 | 100 | **66** |
| `/fungi/boletus-edulis/` | Mobile | 64 → **91** | 100 | 100 | 100 |
| `/fungi/boletus-edulis/` | Desktop | 80 → **100** | 100 | 100 | 100 |
| `/fungi/amanita-muscaria/` | Mobile | 64 → **79** | 100 | 100 | 100 |
| `/fungi/amanita-muscaria/` | Desktop | 80 → **99** | 100 | 100 | 100 |

Final Performance ranges: gallery mobile 76 / desktop 98–99; filtered mobile
77–78 / desktop 98–99; Boletus mobile 89–91 / desktop 99–100; Amanita mobile 79 /
desktop 99. All 24 runs scored Accessibility/Best Practices 100; all indexable
pages scored SEO 100. **Filtered URLs intentionally remain `noindex, follow` and
canonicalize to the unfiltered collection.** Their failed indexing audit and SEO
66 are expected policy, not a reason to make duplicate filter URLs indexable.

## Paint and layout metrics

| Page | Device | LCP baseline → final (ms) | CLS baseline → final |
| --- | --- | ---: | ---: |
| Gallery | Mobile | 6,772 → **5,556** | .019 → **0** |
| Gallery | Desktop | 1,596 → **1,027** | .00016 → **0** |
| Filtered | Mobile | 6,839 → **5,632** | .019 → **0** |
| Filtered | Desktop | 2,036 → **1,027** | .00016 → **0** |
| Boletus | Mobile | 3,870 → **3,155** | .433 → **0** |
| Boletus | Desktop | 856 → **645** | .411 → **0** |
| Amanita | Mobile | 3,864 → **4,955** | .433 → **0** |
| Amanita | Desktop | 856 → **1,031** | .411 → **0** |

**CLS was exactly 0 in every final audit.** Mobile FCP medians were 1,956 ms
(gallery), 1,957 ms (filtered), 1,805 ms (Boletus), and 1,805 ms (Amanita), down
from approximately 3.21 s / 3.21 s / 2.69 s / 2.83 s. Final mobile TBT medians
were 165 / 119 / 149 / 145 ms; baseline TBT was 0–4.5 ms. Desktop TBT medians
were 0–2 ms. Faster first paint and stable layout do not imply every timing
improved: **Amanita LCP regressed**, and mobile blocking work increased. These
remain explicit findings despite better overall scores.

## Prioritized findings and retained changes

1. **Large profile layout shift and loading-screen replacement — fixed in the
   measured matrix.** Keep static content until route code and its full record
   are ready; cache successful records and share in-flight loads. Initialize the
   detail view from that cache, avoiding a replacement with the short loading
   screen. Existing missing/load-error states and noindex behavior still pass.
2. **Render-blocking external fonts — removed.** Serve DM Sans Latin/extended
   Latin variable WOFF2 and Libre Caslon Display locally. Preload the two primary
   fonts, retain `font-display: swap`/system fallbacks, and distribute their OFL
   licenses. There are no Google Fonts requests in the browser regression check.
3. **Late/lazy LCP image discovery — addressed.** Static metadata preloads the
   initial collage or profile cover. Static featured covers and interactive
   featured frames have dimensions, eager loading, and high fetch priority. Final
   profile LCP discovery checks pass for initial-document discovery, eager
   loading, and priority. Discovery is only one part of LCP; rendering can still
   wait for route/data work.
4. **Image delivery overhead — reduced.** Generate first-cover WebP previews
   bounded to 1200 × 1200, quality 84, without enlargement/cropping; reuse
   unchanged outputs. Originals and caption/media references remain untouched,
   and preview errors fall back to originals in the interactive frame. Deliver
   square TopNine WebPs bounded to 1000 × 1000, quality 84, with JPEG fallback,
   plus a lossless WebP logo with PNG fallback. Full-image viewers retain originals.

   Generated delivery-file sizes (bytes; JPEG/PNG originals are retained):

   | Asset | Original | WebP |
   | --- | ---: | ---: |
   | Branding mark | 35,827 | 20,520 |
   | TopNine 2024 | 182,288 | 169,446 |
   | TopNine 2025 | 159,242 | 140,014 |
   | TopNine 2026 | 169,652 | 153,228 |

Exploratory static hero duplication, progressive gallery assembly, a separate
bootstrap index/chunk, explicit route module/style preloads, and an extra early
profile-prefetch hook did not produce a useful measured mobile improvement.
They were removed. The final implementation retains the existing gallery
architecture and 500 kB chunk budget; the largest chunk is still **476.83 kB**.

## Remaining findings / deployment follow-up

- **Mobile LCP remains high**, particularly gallery/filtered (~5.6 s) and Amanita
  (~5.0 s). The final LCP image is discoverable, but route/data-dependent rendering
  and image transfer competition remain. Responsive cover/strip/collage sources
  and smaller critical startup/render work are the next candidates to measure.
  The current 1200 px preview limit is not a responsive image solution.
- Amanita's cover still transferred **153,754 bytes** in one final mobile report;
  the image-delivery audit estimated **438 KiB** savings across cover/thumbnail
  delivery and **600 ms** LCP savings. Its 1074 × 716 cover exceeded the reported
  651 × 432 device-pixel display need; the 600 px strip thumbnails also exceed
  their small displayed size. Keep photographic quality and full-size viewing
  while evaluating multiple delivery sizes.
- Gallery remains a photo-rich page: a final mobile run transferred roughly
  **3.29 MB**. Static profile links/readability, lazy loading, and per-chunk budget
  compliance do not eliminate overall page weight or simulated startup cost.
- Preview's cache lifetime/render-blocking/dependency insights remain in raw
  reports. Measure the deployed HTTPS server's compression, HTTP/2 or HTTP/3,
  cache headers, and repeat visits. Fingerprinted Vite assets can use long-lived
  immutable caching; unversioned HTML/images/fonts need an appropriate revalidation
  policy. Localhost preview is not evidence of production header behavior.
- Lighthouse Accessibility 100 does not replace Chapter 2's pending human
  screen-reader/device review. Keep those follow-ups open. Real Maps interaction
  below the fold and field Core Web Vitals require their own measurements.

## Verification actually performed

- `npm test`: **103 passed**, including audit input/redaction/aggregation checks,
  bounded preview generation/deduplication/reuse/original preservation, font
  binaries/licenses, and SEO/static eager-image agreement.
- Root `npm run build` and `npm run audit:bundle`: passed, no oversized JS chunks.
  `npm run test:ui -- --workers=2`: **50 passed**.
- `npm run build:encyclopedia` and `npm run audit:bundle`: passed.
  `npx playwright test --config=playwright.subpath.config.js --workers=2`:
  **11 passed**; `npx playwright test --config=playwright.accessibility.config.js
  --workers=2`: **12 passed**. Ordinary `dist/` has no `.map` files.
- Browser regressions include derivative failure → original, full-resolution
  lightbox, delayed profile record retaining static reading, actual WebP delivery,
  local fonts, base-aware assets, metadata/errors, filters, keyboard/contrast,
  reflow, and existing maps/slideshow behavior. Desktop gallery and mobile detail
  screenshots were visually inspected.
- Final Lighthouse command above: **24 completed audits**, HTML/JSON and summary
  saved, every run free of Lighthouse run warnings.
- `npm run coverage`: Node **103 passed**; first browser attempt had one
  60-second boot timeout in the existing scientific-description search test
  (static reading view remained visible). The failed report was correctly
  nonpassing and did not update the snapshot. No reproducible cause was
  established. A clean `npm run coverage:ui` rerun passed **all 62 tests** and
  `npm run coverage:summary -- --update-readme` succeeded. Investigate with traces
  if the boot timeout recurs; it is not claimed fixed by a passing rerun.
- Current coverage fingerprint **`12bad032e603`**:

  | Scope | Lines | Statements | Functions | Branches | Files |
  | --- | ---: | ---: | ---: | ---: | ---: |
  | Node utilities / scripts | 66.03% | 62.48% | 65.56% | 59.87% | 35 |
  | Browser application / Vue | 96.00% | 92.61% | 91.05% | 83.54% | 36 |

  Separate scopes include newly added files; the native Chrome audit runner is
  exercised by the Lighthouse commands, not credited by the Node unit suite.
- `git diff --exit-code HEAD -- src/data public/illustrations/mycology` and
  `npm run audit:characteristics -- --compare-head`: passed; source records and
  derived characteristic keys unchanged, all 110 artwork assets present.
- `npm audit`: **0 vulnerabilities**. `git diff --check` passed; raw audits,
  coverage, and generated local previews follow existing Git exclusions.

The user approved this reviewed implementation and requested its Conventional
Commit. Chapter 7 CI remains pending and requires a separate instruction.
