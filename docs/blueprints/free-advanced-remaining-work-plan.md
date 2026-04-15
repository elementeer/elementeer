# Elementify Free + Advanced Remaining Work Plan

## 1. Executive Summary

This document turns the existing Elementify launch blueprint into a concrete remaining-work plan for the last meaningful gaps before:

- `Free` is launch-ready as a public GitHub mirror surface
- `Advanced` is functionally complete enough to feel like a real paid productivity tier
- `Studio` remains strategically prepared through seams, but intentionally deferred

It is grounded in:

- [free-advanced-launch-prd.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-launch-prd.md)
- [free-advanced-launch-prd.json](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-launch-prd.json)
- [tier-capability-map.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/tier-capability-map.md)
- [free-product-surface.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-product-surface.md)
- [advanced-product-surface.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/advanced-product-surface.md)
- [free-mirror-export.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/architecture/free-mirror-export.md)
- [forgejo-github-free-mirror-runbook.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/release/forgejo-github-free-mirror-runbook.md)

Current working assessment:

- `Free`: approximately `93-95%`
- `Advanced`: approximately `86-88%`

The remaining work is no longer foundational architecture. It is now:

- product hardening
- workflow depth
- release operationalization
- build hygiene
- final Free vs. Advanced differentiation

## 2. Current Completion Baseline

### Free already has

- explicit public product surface
- tool-tier classification and Free-only registration path
- fingerprint, destination, validation, recommendations
- local Elementor Library workflows
- creator-light and onboarding flows
- mirror verification and release gates
- public-facing Free quickstart and release checklist

### Advanced already has

- explicit private product surface
- premium library provider boundary
- premium asset list, inspect, plan, and import flow
- brand adaptation
- output critique
- advanced recommendation depth
- advanced workflow orchestration
- deeper theme-builder and governance-oriented capabilities

### Studio is already prepared as seam work through

- `studio_future` tier
- provider boundaries
- entitlement extension points
- deliberate exclusion from current Free and Advanced promises

## 3. Remaining Product Problems

### 3.1 Free

Free is structurally strong but still needs:

- a final operational proof of the Forgejo primary to GitHub mirror path
- a cleaner public release packaging flow
- closure on the recurring TypeScript build/exit anomaly
- one final public QA pass to ensure docs, scripts, and product messaging stay aligned

### 3.2 Advanced

Advanced is clearly differentiated now, but still needs:

- a richer premium-catalog story than the current first curated runtime layer
- stronger workflow depth in creator and repair loops
- more end-to-end “guided productivity” behavior instead of just deeper isolated tools

### 3.3 Cross-cutting

The remaining risk is no longer “wrong architecture.” It is:

- inconsistency between docs and release reality
- hidden runtime/build hygiene issues
- incomplete operationalization of the public mirror workflow

## 4. Target Outcome

The remaining plan is successful when:

- `Free` can be confidently mirrored and described as a public product
- `Advanced` feels like a meaningful paid layer, not just gated extra tools
- Forgejo-primary and GitHub-Free-mirror are operationally cheap
- no current decision paints `Studio` into the wrong corner later

## 5. Remaining Execution Strategy

Recommended execution mode:

- `sequence_type`: `build`
- `execution_mode`: `ralph_attended`

Reason:

- the remaining work is multi-slice repo execution with verification gates
- several tasks can run in parallel
- integration surfaces still need central control

Recommended lane structure:

- `free-release lane`
- `advanced-productization lane`
- `build-hygiene lane`

Keep these central and non-parallel:

- product tier registry
- tool registration
- free mirror manifest
- release verification scripts

## 6. Remaining Task Packages

### FREE-003 — Public mirror dry-run hardening

Goal:

Validate the real publishable Free export path end to end, using the current scripts and manifest as if the mirror publication were about to happen.

Acceptance:

