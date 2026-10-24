# Chapter 6 — Code coverage tooling and reporting

Status: implemented, verified, and approved by the user for commit.
Reviewed: 2026-10-24.

## Tooling and scope decisions

- Use **Monocart Coverage Reports 3.0.0** for native V8 collection and standard
  Istanbul HTML/JSON/LCOV/Cobertura exports. The existing Node test runner and
  Playwright assertions remain the test engines. An explicit Vue compiler
  development dependency handles untested single-file components.
- Tooling requires **Node.js 22.15+**, reflected in package engines and README;
  verification used Node **24.4.1** and installed Chrome **155.0.8059.85**.
- Keep two independent coverage scopes. Shared utilities overlap them, so their
  percentages must not be averaged or presented as an invented combined score.

| Scope | Included source | Collection |
| --- | --- | --- |
| Node utilities / scripts | All shared `src/lib/**/*.mjs` and product `scripts/**/*.mjs`; coverage infrastructure excluded | 96 Node tests |
| Browser application / Vue | All handwritten `src/**/*.js`, `.mjs`, `.vue`; generated JSON, dependencies, CSS, and tests excluded | 47 main UI + 12 accessibility tests |

Untested/unloaded in-scope files count as zero. Node scope includes browser-facing
utility modules even when Node tests do not execute them; their browser execution
is visible in the other report. The standalone Instagram browser-console export
helper (`scripts/instagram-browser-export.js`) is unmeasured by these scopes.
Browser measurements cover script and compiler-generated template execution,
not CSS, image quality, assertion strength, or external Maps implementation.

## Baseline

Measured against the Chapter 6 working tree based on `8edf2a5`; the final report
fingerprint is **`aca5abc0e6e9`**. Percentages are standard mapped executable-code
metrics, not a fraction of every physical line in the source files.

| Scope | Lines | Statements | Functions | Branches | Files |
| --- | ---: | ---: | ---: | ---: | ---: |
| Node utilities / scripts | 66.89% | 62.75% | 63.94% | 60.11% | 30 |
| Browser application / Vue | 95.88% | 92.30% | 90.41% | 83.57% | 35 |

This establishes a reporting baseline. The current gate enforces successful
tests, collected data, complete file inclusion, valid nonempty metrics, and
current inputs. No arbitrary numeric floor has been imposed on pre-existing
untested CLI paths.

## Collection and integrity

- Node tests run in a child process with `NODE_V8_COVERAGE`; native data is merged
  before source mapping. Source files outside the project scope are filtered.
- Browser collection starts before each test's navigation, retains data across
  navigation/reloads, and persists it before page teardown. Four workers collect
  main UI data; accessibility tests retain sequential execution within their file.
  The final run produced 55 application-script samples from 59 passing tests;
  API-only/no-application-JavaScript tests correctly produce no script samples.
- The dedicated minified build lives in **`coverage/browser-build/`**. Hidden
  source maps are loaded explicitly by the collector, and report paths resolve to
  original `.vue`/`.js`/`.mjs` files. Coverage mode compiles a dummy Maps key;
  the existing Maps test double provides map behavior.
- Ordinary root and `/encyclopedia/` builds use `dist/`, source maps disabled,
  and the normal configured Maps key. Production output was checked for absent
  `.map` files; isolated coverage output was checked for present maps.
- All source files in each scope must be represented in the final summary.
  Untested Vue files are compiled for empty-counter mapping, including script,
  macro-only, and template-only components. A real edge case initially credited
  an unloaded props-only component through a synthetic compiler statement. The
  finalization step forces all counters to zero for files never observed by
  collection, preventing this inflation. MushroomMark.vue is correctly reported
  at 0% lines in the browser report.
- Fresh directories prevent cross-run counter accumulation. A failed run has a
  nonpassing manifest; failures preserve a nonzero command status. The summary
  publisher rejects incomplete/failed runs and fingerprint mismatches after
  source, tests, generated data, dependencies, or relevant configuration change.
- LCOV source records and Cobertura filenames are normalized to forward-slash,
  repository-relative paths. This fixes Windows-native separator output for
  downstream GitHub/coverage consumers. Cobertura uses `.` as its source root.

