# Fungarium.INFO Encyclopedia

A Vue 3 + Vite photographic encyclopedia built from the original `*.txt` Instagram captions in `instagram-meta/`. The collection is **one card and page per scientific taxon**, with an expandable journal of its individual encounters.

## Features

- Black/charcoal design and original **Fungarium.INFO Encyclopedia** branding.
- Photo-first mobile introduction, full-width single-column species cards on phones, and optional advanced filters collapsed by default.
- Home navigation to the parent site, a direct link to the main Fungarium.INFO website, and a footer linking to the author's other projects.
- Auto-advancing TopNine photo slideshow for **2024, 2025, and 2026**, with year selection, previous/next controls, and pause/play.
- **3:2 landscape** gallery cards, encounter thumbnails, photo-selection strips, and featured-photo frames; full-image viewing with keyboard navigation.
- Scientific-name, multilingual, and category-based scientific-description search, plus year, initial-letter, hashtag, and sort controls.
- Independent **Fungi** and **Slime moulds** checkboxes to show either group or both.
- Automatically generated genus/family quick-link lists and a taxonomy-class dropdown. Genus, family, and class selections are mutually exclusive.
- Clickable **Family / Class** labels on gallery thumbnails for filtering directly from the photos.
- Additive mycological filters across all twelve illustrated characteristic categories, with contextual counts and individual, group, taxonomy-only, and global clear controls.
- Latest-record scientific profiles, original captions, multilingual names, GBIF/publication references, weather, habitat, and photography notes.
- Static, crawlable species HTML with page-specific metadata, social previews, structured data, a sitemap, and a no-JavaScript reading view.
- One JavaScript Google Map per species with pins from all its observations, plus individual coordinate links.
- Resumable Instagram photo downloading, offline WebP thumbnail generation, and an optional account-export importer.

## Contents

