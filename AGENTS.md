# Project guidance

Read `PROJECT_MEMORY.md` at the start of work for current decisions, user
preferences, and recent changes. Use `README.md` for application behavior,
commands, source rules, and deployment details, and `CONTRIBUTING.md` for the
commit convention and contribution workflow.

## Maintain project memory for every changeset

- The user requests a project-memory update with every changeset, including
  documentation-only changes.
- Before completing a changeset, update `PROJECT_MEMORY.md` with a dated summary
  of what changed, relevant decisions, verification actually performed, and any
  unresolved follow-up. Keep durable context current and recent entries concise.
- Update `README.md` whenever user-visible behavior, setup, commands, content
  rules, or deployment instructions change.
- Include applicable memory and documentation updates in the same commit as the
  changes they describe.
- Use Conventional Commits as documented in `CONTRIBUTING.md`. Commit or push
  only when the user requests it.

## Implementation essentials

- Keep the gallery photo-first, with optional advanced filters and a single
  column of species cards on phones.
- Preserve URL-backed filter selections and genus/family/class exclusivity.
- Scientific profiles come entirely from the latest dated caption for each
  taxon. Captions, text metadata, and local shell helpers live in the ignored
  `instagram-meta/` folder. Update source captions and regenerate content rather
  than hand-editing generated JSON.
- Treat caption archives, original support assets, downloaded photographs,
  thumbnails, browser profiles, and downloader state according to the existing
  Git exclusions; do not stage local/private files.
- Run checks appropriate to the change and record their actual results. Browser
  tests use installed Chrome and the production build; see `README.md` for the
  root and `/encyclopedia/` build distinction.
