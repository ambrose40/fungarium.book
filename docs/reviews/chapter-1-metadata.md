# Chapter 1 — Page metadata, hashtags, and HTML/SEO

Status: implemented and approved by the user.
Reviewed: 2026-10-24.

## Audit findings and changes

- The previous HTML contained one generic description and partial Open Graph
  fields. Species metadata depended on JavaScript, and hash fragments were never
  sent to the server. Social-preview services therefore received the collection
  page for every hash-based profile link.
- Production builds now generate a readable collection page and 327 real species
  HTML pages at `fungi/<species-id>/index.html`. Each contains its own title,
  description, canonical URL, robots directive, social image/alt text, source
  keywords, structured data, scientific profile, and encounter information.
- New visits use clean URLs. Existing hash bookmarks retain their browser
  behavior, including opening a hash bookmark from an already open clean page.
  Deep profile reloads, Home/collection links, previous/next navigation, and
  root versus `/encyclopedia/` deployments are covered.
- Client metadata is replaced as one managed set on navigation. Filtered
  collections and error views are `noindex`; canonical URLs omit filters and
  tracking parameters. Filtered pages omit the unfiltered collection ItemList.
- Schema.org data describes the website, collection, profile page, recorded
  taxon/family, primary image, and breadcrumbs. Recorded common names and direct
  GBIF references are included when present. Publication timestamps, unknown
  social accounts, image licences, and missing scientific facts are not invented.
- `sitemap.xml` contains 328 clean URLs: the collection plus all 327 profiles.
  The generated robots template points to the correct absolute sitemap URL.

## Hashtags

- All 388 observations contain source hashtags; the corpus has 1,955 unique tags
  after Unicode-NFC and case normalization.
- A decomposed Unicode tag in the Leptoporus mollis caption was previously
  truncated to `lillatu`. Extraction now preserves its full recorded spelling,
  displayed in NFC as `lillatümak`.
- `polypore` / `Polypore` is a recorded case variant. Matching and deduplication
  now treat those forms as equivalent; presentation retains the first spelling
  in newest-first source order. The Phaeolus schweinitzii list loses its duplicate
  case-only tag. Meaningful accents remain distinct.
- Extraction accepts combining marks, punctuation, and emoji boundaries, and
  excludes URL fragments and word-internal hashes. Original captions remain
  byte-for-byte unchanged in the generated records.
- Profiles show a tag count, an expandable/collapsible full list, and an explicit
  empty state for future records without tags. Tests verify expansion and
  case-equivalent filtering; no substitute taxon hashtags are synthesized.

## Source-content omissions for future verified curation

These are recorded source gaps, not automatically generated replacement facts.
The page metadata has a factual taxon/family/encounter fallback where necessary.
Optional encounter fields can legitimately be absent or inapplicable.
Counts are presence checks; external-reference correctness and applicability of
optional fields still require source-author review.

| Field | Affected records |
| --- | ---: |
| Latest profile overview | 6 taxa |
| Latest scientific description | 3 taxa |
| Latest classification | 0 taxa |
| Direct GBIF reference in latest profile | 10 taxa |
| Publication in latest profile | 2 taxa |
| Observation date/time | 0 observations |
| Location | 0 observations |
| Coordinates | 19 observations |
| Weather | 3 observations |
| Camera / lens | 0 observations |
| Source hashtags | 0 observations |

Latest profiles without an overview:

- `entoloma-vernum`
- `mycena-inclinata`
- `otidea-bufonia`
- `paxillus-involutus`
- `phaeolus-schweinitzii`
- `trametes-hirsuta`

The three without scientific description text are Mycena inclinata, Otidea
bufonia, and Trametes hirsuta. The publication gaps are Mucilago crustacea and
Physarum rubiginosum. Weather is absent for the three recorded Penicillium
profiles. `npm run audit:metadata` lists all affected caption filenames, including
the missing direct references and coordinates. Update verified source captions
in `instagram-meta/` and regenerate content to address them.

## Deployment and review notes

- Default canonical origin: `https://fungarium.info`. Optional `SITE_ORIGIN`
  changes the origin; Vite's base selects `/` or `/encyclopedia/`.
- Upload the complete production build, including the generated `fungi/` tree.
  Directory index serving supports clean profile URLs without an SPA rewrite.
- With subdirectory hosting, merge the generated Sitemap declaration into the
  existing origin-root `/robots.txt`; `/encyclopedia/robots.txt` alone is not the
  authoritative crawler policy. This is a release-time hosting step.
- Use clean profile URLs for social sharing; legacy hash aliases cannot supply
  species-specific HTTP responses because their fragments are not transmitted.
- Chapter 2 WCAG verification and Chapter 3 Lighthouse audits are still pending.
  This chapter's browser checks do not claim either audit has been completed.

## Verification

- Unit tests cover source hashtag fidelity, Unicode/case normalization, metadata
  fallbacks and escaping, canonical/base handling, structured-data consistency,
  source omissions, filtered/error indexing directives, and sitemap coverage.
- Browser checks fetch every species' raw HTML, read a profile with JavaScript
  disabled, exercise clean and legacy navigation, verify dynamic metadata/error
  resets, and check tag expansion and matching.
- Development-server smoke checking verified both server-delivered species HTML
  and the interactive profile at `/fungi/boletus-edulis/`.
- `npm test`: 78 tests passed.
- `npm run build -- --logLevel error`: root production build passed.
- `npm run test:ui`: 44 tests passed, including every raw species response.
- `npm run build:encyclopedia -- --logLevel error`: subdirectory build passed.
- `npx playwright test --config=playwright.subpath.config.js`: 10 tests passed.
- `npm run audit:metadata` and `git diff --check`: passed.
- Commit review: 13 content/hashtag tests passed again after import-layout cleanup.

The user approved Chapter 1 and requested its commit. The next chapter awaits
further instruction.
