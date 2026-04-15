# Studio Deferment Note

## Purpose

This note locks the current deferment boundary for `Studio`.

It exists so that:

- `Free` can stay public and mirror-safe
- `Advanced` can stay strong without drifting into pseudo-Studio promises
- future `Studio` work can be added through existing seams instead of by rewriting current product boundaries

Relevant current seams:

- [library-provider-boundary.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/architecture/library-provider-boundary.md)
- [phase-2-foundation.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/architecture/phase-2-foundation.md)
- [free-advanced-launch-prd.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-launch-prd.md)
- [product-entitlements.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/product-entitlements.ts)

## Explicitly Deferred To Studio

The following remain deferred and must not be implied as active behavior in current `Free` or `Advanced`:

- cloud library
- cross-site template storage
- cross-site sync
- delivery orchestration
- team or workspace cloud semantics
- multi-client cloud operations

## What Free And Advanced May Do Today

### Free

- operate on the current site
- use the local Elementor Library
- provide assessment, recommendations, creator-light, and validation workflows

### Advanced

- extend the same local-site core
- use the curated premium catalog
- import premium assets into the local Elementor Library
- provide deeper creator, critique, governance, and theme-builder workflows

## What Free And Advanced Must Not Imply

- that the premium catalog is a cloud library
- that premium assets sync across sites
- that current workflows operate on a shared workspace
- that delivery orchestration already exists as a live product surface
- that agencies or teams have Studio-style cloud coordination today

## Architectural Rule

Current product surfaces may reference `studio_future` only as a seam, not as an active dependency or marketed capability.

That means:

- `Free` stays public, local-site-first, and mirror-safe
- `Advanced` stays private, local-site operational, and non-cloud
- `Studio` remains a future layer introduced through:
  - provider boundaries
  - entitlement extension
  - later orchestration-specific modules

## Current Source Of Truth

Until Studio is intentionally activated, the source of truth is:

- local Elementor Library for active storage and execution
- curated premium catalog for Advanced-only premium usage
- `studio_future` tier only for architectural reservation

## Product Rule

If a feature requires cloud library, cross-site sync, workspace storage, or delivery orchestration semantics, it is not a current `Free` or `Advanced` feature. It belongs to future `Studio`.
