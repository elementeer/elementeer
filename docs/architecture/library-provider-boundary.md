# Library Provider Boundary

## Purpose

This document defines the architectural distinction between:

- the local Elementor Library
- the Elementify Premium Library
- the future Elementify Cloud Library

It closes the gap identified in `ARCH-FA-004`: these three concepts must not remain only product language. They need explicit provider roles so `Advanced` can introduce a premium library without semantically collapsing into `Studio`.

Relevant implementation points:

- [library-providers.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/library-providers.ts)
- [library.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/types/library.ts)
- [advanced-product-surface.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/advanced-product-surface.md)
- [free-product-surface.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-product-surface.md)

## Provider Roles

### 1. Local Elementor Library

Role:

- primary operational target system
- local storage on the current WordPress site
- default source and destination for current Free and Advanced workflows

Properties:

- `kind`: `local-elementor`
- `scope`: `site`
- `availability`: `active`
- `storageModel`: `wordpress-local`
- `syncMode`: `none`

Interpretation:

- This remains the default library context.
- Elementify strengthens it, fills it, customizes it, and assembles around it.

### 2. Elementify Premium Library

Role:

- curated premium asset catalog
- Advanced-only browse / inspect / plan surface
- first visible `Elementify Library` experience in Advanced
- local-site operational premium layer

Properties:

- `kind`: `elementify-premium`
- `scope`: `catalog`
- `availability`: `gated` in Free, `active` in Advanced
- `storageModel`: `curated-catalog`
- `syncMode`: `manual-import`

Interpretation:

- Premium assets are imported into or used alongside the local Elementor Library.
- The operational flow is `list -> inspect -> plan -> manual import`.
- The execution seam for local import is the dedicated `library/import` route, not generic template CRUD.
- This is explicitly not cloud storage and not cross-site sync.

### 3. Elementify Cloud Library

Role:

- future Studio cloud-library and cross-site reuse layer
- future storage and delivery provider

Properties:

- `kind`: `elementify-cloud`
- `scope`: `workspace`
- `availability`: `planned`
- `storageModel`: `cloud-sync`
- `syncMode`: `cloud-sync`

Interpretation:

- This remains a deferred seam.
- It should not appear as an active runtime dependency in Free or Advanced.

## Boundary Rules

### Rule 1

The default provider for current product surfaces remains the local Elementor Library.

### Rule 2

Advanced may activate the premium provider, but only as a curated catalog that still resolves back into the local site context.

### Rule 3

The cloud provider remains planned only and must not be implied by premium-library wording.

### Rule 4

No Free or Advanced path should treat premium-library access as if it were cloud storage, cloud sync, or cross-site delivery.

## Practical Consequence

This gives the product three clean statements:

- `Free`: local Elementor Library only
- `Advanced`: local Elementor Library plus curated premium catalog
- `Studio`: later cloud library and cross-site reuse layer

That is the architectural guardrail that keeps `Advanced` strong without accidentally turning it into “partial Studio”.