- [Design and branding](#design-and-branding)
- [Page metadata and crawlable profiles](#page-metadata-and-crawlable-profiles)
- [Observation maps](#observation-maps)
- [Setup and commands](#setup-and-commands)
- [Content generation and source rules](#content-generation-and-source-rules)
- [Search and filters](#search-and-taxonomic-quick-filters)
- [Illustrated characteristics](#illustrated-mycological-characteristics)
- [Images and thumbnails](#images-and-thumbnails)
- [Instagram photo downloader](#download-photos-from-the-caption-post-ids)
- [Account export and import](#account-export-and-import)
- [Project structure and script reference](#project-structure-and-script-reference)
- [Verification and deployment](#verification-and-deployment)
- [Follow-ups and TODOs](#follow-ups-and-todos)
- [Project memory and contributing](#project-memory-and-contributing)

## Design and branding

The black/charcoal theme takes its direction from [fungarium.info](https://fungarium.info/), with the original red mushroom logo and browser/device icons supplied in `fungi-support/favicon_package_v0.16/`. `npm run content`, `dev`, and `build` copy the selected artwork into `public/branding/` and `public/icons/`. Theme colours are centralized in `src/dark-theme.css`; the device manifest uses the same site identity and dark background.

The gallery prioritizes photography. On phones (up to 600 px wide), the TopNine slideshow appears before the introduction and species cards use one full-width column with larger captions. **Explore the collection** moves directly to the photo grid below the sticky header and respects reduced-motion preferences.

Species pages combine all usable observation coordinates on one inline Google Map when a Maps JavaScript API key is configured. Each encounter also retains its own coordinate link. DMS, curly-prime, prefixed-hemisphere, and annotated-decimal formats are normalized by `src/lib/coordinates.mjs`; the original caption text is retained as the visible link. Unparseable coordinates stay plain text rather than linking to an unrelated place.

The header's **Home** link resolves the parent of the deployment folder, including from a deeply nested species URL (the main domain root when deployed at `/encyclopedia/`). **The collection** and the logo return to the encyclopedia itself. **Fungarium.INFO** opens the main website at `https://fungarium.info/`, separately from the Instagram profile link. The **My other projects** footer includes AzrvanAkaranA, travel-pics.vip, herbarium.info, fungarium.info, algaerium.info, lichenarium.info, and plantarium.info. Project names and destination URLs are maintained in `src/site-links.js`.

## Page metadata and crawlable profiles

New visits use clean URLs, for example **`/encyclopedia/fungi/boletus-edulis/`**. A production build writes an actual `fungi/<species-id>/index.html` file for every published taxon, with its scientific profile, recorded encounters, image, and source hashtags readable before JavaScript runs. The same page becomes the interactive Vue view when JavaScript loads. The gallery HTML includes links to every profile, and `sitemap.xml` lists the collection and all clean species URLs.

Existing `/#/fungi/...` and `/#/?...` bookmarks remain supported. Hash fragments are not sent to the server, so use the clean profile URLs for sharing and crawling: those HTTP responses contain species-specific metadata directly. The client updates the same managed metadata during navigation, including titles, descriptions, canonical links, Open Graph and Twitter-card fields, social images/alt text, source-tag keywords, and Schema.org WebSite/CollectionPage/WebPage/Taxon/ImageObject/BreadcrumbList data.

Descriptions use the latest recorded overview, with a factual name/family/encounter fallback when an overview is absent. No scientific text, publication dates, social accounts, image licences, or missing source fields are invented. Filtered collection URLs are `noindex, follow` and canonicalize to the unfiltered collection; they do not publish an unfiltered ItemList as though it were their result set. Missing profiles and data-loading errors are also marked `noindex`. Tracking parameters are stripped from canonical URLs without making otherwise valid pages non-indexable.

The canonical origin defaults to **`https://fungarium.info`**; the path comes from Vite's deployment base. Set `SITE_ORIGIN=https://your-domain.example` in the build environment or ignored `.env.local` for another host, then rebuild. It must be an HTTP(S) origin with no path, query, or credentials. Use `npm run build:encyclopedia` for the production `/encyclopedia/` path; the root build/dev server uses `/`.

The build also creates `robots.txt` with the absolute sitemap URL. For a root deployment, serve it at `/robots.txt`. **For `/encyclopedia/` hosting, merge the generated Sitemap directive into the main site's existing origin-root `/robots.txt`**; a file served only at `/encyclopedia/robots.txt` is not authoritative for crawlers. Preserve the main site's existing crawler rules when merging.

Run `npm run content` followed by **`npm run audit:metadata`** to reproduce the source-data audit. Findings and Chapter 1 verification are recorded in [the metadata review report](docs/reviews/chapter-1-metadata.md). Source omissions remain explicit; update verified captions in `instagram-meta/` and regenerate to address them.

## Observation maps

Each species detail page displays a single interactive **Google Maps JavaScript** map above its field-encounter list, collecting usable coordinates from **all observations**, including historical and collapsed encounters. There is one pin per located observation, titled with its recorded location and date/time, and a pin count in the map caption. Repeated observations at the same coordinate retain separate pins, which can overlap.

The map starts in terrain view and automatically fits all recorded positions with padding. A single location (including repeated observations at that location) stays centered at zoom level 14 rather than over-zooming. Google Maps' built-in Data layer supplies the pins, so no separate map ID or geocoding request is required. The full-width map frame is 300 px high on desktop and 260 px on phones. Map/satellite switching, zoom, and fullscreen controls are available; cooperative gestures keep the page scrollable on phones.

The combined map loads when it comes near the viewport, independently of encounter expansion. The Google Maps script is shared across species navigation; map listeners and data layers are released when the species page changes. Individual coordinate links remain in the encounter metadata, including when the network or Google Maps authentication fails. With no configured key or no usable coordinates for that species, the site does not reserve map space.

### API key configuration

Vite reads the browser key from **`secrets/maps-api.key`** at development startup or build time. The file contains only the key, with optional surrounding whitespace. Alternatively, set **`GOOGLE_MAPS_API_KEY`** in the build environment or in an ignored `.env.local` file:

```dotenv
GOOGLE_MAPS_API_KEY=your-browser-maps-api-key
```

The environment value takes precedence over the key file. An explicitly empty value disables maps. Restart the development server or rebuild after changing the key. The Google Cloud project must have **Maps JavaScript API** enabled and billing configured.

This is a browser API key and is included in the compiled client JavaScript. Configure its HTTP-referrer restrictions for the production website and the local development/preview origins you use, and restrict its API access to Maps JavaScript API. The source `secrets/` folder is Git-ignored and stays outside `public/`; deploy the built `dist/` contents, not the secrets folder. The static deployment needs no runtime server-side key file.

## Setup and commands

### Requirements

- **Node.js 22.12 or newer**; Node.js 24 is recommended, with npm installed.
- **Google Chrome** for the authenticated photo downloader and Playwright browser checks. Building and browsing the website do not require Chrome on the build machine.
- The original caption files in `instagram-meta/`, plus the `TopNine/` collages and `fungi-support/` assets in the project root.
- A configured Maps JavaScript API browser key for inline observation maps; coordinate links work without one.

### Local Instagram metadata

Keep the local caption archive, text lists/notes, and shell helpers in **`instagram-meta/`**. Restore that folder from your local archive in a fresh checkout; its contents are Git-ignored. The content builder, caption audit, and downloader queue read dated caption filenames directly from this folder, independently of the caller's working directory. Shared source paths are defined in `scripts/project-paths.mjs`.

Run the local Bash helpers from the project root with:

```sh
bash instagram-meta/count-ids.sh
bash instagram-meta/count-ids-v2.sh
```

Each helper resolves captions beside its own script. Other text files and shell helpers in the folder are not imported as scientific records. Caption `sourceFile` values remain basenames; resolve them relative to `instagram-meta/`.

### Start development

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`).

### Command reference

| Command | Purpose |
| --- | --- |
| `npm run dev` | Regenerate content and branding assets, then start Vite on `127.0.0.1` |
| `npm run content` | Regenerate species pages, the gallery index, scientific search fields, organism groups, characteristic filter options/counts, and branding assets |
| `npm run audit:metadata` | Read generated content and report hashtag coverage/variants and missing profile/encounter source fields |
| `npm run build` | Regenerate content and create client assets, static species HTML, and SEO files in `dist/` |
| `npm run build:encyclopedia` | Build production assets for hosting at `/encyclopedia/` |
| `npm run preview` | Serve the existing production build locally; run `build` first |
| `npm run preview:encyclopedia` | Preview the subdirectory build at `/encyclopedia/` |
| `npm test` | Run Node.js tests for content extraction, search, taxonomy, characteristic filters, coordinates, and downloader behavior |
| `npm run test:ui` | Run Playwright browser checks against the existing production build using Chrome |
| `npm run test:subpath` | Build for `/encyclopedia/` and verify routing, assets, manifest, filters, and photo viewing in Chrome |
| `npm run photos:instagram -- <options>` | Run the resumable photo downloader or offline thumbnail generator |
| `npm run import:instagram -- "path/to/export.json"` | Import account content from a browser export with the earlier importer |
| `node scripts/audit-content.mjs` | Report caption omissions and unusual records without changing content |

After editing captions or adding images, run `npm run content` to refresh a running development site. `dev` and `build` also regenerate content automatically when started.

Generated clean routes work on ordinary static hosting with directory index files; legacy hash routes remain available. Deploy all of `dist/`, including the generated `fungi/` tree, after building. The interface uses locally bundled icons and system fallbacks for its optional Google Fonts.

## Content generation and source rules

- Source captions live in `instagram-meta/` and match `<name>_<YYYY-MM-DD>_<Instagram-shortcode>.txt`. Shortcodes may contain `_` and `-`; the parser takes **everything after the date separator**, including those characters.
- A `🆔 ` identification line supplies the scientific name. A normalized scientific name supplies the stable species ID and route, for example `boletus-edulis`. Taxonomic author names are excluded from the grouping key. Varieties, forms, and subspecies retain their ranks and epithets in the key. An unresolved genus-level record remains a separate taxon.
- Names are not automatically merged using presumed synonyms. In particular, `Ramaria eumorpha` and `Phaeoclavulina eumorpha` are separate named taxa until an explicit synonym mapping is agreed. No outside taxonomy is invented.
- All encounters for the same species ID appear on its page, newest first.
- **The single newest filename date supplies the entire scientific profile.** It supplies identification and authorship, classification, common names in all recorded languages, morphology, ecology, microscopy, other descriptions, references, and publication. Older profiles are never used to fill gaps in the newest profile. On the same day the filename/post ID is used as a deterministic tie-breaker.
- The taxonomy class is the final entry in that profile's recorded family/class or family/order/class classification. It is generated as `taxonomicClass`; a family-only or absent classification leaves the class empty.
- Filename dates are the unambiguous sort key. The date/time written in the caption is also displayed verbatim, including source discrepancies or ambiguous numeric dates.
- Older and newer formats are handled separately by their semantic markers and section positions: `ℹ️`, `🚫`, and `❌` start scientific descriptions; camera/processing lines end the block. Ecology inside that block is scientific information, while habitat between the observation date and the scientific block belongs to that encounter.
- Some older files have a revised second `🆔` block: the final scientific block is used for that file.
- `📖` can be a publication or a photo-count line; lines describing photos/images/views belong to the photographic record, not the bibliography. `📜` publications and `🦠` slime-mould classifications are supported.
- Weather, coordinates, camera, lens, lighting, exposure, processing, stacking, and other photographic details belong to each encounter. **Full original captions remain available**, including any source typos or mismatched hashtags.
- A species’ hashtag list is the case-insensitive, Unicode-NFC-deduplicated union of its encounters’ tags, retaining the first source spelling in newest-first encounter order. Extraction supports Unicode combining marks and punctuation/emoji boundaries while excluding URL fragments. Exact source captions remain untouched. Hashtag filters are case-insensitive but preserve meaningful accents; the profile displays a count and expandable/collapsible full list, or an explicit empty state.
- Plant records with a `🌸` classification and bucket-list posts without a `🆔` identification are excluded. Fungal plant parasites and slime moulds are retained.
- Organism groups come from the latest caption's recorded taxonomy and classification marker. Recorded slime-mould classes such as `Myxogastria` and `Protosteliomycetes` take precedence over historical `🍄` markers; `🦠` classifications identify slime moulds directly. Unclassified records are retained when both groups are shown.
- A caption with a placeholder `xxxxxxxxxxx` post ID is retained as a local encounter, but is not given a fabricated Instagram link.

The generator writes:

| Generated output | Contents |
| --- | --- |
| `src/data/posts.json` | Complete corpus, metadata, scientific profiles, taxonomy classes, encounters, organism groups, and compact characteristic keys |
| `src/data/index.json` | Gallery records with taxonomy classes, latest-profile text grouped by scientific category, generated search fields/counts, organism groups, characteristic keys, and mycological filter options/counts |
| `src/data/species/<species-id>.json` | Individual species pages, loaded on demand |
| `public/branding/` and `public/icons/` | Selected logo/favicon assets copied from `fungi-support/` |

Do not edit generated JSON by hand: update the source captions and run `npm run content`. The gallery does not need to download every full caption to search or apply characteristic filters.

## Search and taxonomic quick filters

The collection has one main search field and a **Search scope** selector. **Scientific name** searches only the recorded Latin name and scientific identification/authorship. **All fields** also searches multilingual common names, places, families, genera, taxonomy classes, hashtags, and the latest scientific descriptions. The **Scientific descriptions** options in the selector search a specific category, such as Cap or Hymenium. Search is case-insensitive, tolerates repeated spaces and diacritics, and requires all entered words to match. Descriptions can mention other taxa; choose **Scientific name** for a dedicated name search.

Advanced controls are in the **Filters** panel beside search, collapsed by default on all screen sizes. Open it for organism checkboxes, family/class/year dropdowns, genus/family quick links, scientific-description search fields, mycological characteristics, and the initial-letter selector. The button's badge counts selected taxonomy, year, letter, hashtag, characteristic, and description filters, plus an organism-group restriction. Closing the panel preserves selections; results, active chips, sorting, and **Clear filters** remain outside it. **Show … species** closes the panel and moves directly to the matching photos. Filtering takes effect immediately.

Each thumbnail shows **Family / Class**, for example **Boletaceae / Agaricomycetes**, as two separate filter links. Click, tap, or focus either name and press **Enter** to select that rank without opening the advanced panel. Selecting the class opens the whole class, replacing a narrower genus/family selection while preserving search, year, characteristics, organism groups, description searches, and sorting. The URL and active taxonomy chip update immediately; remove the chip to clear that selection. These are ordinary links that can be copied or opened in a new tab. The rest of the photo and its caption open the species page. Missing ranks are omitted; **Field discovery** is a plain label when neither rank is available.

Two separate **Genera** and **Families** sections list all recorded taxa alphabetically. They are constructed from the species data, deduplicated, and show counts of distinct named taxa rather than photographs or observations. Each section has its own list finder, scrollable links, an “All” link, and a collapsible heading.

The **Taxonomy class** dropdown lists every class recorded in the latest profiles, including slime-mould classes when present. Choosing a class, family, or genus replaces the other taxonomic selections. The genus/family quick links and family/class thumbnail links follow the same rule, and all other filters remain additive. URLs containing multiple taxonomic selections are normalized to one, with precedence **genus → family → class**.

### Scientific description searches

Open **Filters → Search scientific descriptions**, choose a category in **Add a search field**, and select **Add field**. Add as many category fields as needed alongside the main scientific-name search. For example, search the name `Boletus`, Hymenium `pores`, and Stipe `reticulate` together. Every entered category must match (**AND**), and all words entered within a category must occur in that category's text. Empty fields do not filter the collection.

Available fields are generated from categories in the **latest scientific profile** of each taxon: hymenium, cap, hymenium attachment, stipe, spore print, ecology, edibility, fruit body, dimensions, flesh, chemical reactions, odour, taste, microscopy, overview, and specialist categories when recorded. These include apothecium, ascomata, peridium, peridioles, perithecia, plasmodium, sporangia, uses/compounds, and other source categories. Case variants of a category label are combined, and category counts show how many taxa have recorded text in that field. New categories become available when content is regenerated.

These fields search the original description text, including recorded terminology, units, and ranges. Scientific text is never filled from older profiles or inferred from a photograph, taxon name, or an unrelated category. Category searches also combine with the existing illustrated characteristic checkboxes. Each active description has a removable results chip; **Clear description searches** clears just these fields. Entered values survive reloads and browser back/forward navigation.

### Fungi and slime moulds

The **Organism groups** controls have two independent checkboxes: **Fungi** and **Slime moulds**, both checked by default. Keep both checked to see the whole collection, or uncheck one to show only the other group. Unchecking both produces an empty result set. The counts beside the group names are collection totals; other filters continue to refine the chosen group.

Grouping uses recorded classification from the latest caption, including slime-mould taxonomy in older captions that use the mushroom emoji. A record without a supported classification remains unclassified and is included in the default view with both groups checked. The organism restriction has its own removable results chip, and **Clear all filters** restores both groups.

### Mycological filter combinations

The **Mycological filters** section adds filters for all twelve categories from the illustrated scientific profiles: fruiting form, cap shape, cap surface, hymenium, attachment, stipe, veil features, spore print/mass colour, ecology, edibility, flesh reaction, and spore morphology. Available options and compact per-species characteristic keys are generated from the latest scientific descriptions when content is rebuilt. Missing descriptions are labelled **Unspecified / unclassified**, separately from explicit absence or uncertain edibility.

Mycological filters are additive to taxonomy, scientific-name/description searches, organism groups, year, letter, and hashtag filters. Multiple values in the **same** category match any selected alternative (**OR**); selections in **different** categories are all required (**AND**). For example, a genus plus white spores plus a convex cap must satisfy all three filters. Counts show matches given the other active filters, excluding the category's own choices. Zero-count options remain selectable and display the normal empty state if they produce no results.

Clearing options:

- **Clear all filters**, prominently above the quick links, resets the main search, description fields, organism groups, taxonomy, characteristics, other filter selections, and local taxonomic list finders.
- **Clear description searches** removes only category-text searches, while individual description chips or field-removal buttons clear one category.
- Removing the organism-group chip restores both Fungi and Slime moulds.
- **Clear taxonomy** removes just the genus/family/class selection.
- Each selected taxonomic quick-link section has its own **Clear filter** link.
- **Clear characteristics** removes all mycological selections while preserving taxonomy and other filters.
- **Clear this group** removes only one characteristic category; individual active chips can also be removed.

### Shareable filter URLs

Selections are stored in shareable URL parameters and survive reloads and browser back/forward navigation. List-finder text only narrows its respective list of links and does not itself filter species.

| Parameter | Example | Meaning |
| --- | --- | --- |
| `q` | `q=Boletus%20edulis` | Search terms |
| `scope` | `scope=scientific` | Scientific identification only; use `trait:cap` (or another category ID) for one scientific-description category; omit or use `all` for all searchable fields |
| `sc.<category-id>` | `sc.hymenium=pores&sc.stipe=reticulate` | Independent description searches combined with AND; category IDs are generated from source labels |
| `organisms` | `organisms=slime-moulds` | `fungi`, `slime-moulds`, or `none`; omit for both groups |
| `genus` | `genus=Amanita` | Exact genus, replacing family/class selection |
| `family` | `family=Boletaceae` | Exact family, replacing genus/class selection |
| `class` | `class=Agaricomycetes` | Exact taxonomy class, replacing genus/family selection |
| `year` | `year=2026` | Species with an encounter in that year |
| `letter` | `letter=A` | Initial letter of the scientific name |
| `tag` | `tag=fungi` | Exact hashtag, without `#` |
| `sort` | `sort=newest` | `name` (default), `newest`, or `observations` |

Mycological parameters use stable characteristic IDs:

| Parameter | Example value |
| --- | --- |
| `mc.body` | `coral` |
| `mc.cap` | `convex` |
| `mc.surface` | `scaly` |
| `mc.hymenium` | `gills` |
| `mc.attachment` | `free` |
| `mc.stipe` | `bulbous` |
| `mc.veil` | `ring-volva` |
| `mc.spore-print` | `white` |
| `mc.ecology` | `mycorrhizal` |
| `mc.edibility` | `choice` |
| `mc.flesh` | `blue` |
| `mc.microscopy` | `ellipsoid` |

Use the UI for the complete list of values present in the current collection. `unrecorded` represents unspecified/unclassified information; `uncertain` is a separate edibility value.

Examples:

```text
/?genus=Amanita&mc.spore-print=white&mc.cap=convex
/?family=Boletaceae&mc.hymenium=pores
/?mc.cap=convex&mc.cap=flat&mc.attachment=free
/?scope=scientific&q=Boletus&sc.hymenium=pores&sc.stipe=reticulate&organisms=fungi
/?scope=trait:cap&q=scarlet-red
/?organisms=slime-moulds&sc.plasmodium-phase=watery
/?class=Myxogastria&organisms=slime-moulds
```

Repeating a characteristic parameter selects multiple alternatives in that category. The example with repeated `mc.cap` matches convex **or** flat caps, together with free hymenium attachment.

## Illustrated mycological characteristics

Each species’ scientific profile includes an interactive visual characteristics panel. The illustrations are original SVG clipart, with different geometry selected from the **latest scientific JSON traits**, rather than a fixed icon for each paragraph or a hardcoded species lookup.

Supported characteristics include:

- **Cap shape:** hemispherical, ovate, conical, bell-shaped, convex, flat, depressed, funnel-shaped, umbonate, umbilicate, lobed, and explicitly absent caps.
- **Cap surface:** smooth, scaly, veil-warted, striate, fibrillose, hairy/velvety, and viscid.
- **Hymenium:** gills, pores/tubes, ridges/false gills, teeth/spines, smooth surfaces, internal gleba, and no typical hymenium.
- **Attachment:** free, adnexed, adnate, sinuate/emarginate, decurrent/subdecurrent, and collarium.
- **Stipe and veil:** cylindrical, clavate, bulbous, tapering, rooting, lateral, hollow, solid, reticulate, scaly, ribbed, absent/reduced, ring, volva/remnants, ring-and-volva, cortina, and explicit ringlessness.
- **Spore print/mass:** named colour swatches, including compound olive-brown, purple-brown, rust-brown, chocolate-brown, cream, pink, and white. A spore mass is labelled separately from a spore print.
- **Ecology:** mycorrhizal, saprotrophic, parasitic, fungus/slime-mould-parasitic, insect-parasitic, lichenized, moss-associated, and explicit deadwood substrates.
- **Edibility:** choice edible, edible, conditionally edible, inedible/not consumed, poisonous, deadly poisonous, psychoactive, and uncertain.
- **Other structures:** coral, cup, saddle, bracket, puffball, earthstar, jelly, crust, honeycombed, club, mould, and sporangial forms; flesh-staining reactions; microscopic spore shapes and ornamentation.

Multiple icons can appear for one characteristic when the description records multiple stages or alternatives. Qualified wording such as “probably” or “sometimes” is marked. Omitted/unmatched characteristics stay unspecified or point to the description; they are not inferred from names, taxonomy, photographs, or hashtags. Negated traits are excluded, and historical consumption does not override a poisonous description.

**Open any tile to read its exact source text.** The full scientific paragraphs remain below the panel. Classification rules are in `src/lib/mycology.mjs`, illustrations in `src/components/MycologyGlyph.vue`, and the panel in `src/components/MycologicalCharacteristics.vue`.

## Images and thumbnails

Folders are prepared independently for full photographs and thumbnails:

```text
public/
  images/
    posts/
      CxBLMJGsB-n/
        01.jpg
        02.jpg
  thumbs/
    posts/
      CxBLMJGsB-n/
        01.webp
        02.webp
```

1. Use the exact Instagram shortcode (or the local encounter ID shown on the page) as the folder name.
2. Put full-size images in `public/images/posts/<post-id>/`.
3. Put their thumbnails in `public/thumbs/posts/<post-id>/`, using the **same basename**. Thumbnail extensions may differ from originals.
4. Run `npm run content`, or restart `npm run dev`, or build the site.

Supported formats: JPG, JPEG, PNG, WebP, AVIF. Photos are naturally ordered by filename (`01`, `02`, etc.). Missing thumbnails fall back to the original image. The gallery uses the first image of the newest encounter that has photographs. The species page supports multiple images and a keyboard-accessible full-image viewer; use **Escape** to close it and the **left/right arrows** to navigate.

Gallery and encounter image slots, thumbnail strips, featured images, and their placeholders use a **3:2 landscape display ratio**. Photos fill those frames; original files are retained for the full-image viewer. WebP thumbnail generation preserves each image's own aspect ratio inside a maximum 600 × 600 bounding box, rather than forcing a square crop.

Downloaded photographs and thumbnails under `public/images/posts/` and `public/thumbs/posts/` are excluded from Git. Make those folders available on the build machine when deploying with photographs; `npm run build` copies the public assets into `dist/`.

### TopNine slideshow

The homepage displays all three annual collages in the same introductory image space:

| Year | Original source | Generated public image |
| --- | --- | --- |
| 2024 | `TopNine/TopNine2024_fungarium-info_1400px.jpeg` | `public/images/fungarium-2024.jpeg` |
| 2025 | `TopNine/TopNine2025_fungarium-info.jpeg` | `public/images/fungarium-2025.jpeg` |
| 2026 | `TopNine/TopNine2026_fungarium-info.jpeg` | `public/images/fungarium-2026.jpeg` |

Slides advance every **five seconds** and loop through the years. Use the year buttons, previous/next controls, left/right arrow keys, or touch swipes to select a slide. Manual selection pauses rotation; the play button resumes it. Rotation is temporarily suspended while hovered or while the browser tab is hidden. Reduced-motion preferences start the slideshow paused.

The original square collages are displayed in full, independently of the 3:2 species-photo slots. Their individual tiles are not assigned to species. Sources and slide descriptions are defined in `src/lib/top-nine.mjs`, and playback is implemented in `src/components/TopNineSlideshow.vue`. Content generation copies all three images; asset paths work for root and `/encyclopedia/` deployments.

## Download photos from the caption post IDs

The resumable downloader reads Instagram post IDs from the local caption filenames in `instagram-meta/`, downloads **photos** from each post/carousel, and creates matching WebP thumbnails in the folders used by the Vue site. It selects the highest-resolution image returned by Instagram, preserves its original bytes/format, and makes thumbnails with a maximum width/height of 600 px, quality 80, without upscaling. Direct post lookups skip video slides and preserve carousel positions, so filenames can have gaps. In export mode, the export's `photos` entries determine the images to download.

### 1. Inspect the queue without making requests

```sh
npm run photos:instagram -- --dry-run
```

This shows the next batch, ignores placeholder IDs, and does not open a browser or modify files.

### 2. Log in once, manually

```sh
npm run photos:instagram -- --login
```

A **separate Chrome profile** opens. Log in to Instagram normally, leave that window open, then press Enter in the terminal. The script saves the browser profile in `content/instagram-browser/`, which is excluded from Git and is never copied into the public website. Your ordinary Chrome profile is not read. Chrome must be installed; the existing Playwright dependency starts it.

### 3. Start a small batch

```sh
npm run photos:instagram -- --limit 5
```

The default is 10 pending posts per invocation. Repeat the same command later to continue: completed posts are skipped, existing originals are reused, missing thumbnails are regenerated, and partially downloaded carousels resume. A missing original/thumbnail makes that post eligible again. The site’s content is automatically regenerated after photos or thumbnails are saved; rebuild for production deployment.

To process just a particular local post:

```sh
npm run photos:instagram -- --post CxBLMJGsB-n
```

Repeat `--post` to select several. To work through the full queue in one long-running session, use a larger batch limit, for example `--limit 400`; the same hourly limits and breaks still apply. **Ctrl+C** stops cleanly and keeps progress.

### Downloader options

Pass arguments after npm's `--` separator:

| Option | Behavior |
| --- | --- |
| `--dry-run` | Preview the queue or missing thumbnails without requests, a browser, or file changes |
| `--login` | Open the separate Chrome profile for manual login; run this as a separate operation |
| `--limit N` | Maximum pending posts to process; default `10`, accepted range `1–1000` |
| `--post ID` | Restrict work to a fungi post ID present in the caption filenames; repeat for several IDs |
| `--thumbs-only` | Generate missing thumbnails for local originals without network requests; processes selected local post folders |
| `--export FILE` | Read photo URLs from a browser export, avoiding post metadata API lookups |
| `--help` | Show command usage |

For example, download two selected posts:

```sh
npm run photos:instagram -- --post CxBLMJGsB-n --post DPaq0gVjEP0
```

### Request pacing and restrictions

Instagram does not publish a guaranteed safe interval for the web endpoint used here. **No script can guarantee that your session will not be rate-limited or restricted.** Runtime pacing is controlled by the `POLICY` object in `scripts/instagram-photo-lib.mjs`. The current configuration is:

| Control | Behavior |
| --- | --- |
| Concurrency | One request at a time |
| Post metadata lookups | 15–30 seconds apart |
| Longer breaks | At least one minute before the next lookup after every 50 lookups |
| Hourly cap | At most 400 post lookups per rolling hour; ordinary spacing still applies |
| Image CDN requests | 2–4 seconds apart |
| Between runs | At least one minute before another post lookup |
| HTTP 429, API 401/403, login/challenge/restriction response | Stop immediately; persist a cooldown of at least 24 hours |
| `Retry-After` | Honor a longer server-requested cooldown, including HTTP-date values |
| Other request errors | Stop, keep partial progress, and pause network work for at least one minute |
| Expired image URL | Stop; a later run refreshes the post’s media information rather than retrying immediately |
| Cached metadata | Reuse media information for up to one hour when resuming |
| Photo size limit | 30 MB per downloaded image |

`POLICY` is the source of truth if you change these values. A logged `Waiting … before the next post lookup` can exceed ordinary spacing because it also considers saved run delays, periodic breaks, and the rolling-hour cap. Existing scheduled timestamps survive restarts, including timestamps saved under an earlier configuration.

Pacing and cooldowns are recorded **before** requests in `content/photo-download-state.json`, so restarting does not reset them. A lock prevents concurrent downloader instances. There are no automatic network retries, rotating proxies, or challenge-bypass mechanisms. Do not delete the checkpoint to defeat a cooldown. If Instagram asks for verification, inspect it manually with `--login`; logging in does not clear a recorded cooldown. These web endpoints can change, in which case the script stops instead of repeatedly requesting them.

Unavailable posts (HTTP 404) and video-only posts are recorded as skipped. Completed originals/thumbnails are not overwritten. The checkpoint and browser profile are local/private; they are not included in `dist/`.

### Thumbnails only — entirely offline

```sh
npm run photos:instagram -- --thumbs-only
```

This creates missing WebP thumbnails for photographs already under `public/images/posts/<post-id>/`, without opening Chrome or contacting Instagram. Add `--dry-run` to preview the work.

### Use an existing browser export without post API lookups

```sh
npm run photos:instagram -- --export "C:/path/to/fungarium-instagram-export.json" --limit 5
```

This uses the existing browser export’s media URLs and makes **no post metadata API requests**, only paced image CDN requests. It keeps the local caption-based scientific content intact. Signed media URLs expire, so use a fresh export; if it reports an expired URL, provide a new export before resuming. The same checkpoints and restriction cooldowns apply.

## Account export and import

### Export from your logged-in browser

1. Open `https://www.instagram.com/fungarium.info/` in Chrome while logged in.
2. Open DevTools → **Console**.
3. Copy and run the complete contents of `scripts/instagram-browser-export.js`.
4. Save the downloaded `fungarium-instagram-export.json`.

The browser helper exports captions and media URLs. It records whether pagination completed; it does not export your cookies. Signed media URLs can expire, so download photos soon after creating an export.

For the current photo-folder layout, WebP thumbnails, and downloader checkpoints, use:

```sh
npm run photos:instagram -- --export "C:/path/to/fungarium-instagram-export.json"
```

### Earlier account-content importer

To import exported captions as account content, save the JSON in the project as `fungarium-instagram-export.json`, then run:

```sh
npm run import:instagram
```

Or specify a path:

```sh
npm run import:instagram -- "C:/path/to/fungarium-instagram-export.json"
```

This earlier importer stores media under `public/images/instagram/`, writes `content/instagram-export.json` and `content/media-manifest.json`, and rebuilds site content. It uses up to four concurrent image downloads and its own retry behavior; it does not use the resumable downloader's pacing/checkpoint policy or generate WebP thumbnails.

A **complete** account export becomes authoritative about published posts and captions, replacing the local-caption post selection during generation. An **incomplete** export augments local records. The `photos:instagram -- --export` command only uses media URLs and keeps the local caption-based scientific content intact.

## Project structure and script reference

```text
instagram-meta/               Local Instagram metadata archive (Git-ignored)
  *.txt                       Original captions, lists, and notes
  count-ids*.sh               Local Bash counting helpers
AGENTS.md                     Persistent coding-agent guidance
PROJECT_MEMORY.md             Durable decisions and changeset memory
CONTRIBUTING.md               Changeset workflow and commit convention
TopNine/                      Original 2024, 2025, and 2026 photo collages
fungi-support/                Original logo and favicon artwork
secrets/maps-api.key           Local Google Maps browser key (Git-ignored)
scripts/                      Content, audit, download, and import utilities
src/
  views/                      Gallery and species-detail pages
  components/                 Media, taxonomy, characteristic, and coordinate UI
  lib/                        Search, filter, coordinate, and mycology rules
  data/                       Generated gallery index and species JSON
  branding.js                 Shared site name and logo URL
  dark-theme.css              Dark theme and layout overrides
public/
  images/posts/<post-id>/      Full photographs
  thumbs/posts/<post-id>/      WebP thumbnails
  branding/                   Generated logo copy
  icons/                      Generated browser/device icons
  site.webmanifest            Site identity and dark install-screen colours
content/                      Local downloader state and optional account export
tests/                        Node.js tests and Playwright browser checks
dist/                         Generated static website
  fungi/<species-id>/index.html  Crawlable species HTML with server-readable metadata
  sitemap.xml                 Collection and clean species URLs
  robots.txt                  Crawler/sitemap template (merge at origin root)
```

| Script | Role |
| --- | --- |
| `scripts/build-content.mjs` | CLI/content builder used by `content`, `dev`, and `build`; scans captions and photos and writes generated JSON/filter data |
| `scripts/content-lib.mjs` | Caption parsing, taxon grouping, and export validation; shared module |
| `scripts/project-paths.mjs` | Shared project root and `instagram-meta/` source-directory resolution |
| `scripts/audit-content.mjs` | Standalone caption audit; reports missing descriptions, taxonomy, references, photography details, and genus-level identifications |
| `scripts/audit-metadata.mjs` | Read-only generated-content audit for hashtag coverage/variants and source-data omissions |
| `scripts/seo-pages.mjs` | Vite plugin generating metadata, readable static HTML, clean profile pages, sitemap, and robots template |
| `scripts/prepare-branding.mjs` | Branding asset-copy helper called by the content builder |
| `scripts/maps-config.mjs` | Read the Maps browser key from the environment or ignored local key file for Vite |
| `scripts/fetch-instagram-photos.mjs` | Resumable authenticated/export-based photo downloader and offline thumbnail CLI |
| `scripts/instagram-photo-lib.mjs` | Pacing policy, shortcode decoding, URL/image validation, image storage, and WebP helpers |
| `scripts/instagram-browser-export.js` | Script run manually in the logged-in Instagram page's browser console |
| `scripts/import-instagram.mjs` | Earlier full-account JSON importer |

Relevant application modules:

- `src/lib/catalog.mjs`: search, latest-profile class extraction, taxonomic indexes, and exclusive genus/family/class matching.
- `src/lib/scientific-search.mjs`: generated category definitions, latest-profile searchable text, normalization, category matching, and `sc.*` URL helpers; `ScientificSearchFilters.vue` provides the optional multi-field UI.
- `src/lib/organism-groups.mjs`: source-based Fungi/Slime moulds classification and organism-selection URL helpers.
- `src/lib/characteristic-filters.mjs`: generated characteristic options, compact species keys, contextual counts, and `mc.*` URL selection helpers.
- `src/lib/mycology.mjs`: evidence-based characteristic classification used by both species illustrations and gallery filters.
- `src/lib/coordinates.mjs`: coordinate normalization and pinned Google Maps URLs.
- `src/lib/google-maps.mjs`: shared lazy Maps JavaScript loader, timeout, and authentication-failure handling; `src/components/ObservationMap.vue` renders the species-level map with all observation pins.
- `src/lib/asset-urls.mjs`: resolve generated image/logo paths against Vite's deployment base.
- `src/lib/hashtags.mjs`: source hashtag extraction, Unicode/case normalization, deduplication, and exact-tag matching.
- `src/lib/seo.mjs`: shared canonical URLs, descriptions, social metadata, structured data, and client head updates.

Local/private files include `instagram-meta/`, `secrets/`, `content/instagram-browser/`, `content/photo-download-state.json`, and `content/photo-download.lock`. They are Git-ignored and are not copied as folders to the static site. The configured browser Maps key is compiled into JavaScript as described above. Export JSON and legacy media manifests are also excluded from Git.

## Verification and deployment

### Automated checks

```sh
npm run content
npm test
npm run build
npm run test:ui
```

The Node.js suite checks real caption extraction, latest-profile selection, generated scientific-category text/counts, combined field searches, recorded class extraction, taxonomic indexes/exclusivity, organism classification/selections, additive characteristic logic/counts, coordinate formats, Maps key configuration, hashtag fidelity/normalization, metadata generation/escaping, canonical URLs, structured data, sitemap content, and downloader/image handling. Downloader restriction and resume tests use mocked requests rather than contacting Instagram.

Browser checks cover desktop/mobile layouts, scientific-name/category search, multiple description fields, organism checkboxes, taxonomic links, thumbnail family/class filtering with keyboard and touch, class dropdown selection, characteristic selection, clear controls, URL persistence/back/forward navigation, maps links, branding, and illustrated profiles. Playwright launches installed Chrome and starts a production preview on `http://127.0.0.1:4173`; that port must be available. Screenshots are written to `test-results/`.

SEO checks fetch every published species HTML response, verify sitemap and social metadata, read a profile with JavaScript disabled, exercise clean and legacy URL navigation, verify dynamic metadata resets/error handling, and check hashtag expansion and case-equivalent filtering. These checks are separate from the pending formal WCAG and Lighthouse chapters.

Observation-map checks cover one map per species, lazy loading, exact current/historical pins, fitting all positions, single-location zoom, independence from encounter expansion, shared script loading, cleanup on navigation, mobile sizing, and network/authentication failure fallbacks. Browser suites intercept Maps JavaScript requests with a local test double, so automated checks make no live Maps API calls. Map-specific checks are skipped if the production build has no key; a nonempty dummy `GOOGLE_MAPS_API_KEY` at build time exercises these checks without a real key. Build with the actual browser key for deployment.

For a subdirectory deployment, also run:

```sh
npm run test:subpath
```

This command creates a fresh `/encyclopedia/` build and tests it at `http://127.0.0.1:4174/encyclopedia/`. It checks direct species routes, filter URLs, logo/favicon/manifest paths, and locally available photo thumbnails and lightbox images. The photo-specific check is skipped when no post photographs have been downloaded. This leaves `dist/` configured for `/encyclopedia/`; the standard root-path browser suite uses the output of `npm run build`.

### Static deployment

```sh
npm run build
npm run preview
```

Verify the local production preview, then upload the **contents of `dist/`** to the hosting root. Keep `index.html`, the generated `fungi/` pages, `assets/`, images, thumbnails, branding, icons, manifest, sitemap, and robots file together. Generated species routes have actual directory index files, so no SPA fallback rewrite is required for them. Keep the host's normal HTTP 404 behavior for missing directories. Legacy hash bookmarks continue to work in the browser.

### Deploy at `/encyclopedia/`

Build using the deployment-specific command:

```sh
npm run build:encyclopedia
```

This sets Vite's base to **`/encyclopedia/`**, including the trailing slash. Vue Router uses that base for clean routes and legacy hash bookmarks; static HTML, canonical/social URLs, sitemap entries, and photo/logo paths use it too. The manifest launches the clean collection URL, with scope and device icons relative to the deployment folder.

Preview the resulting build:

```sh
npm run preview:encyclopedia
```

Open `http://127.0.0.1:4173/encyclopedia/` using the port shown by Vite.

Upload the **contents of `dist/`** into the production server's **`encyclopedia/` directory**, for example:

```text
public_html/
  encyclopedia/
    index.html
    assets/
    fungi/<species-id>/index.html
    images/
    thumbs/
    branding/
    icons/
    site.webmanifest
    sitemap.xml
    robots.txt
```

The production URL will then be:

```text
https://fungarium.info/encyclopedia/
https://fungarium.info/encyclopedia/fungi/amanita-muscaria/
```

The server must serve directory index files for `encyclopedia/` and its generated species directories, and allow access to all static assets. Use the output of `build:encyclopedia` so HTML, canonical URLs, and compiled asset paths match the hosting folder. Merge the generated sitemap declaration into the origin-root robots file as described above. Existing `/encyclopedia/#/...` URLs remain browser-compatible aliases; prefer the clean URLs for sharing.

The site is static after generation: deploying new captions, images, or generated filter options requires a new build. The application does not need the Chrome profile, downloader state, or original caption files on the public web server.

## Follow-ups and TODOs

Chapter 1 is implemented and approved by the user. Chapters 2 and 3 are pending. Complete one chapter at a time, report the result, and wait for the user's green flag before committing or continuing. Record findings, fixes, and verification results in `PROJECT_MEMORY.md`.

1. **Page metadata and other missing supporting data**
   - [x] Audit gallery/species page metadata and miscellaneous missing data; provide factual metadata fallbacks and document source omissions in [the Chapter 1 report](docs/reviews/chapter-1-metadata.md).
   - [x] **1a — Hashtags:** verify source coverage, repair Unicode extraction and case-equivalent filtering/deduplication, and support complete expandable presentation.
   - [x] **1b — HTML and SEO:** implement titles/descriptions, canonical and robots directives, social metadata/images, structured data, static species HTML, a sitemap, and clean URLs with legacy bookmark compatibility.
   - [ ] **Source-content curation:** add verified missing overviews/descriptions/references/publications and optional encounter data to original captions when available; use `npm run audit:metadata` to locate them. These omissions are not filled with invented or older scientific text.
2. **WCAG verification**
   - [ ] Review the design and implementation against **WCAG 2.2 AA**, combining automated checks with manual keyboard and screen-reader testing.
   - [ ] Verify styles and colours, text/control contrast (including labels over photos), font sizes/weights, readability, zoom/reflow, and mobile layouts.
   - [ ] Verify semantic HTML, ARIA and labels, focus visibility/order, touch targets, navigation, filters, dialogs/lightboxes, slideshow controls, map interaction, and reduced-motion behavior. Record issues and verify fixes before closing the review.
3. **Lighthouse validation**
   - [ ] Run mobile and desktop Lighthouse audits against the production `/encyclopedia/` build for the gallery, a filtered collection, and representative species pages.
   - [ ] Save reports and record Performance, Accessibility, Best Practices, and SEO results with the tested URLs, build, and audit conditions.
   - [ ] Prioritize findings, implement improvements, and rerun the affected audits to confirm results.

## Project memory and contributing

Read [PROJECT_MEMORY.md](PROJECT_MEMORY.md) for current design decisions, user preferences, and recent changes. Update it with **every changeset**, including documentation-only changes, recording what changed, relevant decisions, verification actually performed, and unresolved follow-ups. Update this README whenever affected behavior or workflows change, and include the documentation with its implementation in the same commit.

[CONTRIBUTING.md](CONTRIBUTING.md) describes the contribution workflow and agreed Conventional Commits format. [AGENTS.md](AGENTS.md) preserves the standing project guidance for coding agents.

## License

Licensed under the [MIT License](LICENSE).

Copyright (c) 2026 Boriss Melikjan.
