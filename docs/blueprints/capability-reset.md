# Elementify Capability Reset

## Purpose

This document resets the capability model under the scenario-first and wizard-first product design.

Its job is to ensure that capabilities act as:

- technical safety boundaries
- runtime enforcement layers
- governance and automation guardrails

and not as:

- the primary product language
- the main user-facing information architecture

## Reset Principle

Elementify should be described to users through:

- scenarios
- wizard families
- stack profiles
- skill profiles
- addon profiles

Capabilities sit beneath that layer.

They exist so the system can:

- read and write the right technical surfaces
- scope API keys and automation safely
- guard higher-risk operations
- separate Free, Advanced, and later Studio behavior at the enforcement layer

## Problem With the Current Mixed State

The current repository contains a mixed capability state.

Examples include:

- resource-shaped capabilities such as templates, pages, and site
- UI/governance groups that partially exceed the typed source of truth
- product narratives that now operate at a higher scenario and wizard level than the current capability vocabulary

That mixed state is understandable as an intermediate implementation step, but it should not remain the long-term product architecture.

## Three-Layer Model

## 1. Product layer

User-facing and documentation-facing model.

This layer talks about:

- bootstrap
- relaunch
- optimization
- extension
- migration
- guided, assisted, and technical wizard paths

## 2. Domain capability layer

Technical domains that reflect meaningful operating surfaces.

This layer should model:

- what kind of system surface is being touched
- how risky that surface is
- whether read, prepare, or write access is needed

## 3. Low-level execution mapping

Tool and endpoint mapping.

This layer maps individual tools and actions to the domain capability layer without forcing every action to become a product-level concept.

## Domain Capability Model

The domain capability layer should be organized around these families:

- `site-audit`
- `stack-bootstrap`
- `site-foundation`
- `design-system`
- `content-structure`
- `theme-structure`
- `library-operations`
- `media-operations`
- `plugin-stack-context`
- `governance`
- `workflow-orchestration`

These families are technical enough to enforce safety, but still coherent with the scenario model.

## Capability Shape

Capabilities should follow a restrained action vocabulary, not a flat explosion of verbs.

Preferred action shapes:

- `read`
- `prepare`
- `write`
- `import`
- `export`
- `review`
- `apply`

Not every domain needs every action.

## Recommended Domain Families

## `site-audit`

Use for:

- assessment
- site context
- fingerprint
- destination understanding

Typical actions:

- `read`

## `stack-bootstrap`

Use for:

- stack readiness diagnosis
- install and activation guidance
- prepared baseline changes

Typical actions:

- `read`
- `prepare`
- `write`

Important note:

`write` here should remain tightly governed because bootstrap may touch themes, plugins, or baseline configuration.

## `site-foundation`

Use for:

- site identity
- logo
- baseline site settings needed for a working starting point

Typical actions:

- `read`
- `write`

## `design-system`

Use for:

- global colors
- typography
- brand-level presentation settings

Typical actions:

- `read`
- `write`

## `content-structure`

Use for:

- page data
- section composition
- widget structures
- Elementor document structures on pages and local templates

Typical actions:

- `read`
- `write`

Important note:

This is the correct home for most “widget read/write” concerns because ordinary widgets live inside Elementor content structures rather than as standalone top-level resources.

## `theme-structure`

Use for:

- theme builder structures
- site-wide structural templates
- headers, footers, archives, singles, and similar system-level layouts

Typical actions:

- `read`
- `write`

## `library-operations`

Use for:

- local Elementor library management
- premium library import into local library
- template export/import boundaries

Typical actions:

- `read`
- `write`
- `import`
- `export`

## `media-operations`

Use for:

- stock media
- generated media
- sideloading or related asset operations

Typical actions:

- `read`
- `write`

## `plugin-stack-context`

Use for:

- supported addon detection
- addon profile shaping
- plugin context understanding

Typical actions:

- `read`
- `prepare`

Default rule:

- prefer `read` and `prepare`
- do not assume direct plugin modification or activation is always appropriate

## `governance`

Use for:

- change queue
- review and approval
- governed apply behavior

Typical actions:

- `read`
- `review`
- `apply`
- `write`

## `workflow-orchestration`

Use for:

- deeper multi-step operating flows
- future Studio-adjacent orchestration seams

Typical actions:

- `read`
- `prepare`
- `write`

Important note:

This domain should remain carefully scoped so current Free and Advanced products do not accidentally promise Studio semantics.

## Free vs Advanced Interpretation

The capability model should not define tiers directly, but it must support them clearly.

### Free

Free should primarily use:

- `site-audit`
- `stack-bootstrap`
- `site-foundation`
- `design-system`
- `content-structure`
- `library-operations`
- selected `plugin-stack-context`

### Advanced

Advanced deepens use of:

- `theme-structure`
- `media-operations`
- `governance`
- richer `workflow-orchestration`
- deeper `plugin-stack-context`

## Migration Plan From Current State

The reset should happen in three phases.

### Phase 1 — Freeze the old model conceptually

Treat the current mixed capability vocabulary as implementation legacy, not as future product truth.

### Phase 2 — Introduce domain capability source of truth

Add a new typed domain capability definition that matches this document.

### Phase 3 — Remap tools and endpoints

Map current tool and endpoint behavior to domain capabilities and keep the older resource-shaped terms only as transitional aliases where necessary.

### Phase 4 — Realign governance and admin UI

Present user-facing controls in grouped scenario/domain language instead of raw resource language wherever possible.

## Guardrails

- Do not let capabilities become the product's front-door taxonomy.
- Do not create a separate capability for every tool action.
- Do not lose safety boundaries just because the product surface becomes wizard-first.
- Do not map Studio-future orchestration into current Free claims.

## Binary Success Criteria

- Capabilities are explicitly documented as a technical safety layer beneath scenarios and wizards.
- The reset model supports stack-bootstrap, site foundation, design system, content structure, theme structure, library, media, plugin context, governance, and workflow orchestration.
- The model explains why ordinary widget operations belong under content structure.
- A migration path from the current mixed capability vocabulary is documented.
