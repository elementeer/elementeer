# Elementify Free + Advanced Final Completion Plan

## 1. Purpose

This document turns the current Elementify state into a clean final execution ladder for:

- completing the runtime product behavior of `Free`
- completing the runtime product behavior of `Advanced`
- locking public/private packaging and release behavior afterward

It assumes:

- the scenario-first and wizard-first blueprint is now stable
- Free/Advanced surfaces and mirror boundaries already exist
- the remaining distance is mainly runtime depth, workflow chaining, and product hardening

Grounding artifacts:

- [free-advanced-launch-prd.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-launch-prd.md)
- [free-advanced-scenario-wizard-prd-v2.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-scenario-wizard-prd-v2.md)
- [free-advanced-full-scope-gap-map.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-full-scope-gap-map.md)
- [free-preset-execution-report.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-preset-execution-report.md)
- [runtime-transition-uplift-execution-report.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/runtime-transition-uplift-execution-report.md)

## 2. Current Completion View

### Free

Blueprint and packaging:

- strong
- effectively complete for current scope

Runtime behavior:

- scenario routing exists
- first runtime wizard families exist
- first limited preset execution exists
- still missing fuller scenario coverage and stronger short guided execution

Current estimate:

- blueprint/surface: `95%+`
- runtime/product behavior: `78-82%`

### Advanced

Blueprint and private surface:

- strong
- clearly differentiated from Free

Runtime behavior:

- deeper workflows exist
- recommendation depth exists
- premium library and critique loops exist
- still missing a true scenario-first front door and fuller scenario integration

Current estimate:

- blueprint/surface: `93-95%`
- runtime/product behavior: `72-76%`

## 3. Final Completion Strategy

Recommended mode:

- `sequence_type`: `build`
- `execution_mode`: `ralph_attended`

Recommended lane logic:

- `free-runtime lane`
- `advanced-runtime lane`
- `surface-release lane`

Keep central and tightly controlled:

- [mcp-server/src/tools/index.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/tools/index.ts)
- [mcp-server/src/product-tiers.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/product-tiers.ts)
- [mcp-server/src/product-surfaces.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/product-surfaces.ts)
- [mirror/free-mirror.manifest.json](/Users/andrelange/Documents/repositories/github/elementify-mcp/mirror/free-mirror.manifest.json)

## 4. Remaining Completion Slices

### FREE-COMP-001 — Guided transition chaining

Goal:

Turn the new Free preset runner into short, scenario-aware guided transitions for the most important early paths.

Scope:

- chain safe presets for `stack-bootstrap`
- chain safe and preview steps for `optimization-lite`
- preserve explicit guardrails and status reporting

Acceptance:

- a Free tool can run a short guided transition instead of one preset at a time
- safe steps execute, preview-only steps remain preview-only
- transition output explains what happened and what remains manual

### FREE-COMP-002 — Scenario family completion

Goal:

Complete the missing Free runtime scenario families.

Scope:

- `new-site-lite`
- `extension-lite`
- explicit mapping for `clean-up` and `refresh`

Acceptance:

- all major Free scenarios from the scenario blueprint map to a real runtime wizard family
- front-door routing no longer drops important Free intents into generic fallback

### FREE-COMP-003 — Profile-aware runtime shaping

Goal:

Make stack, skill, and addon profiles change runtime defaults more meaningfully.

Scope:

- apply profile influence to brand-setup defaults
- apply profile influence to creator defaults
- apply addon-profile guidance to scenario-family follow-ups

Acceptance:

- runtime outputs and preset defaults change in observable ways based on routed profiles
- this behavior remains deterministic and testable

### FREE-COMP-004 — Public Free runtime lock

Goal:

Lock the public-facing Free runtime story after the scenario-first shift.

Scope:

- public docs
- quickstart
- mirror-safe tool grouping
- public includes/excludes

Acceptance:

- Free docs, runtime grouping, and mirror rules stay mutually consistent

### ADV-COMP-001 — Advanced scenario front door

Goal:

Add a true scenario-first front door for Advanced above `advanced_creator_mode`.

Scope:

- route deep relaunch
- route migration
- route critique/repair
- route premium rollout

Acceptance:

- Advanced no longer starts as a flat deeper tool shelf
- scenario entry is explicit and distinct from Free

### ADV-COMP-002 — Deep scenario workflows

Goal:

Turn the main Advanced scenario families into stronger runtime workflows.

Scope:

- deep relaunch
- migration
- critique-repair
- premium-page rollout

Acceptance:

- each key Advanced scenario has a multi-step plan with real workflow applications and stronger handoffs

### ADV-COMP-003 — Upgrade and stack-shaping runtime

Goal:

Operationalize Advanced upgrade guidance and stack shaping.

Scope:

- smarter upgrade-path wizard behavior
- richer Elementor Pro vs Advanced reasoning
- stronger supported pro-addon guidance

Acceptance:

- Advanced upgrade advice is scenario-driven at runtime, not only in blueprint docs

### ADV-COMP-004 — Productivity finish

Goal:

Make Advanced clearly feel like a productivity layer, not only deeper tooling.

Scope:

- stronger variant / blueprint guidance
- stronger governance-aware follow-up behavior
- stronger reuse-light workflow behavior

Acceptance:

- at least one Advanced path feels measurably more “workflow-reducing” than today

### REL-COMP-001 — Final surface and release lock

Goal:

Run the final product lock after Free and Advanced runtime completion.

Scope:

- Free mirror verification
- Free release verification
- Advanced surface verification
- Studio deferment sanity check

Acceptance:

- public and private product promises match the implemented runtime surfaces

## 5. Recommended Batch Order

### Batch A

- `FREE-COMP-001`
- `FREE-COMP-002`

### Batch B

- `FREE-COMP-003`
- `FREE-COMP-004`

### Batch C

- `ADV-COMP-001`
- `ADV-COMP-002`

### Batch D

- `ADV-COMP-003`
- `ADV-COMP-004`

### Batch E

- `REL-COMP-001`

## 6. Binary Completion Criteria

The plan is complete when:

- Free scenario routing covers bootstrap, new-site-lite, optimization-lite, relaunch-lite, extension-lite, and mapped cleanup/refresh behavior
- Free supports short guided transitions for the most important early paths
- profile routing has visible runtime consequences
- Advanced has a scenario-first front door and stronger deep workflows
- Advanced runtime upgrade guidance is live
- public docs and mirror output remain Free-safe
- final release gates still pass after all runtime additions

## 7. Recommended Immediate Next Slice

Start with:

1. `FREE-COMP-001`

Reason:

- it deepens Free meaningfully without creating unsafe automation
- it builds directly on the current runtime wizard and preset layer
- it creates the best bridge into the remaining Free scenario completion work
