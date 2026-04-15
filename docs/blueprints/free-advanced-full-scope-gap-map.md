# Elementify Free + Advanced Full-Scope Gap Map

## Purpose

This document answers a practical question:

- do we now have a complete enough picture of the new Free and Advanced scope?
- what still needs to happen before that scope is materially implemented?

Short answer:

- yes, the blueprint picture is now substantially complete
- no, the runtime product is not yet complete

The remaining work is now mainly execution and realignment work, not conceptual discovery.

## What Is Now Fully Mapped

The following are now clearly defined at blueprint level:

- Free positioning
- Advanced positioning
- Studio deferment boundary
- scenario system
- bootstrap-aware entry states
- intent wizard contract
- stack profiles
- skill-profile and addon-profile architecture
- scenario-based upgrade guidance
- capability reset principle
- Free and Advanced surface realignment
- domain capability source of truth with transitional legacy compatibility

This means the product picture is no longer missing its upper model.

## What Still Exists Mostly As Blueprint, Not Yet As Product Runtime

### Free

Free is now well-defined as:

- 360-degree starting point
- bootstrap layer
- existing-site uplift layer
- Creator Light and local library layer

But the following still need runtime realization or realignment:

- a real `Intent Wizard` front door
- explicit runtime stack-profile selection
- explicit runtime bootstrap guidance for:
  - idea only
  - WordPress without Elementor
  - partial stack
- explicit runtime skill-profile selection
- supported addon-profile recommendation logic
- Free-facing UI/runtime grouping that follows the new scenario model end-to-end

### Advanced

Advanced is now well-defined as:

- deeper workflow and productivity layer
- richer stack-shaping and upgrade layer
- deeper creator, critique, repair, and premium-library layer

But the following still need runtime realization or realignment:

- runtime upgrade-path wizard behavior
- runtime variant / blueprint / relaunch depth aligned to the new scenario matrix
- runtime skill-profile depth for Advanced flows
- tighter integration of premium-library flows into the deeper scenario system
- stronger scenario-aware migration and deep relaunch runtime behavior

## Current State by Layer

## 1. Strategic and product-definition layer

Status:

- strong
- largely complete for the current scope

Key documents:

- [free-advanced-scenario-wizard-prd-v2.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-scenario-wizard-prd-v2.md)
- [usp-foundation.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/usp-foundation.md)
- [bootstrap-scenarios.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/bootstrap-scenarios.md)
- [intent-wizard-contract.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/intent-wizard-contract.md)
- [stack-profiles.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/stack-profiles.md)
- [skill-addon-architecture.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/skill-addon-architecture.md)
- [upgrade-guidance.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/upgrade-guidance.md)

## 2. Surface and packaging layer

Status:

- strong
- substantially realigned

Key documents:

- [free-product-surface.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-product-surface.md)
- [advanced-product-surface.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/advanced-product-surface.md)
- [tier-capability-map.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/tier-capability-map.md)

## 3. Capability and enforcement layer

Status:

- reset conceptually
- partially remapped in runtime
- still transitional at endpoint vocabulary level

Key artifacts:

- [capability-reset.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/capability-reset.md)
- [capability-domain-remap-execution-report.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/capability-domain-remap-execution-report.md)
- [auth.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/types/auth.ts)
- [Capabilities.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Auth/Capabilities.php)

## 4. Runtime product behavior layer

Status:

- mixed
- some strong foundations exist
- still not fully realigned to the new scenario-first model

This is now the main remaining gap.

## The Remaining Work, Properly Grouped

## A. Capability and enforcement completion

Still needed:

- replace legacy endpoint-required capability strings with canonical domain capabilities
- realign client examples and docs to domain capabilities
- improve governance/settings UX for domain capability policy control

Why this matters:

- it finishes the lower-layer cleanup
- it removes conceptual drift between blueprint and runtime enforcement

## B. Free runtime scenario implementation

Still needed:

- implement or refactor the runtime entry flow around the `Intent Wizard`
- implement bootstrap-aware runtime routes and/or tool groupings
- map current Free tools into explicit:
  - bootstrap
  - uplift
  - creator-light
  - local-library
  - guided onboarding
- add runtime stack-profile outputs and addon-profile recommendation hooks

Why this matters:

- this is the core of the new Free promise
- without it, Free is still stronger operationally than before, but not yet the fully realized 360-degree starting point

## C. Advanced runtime deepening

Still needed:

- align deeper Advanced flows to the same scenario matrix
- implement clearer runtime upgrade-path behavior
- strengthen deep relaunch, migration, and repair-loop orchestration
- tie premium library more explicitly into scenario-specific wizard paths
- model richer Advanced skill profiles in runtime

Why this matters:

- this is what turns Advanced from “better tooling” into a true productivity system

## D. Final release and mirror polish

Still needed:

- keep Free mirror docs and runtime grouping aligned after the scenario-first shift
- verify public packaging after runtime scenario realignment
- keep Studio boundaries explicit

Why this matters:

- packaging is already strong, but must survive the next runtime realignment steps

## Recommended Next Execution Ladder

## Batch 5 — Capability Completion

1. replace legacy endpoint-required capability strings with canonical domain capabilities
2. realign mcp-server client examples, tests, and docs to the domain vocabulary
3. build a cleaner governance/settings UI for domain capability policy control

## Batch 6 — Free Runtime Front Door

1. implement the runtime `Intent Wizard` contract
2. add bootstrap-aware routing for:
   - idea only
   - WordPress without Elementor
   - partial stack
3. emit runtime stack-profile, addon-profile, and skill-profile recommendations

## Batch 7 — Free Workflow Realignment

1. realign current Free tools into explicit scenario families
2. make Free runtime feel like:
   - bootstrap
   - uplift
   - creator-light
   - local-library
   - guided onboarding
3. add verification for Free scenario routing and public-safe behavior

## Batch 8 — Advanced Runtime Deepening

1. align Advanced workflow entry to the same intent/scenario model
2. implement deeper relaunch, migration, and repair-loop runtime behavior
3. connect premium-library, upgrade-guidance, and deeper skill profiles into Advanced wizard logic

## Batch 9 — Final Surface and Release Lock

1. rerun Free mirror and release gates after runtime realignment
2. rerun Advanced surface verification after deeper scenario integration
3. confirm Studio deferment remains clean and credible

## Practical Status Estimate

At blueprint level:

- Free: about `95%+`
- Advanced: about `93%+`

At runtime/product-behavior level:

- Free: about `70-75%`
- Advanced: about `65-70%`

Reason:

- the product model is now much clearer than the runtime implementation
- the main remaining distance is no longer architecture discovery
- it is scenario-first runtime execution and workflow integration

## Binary Conclusion

Yes, we now have a sufficiently complete picture to drive the rest of the work without further major conceptual resets.

The next major unknown is no longer:

- what Free and Advanced should be

It is now:

- how fast and how cleanly we can pull the runtime product into alignment with that clarified model