- a reproducible dry-run path exists from private primary state to Free export staging output
- the dry run proves that only Free docs, Free tool surfaces, and allowed public assets are included
- the dry run is documented as an operational checklist or script sequence
- failures are reported as binary gate failures, not tribal knowledge

### FREE-004 — Free public QA and messaging lock

Goal:

Run one final consistency pass over Free-facing docs, public scripts, tool surface, and release framing.

Acceptance:

- Free-facing docs do not promise Advanced or Studio behavior
- public quickstart, root README, mirror docs, and release checklist are mutually consistent
- the Free tool list matches the actual Free registration path
- a short public “what Free includes / does not include” artifact exists

### BUILD-001 — TypeScript build exit anomaly resolution

Goal:

Diagnose and resolve the recurring `tsc` / workspace build hang so the normal build path completes cleanly again.

Acceptance:

- the cause is identified and documented
- the build exits cleanly on the normal path
- release and verification steps no longer rely on silent tolerance of hanging builds
- the resolution is captured in release or developer documentation

### ADV-007 — Premium catalog enrichment

Goal:

Move the premium library from a first curated runtime layer toward a more convincing paid-catalog experience.

Acceptance:

- the premium library supports a broader set of useful asset categories or metadata
- the catalog can express stronger curation signals, not just raw entries
- Advanced docs and planner outputs clearly reflect the richer premium layer
- Free remains unaffected and mirror-safe

### ADV-008 — Advanced workflow depth hardening

Goal:

Deepen the practical value of the Advanced orchestration layer, especially around creator flows and critique/repair loops.

Acceptance:

- at least one Advanced workflow becomes measurably more end-to-end than the current orchestration
- critique and repair guidance become more operational and less purely advisory
- Advanced workflow outputs are documented and tested as distinct from Free
- no Free path becomes dependent on Advanced orchestration

### REL-FA-004 — Mirror publication automation handoff

Goal:

Package the current Free mirror verification and preparation flow into a clear operational handoff for the upcoming Forgejo migration.

Acceptance:

- the runbook explicitly covers the Forgejo-primary to GitHub-mirror lifecycle
- preconditions, commands, outputs, and failure gates are explicit
- the release gate command is treated as the canonical pre-publication check
- the process can be executed by another operator without hidden context

### STUDIO-SEAM-001 — Final deferment note for Studio

Goal:

Lock a concise architecture note that defines exactly what remains intentionally deferred to `Studio`.

Acceptance:

- cloud library, cross-site storage, delivery orchestration, and team flows are explicitly marked deferred
- no current Free or Advanced document overclaims Studio behavior
- the note references current entitlement and provider boundaries

## 7. Parallelization Recommendation

### Parallel batch A

- `FREE-003`
- `ADV-007`
- `BUILD-001`

### Parallel batch B

- `FREE-004`
- `ADV-008`
- `REL-FA-004`

### Final integration batch

- `STUDIO-SEAM-001`
- release readiness review
- final launch-readiness assessment

## 8. Binary Success Criteria

The remaining plan is complete when all of the following are true:

- `verify:free-mirror` passes
- `verify:free-release` passes
- the public mirror dry-run is documented and reproducible
- the TypeScript build anomaly is resolved on the normal build path
- the Advanced premium layer is richer than the current initial runtime seed
- the Advanced orchestration layer has at least one clearly deeper end-to-end workflow than today
- Free-facing docs remain fully Free-safe
- Studio is explicitly deferred without architectural ambiguity

## 9. Out of Scope

The following remain intentionally out of scope for this remaining plan:

- shipping Studio cloud library
- cross-site sync
- team collaboration or delivery orchestration
- full marketplace rollout
- enterprise packaging

## 10. Recommended Next Slice

Start with:

1. `FREE-003`
2. `ADV-007`
3. `BUILD-001`

Then move to:

1. `FREE-004`
2. `ADV-008`
3. `REL-FA-004`

Finish with:

1. `STUDIO-SEAM-001`
2. final launch-readiness gate for Free and Advanced
