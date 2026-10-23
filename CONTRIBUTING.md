# Contributing to Fungarium.INFO Encyclopedia

## Project memory and documentation

Read `PROJECT_MEMORY.md` before starting a changeset. Update it for **every
changeset**, including documentation-only changes, with a dated summary of the
changes, relevant decisions, verification actually performed, and unresolved
follow-ups. Keep durable project context current and recent entries concise.

Update `README.md` when user-visible behavior, setup, commands, source rules, or
deployment instructions change. Include memory and applicable documentation
updates in the same commit as the changes they describe. `AGENTS.md` records
this standing workflow for coding agents.

## Commit message convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
type(scope): concise imperative summary

Explain the change and its purpose. For larger changes, list the notable
features or behavior changes and the checks performed.
```

Keep the subject around 72 characters or fewer. Use a focused scope such as
`encyclopedia`, `catalog`, `filters`, `mycology`, `photos`, `slideshow`, or
`deploy`. Omit the scope when a change spans the whole project.

| Type | Use for |
| --- | --- |
| `feat` | New user-facing functionality |
| `fix` | Bug fixes |
| `docs` | Documentation changes |
| `test` | Test additions or corrections |
| `refactor` | Code restructuring without a behavior change |
| `perf` | Performance improvements |
| `build` | Dependencies, build tooling, or deployment configuration |
| `chore` | Repository maintenance |

Examples:

```text
feat(filters): add additive spore print colour filtering
fix(photos): constrain carousel thumbnails on mobile
docs: clarify encyclopedia subdirectory deployment
test(slideshow): verify pause and reduced-motion behavior
```

Mark incompatible changes with `!` after the type/scope and explain them in a
`BREAKING CHANGE:` footer when applicable.

## Local source inputs and generated content

The current Git exclusions keep root-level caption `*.txt` files, root-level
shell helpers, and `fungi-support/` local. Restore the caption files and branding
source assets from your local archive before running content-generation commands
in a fresh checkout. Downloaded post photographs, thumbnails, browser sessions,
and downloader checkpoints are also local inputs; see `README.md` for their paths.

Generated catalog JSON and the public logo, favicon, and TopNine assets are part
of the project snapshot. Update original captions and regenerate content with
`npm run content` when changing scientific records or media references.

## Verification

Run checks appropriate to the change. Available commands include:

```sh
npm test
npm run build
npm run test:ui
npm run test:subpath
```

The browser checks use installed Chrome. `test:subpath` creates a fresh build for
`/encyclopedia/`; use that output for the subdirectory deployment. Review the
staged diff before committing and describe significant verification in the
commit body. The README contains the complete setup and deployment instructions.
