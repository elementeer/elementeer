# Free Mirror Export Rules

## Purpose

This document defines how the private Forgejo primary repository can be mirrored to GitHub as a public `Free`-only repository without manual pruning.

It complements:

- [free-product-surface.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-product-surface.md)
- [advanced-product-surface.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/advanced-product-surface.md)
- [tier-capability-map.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/tier-capability-map.md)
- [free-mirror.manifest.json](/Users/andrelange/Documents/repositories/github/elementify-mcp/mirror/free-mirror.manifest.json)

## Mirror Model

### Canonical primary

- Private Forgejo repository
- Contains `Free`, `Advanced`, and future `Studio` seams

### Public mirror

- Public GitHub repository
- Contains only `Free`
- Must remain buildable and testable without private `Advanced` modules or `Studio` seams

## Export Rules

### Rule 1: Public tool surface must equal `registerFreeTools`

The public mirror tool surface is defined by [index.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/tools/index.ts) through `registerFreeTools`.

Implication:

- the public mirror must not expose any tool registered only through `registerAdvancedTools`
- the public mirror must not expose any tool registered only through `registerStudioFutureTools`

### Rule 2: Public build must not depend on private tiers

Free must build and test without:

- `advanced` tools
- `studio_future` tools
- premium-library-only code
- orchestration-only seams

Implication:

- Free-safe modules must not import private Advanced modules
- Free-safe modules must not import Studio-future modules

### Rule 3: Public docs must stay Free-scoped

The mirror may only ship Free-facing documentation.

Tracked in [free-mirror.manifest.json](/Users/andrelange/Documents/repositories/github/elementify-mcp/mirror/free-mirror.manifest.json):

- `publicDocumentation`
- `privateDocumentation`

Implication:

- Advanced product docs stay private
- internal packaging PRDs stay private
- Studio planning docs stay private

### Rule 4: Premium library is private

The mirror must not contain:

- private premium-library implementation
- premium-library asset logic
- docs that imply premium-library access is part of public Free

### Rule 5: Studio seams are not public promises

Future orchestration and cloud-library seams may exist in the primary repo, but they must not be published as part of the active public product surface.

## Verification

The repository now includes a machine-verifiable mirror check:

- [verify-free-mirror.mjs](/Users/andrelange/Documents/repositories/github/elementify-mcp/scripts/verify-free-mirror.mjs)
- [prepare-free-mirror.mjs](/Users/andrelange/Documents/repositories/github/elementify-mcp/scripts/prepare-free-mirror.mjs)

### Command outputs

`npm run verify:free-mirror`

- validates the manifest exists and is internally consistent
- confirms Free registration matches the `free` tier exactly
- confirms Advanced and Studio-future registrations stay out of the public surface
- prints the public tool entrypoint and the public/private documentation counts

`npm run prepare:free-mirror`

- removes any existing `mirror/generated/free-public/` directory first
- copies only the manifest's public docs into the staging tree
- emits `free-tool-surface.json` and a staging `README.md`
- prints the staging path, public doc count, and Free tool count

`npm run release:free-mirror:gate`

- runs build, Free contract tests, mirror verification, staging preparation, and release verification in sequence
- succeeds only when all subcommands succeed
- is the operator-facing binary gate before publication

It verifies:

- required public and private docs exist
- `registerFreeTools` matches the `free` tier exactly
- `registerAdvancedTools` matches the `advanced` tier exactly
- `registerStudioFutureTools` matches the `studio_future` tier exactly
- `registerAllTools` can produce a true Free-only surface
- forbidden tiers do not leak into Free registration

The mirror staging script also emits a Free surface snapshot that is derived from the same runtime manifest, so the exported public docs and the registered tool surface stay in lockstep.

It can also prepare a staging artifact for the public mirror:

- copies only tracked public docs
- generates a machine-readable Free tool surface index
- embeds the Free product surface snapshot derived from the runtime build
- creates a generated staging folder under `mirror/generated/free-public/`
- starts from a clean staging directory and produces deterministic dry-run output without time-based metadata
- fails the release gate if the staged file list drifts from the manifest

Public-facing Free docs now also include:

- [docs/quickstart/free.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/quickstart/free.md)
- [docs/release/free-public-release-checklist.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/release/free-public-release-checklist.md)

## Expected Release Flow

### Private Forgejo primary

1. Build shared and MCP server
2. Run test suite
3. Run Free mirror verification
4. Prepare the Free mirror staging artifact using the manifest and tier boundaries
5. Run the Free release verifier

### Public GitHub mirror

1. Export only the `Free` surface and allowed docs
2. Verify the public build still works
3. Publish mirror update

## Operational Command

```bash
npm run release:free-mirror:gate
```

The private operational runbook lives in:

- [docs/release/forgejo-github-free-mirror-runbook.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/release/forgejo-github-free-mirror-runbook.md)

## Guardrail

If the mirror verifier fails, no public mirror publication should proceed.

If the staging output contains stale files or non-deterministic metadata, treat the dry-run as failed and regenerate from a clean state.