Source-map/compiler transformations affect per-line attribution, especially
macros and generated render callbacks. Inspect branch/function counters and
original-source annotations alongside line percentages.

## Reports, README, and GitHub integration

```sh
npm run coverage
# Optional separate runs:
npm run coverage:node
npm run coverage:ui
# Refresh tracked documentation after successful current-input runs:
npm run coverage:summary -- --update-readme
# Append to a GitHub runner's existing job summary:
npm run coverage:summary -- --github
```

Each scope produces:

- `coverage/<scope>/index.html`: browsable HTML with original source annotations.
- `coverage/<scope>/coverage-final.json` and `coverage-summary.json`: counters
  and per-file/aggregate metrics.
- `coverage/<scope>/lcov.info` and `cobertura-coverage.xml`: consumer formats.
- `coverage/<scope>/run.json`: status, runtime versions, revision, timestamps,
  and input fingerprint.

`coverage/summary.md` and `coverage/gaps.md` provide the overall table and leading
uncovered-file candidates. `coverage/` is Git-ignored, including the isolated
build, native data, samples, and Playwright diagnostics. The small README snapshot
and local SVG badges in `docs/coverage/` are tracked and explicitly refreshed;
the updater preserves surrounding README content and rejects ambiguous markers.

`npm run coverage` automatically appends the table when `GITHUB_STEP_SUMMARY` is
available. Explicit summary output was smoke-tested with a temporary job-summary
file, and a regression test verifies appending preserves existing job content.
Portable LCOV/Cobertura are ready for later CI/report consumers. Workflow triggers,
hosted artifacts, and automatic external uploads are Chapter 7 integration work.

## Useful follow-up gaps

`coverage/gaps.md` is generated from the actual per-file reports. Current examples:

- **Node artwork/content preparation:** `mycology-artwork.mjs` has 107 uncovered
  mapped lines (17.05% lines); `build-content.mjs` has 64 (18.98%). Preparation
  runs before collection, but these functions are not broadly exercised by the
  Node assertions. Add meaningful fixture-based generation/error-path tests.
- **Legacy import path:** `import-instagram.mjs` has 56 uncovered lines and 0%
  coverage. Its validation/storage/network boundaries merit integration fixtures.
- **Downloader:** 52 uncovered lines remain despite 78.94% line coverage; focus
  on untested CLI/state/error branches rather than duplicating successful cases.
- **Browser:** six uncovered mapped lines remain in scientific-search fallback
  handling; navigation/bootstrap and description-field removal have smaller gaps.
  Branch coverage is lower than line coverage for optional/missing-data states.
- Node-only 0% for the Maps loader/focus helpers must be read alongside their
  browser coverage. Browser execution does not test the real third-party API.

## Verification

- `npm run coverage`: **96 Node tests and 59 browser/accessibility tests passed**,
  both scopes generated, all 30/35 expected source files represented.
- Seven coverage-tooling regressions cover scope filtering, portable exports,
  missing/empty data, failed subprocess status, build/key/map isolation, stale
  snapshots, safe README replacement, GitHub append behavior, and unloaded Vue
  components with ordinary script, props-only, and template-only forms.
- `npm run coverage:summary -- --update-readme`: passed; badges and snapshot match
  the final reports. GitHub CLI summary smoke check passed.
- Both HTML reports opened in Chrome; the App.vue source link showed original
  Vue code. LCOV scope/path checks passed, including exclusion of vendor/data.
- Ordinary root build/bundle audit and **47 main browser tests**: passed.
- Ordinary `/encyclopedia/` build/bundle audit, **11 deployment tests**, and
  **12 accessibility tests**: passed.
- Dependency installation/audit: zero reported vulnerabilities.
- `git diff --exit-code -- src/data public/illustrations`: passed; corpus and
  artwork inputs remain stable. `git diff --check`: passed.

The corpus remains 388 observations, 327 taxa, and 1,641 photographs. `dist/`
is configured for `/encyclopedia/`; coverage reports/build are separate.
The user approved Chapter 6 and requested its Conventional Commit. Chapters 3
and 7 remain pending and await further instruction.
