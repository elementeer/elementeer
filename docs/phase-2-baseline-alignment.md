# Elementify Studio Phase 2 Baseline Alignment

## Purpose
This document reconciles the generic Elementify Studio phase-2 execution sequence with the actual current baseline of the `elementify-mcp` repository.

The original sequence assumes a Studio-style generation pipeline with a web UI, a `/api/generate` route, fixture-backed generation inputs, and a deterministic analyzer -> mapper -> builder flow. This repository does not currently expose that baseline. It is a WordPress plugin plus MCP server monorepo with a materially different capability surface.

Phase-2 execution should therefore begin from the real repository state, not from the assumed Studio baseline.

## Current Repository Baseline
The current codebase already contains a meaningful intelligence and workflow layer:

- template library CRUD and data access
- Elementor page read/write operations
- section extraction and page composition
- site assessment with structured issues
- site context capture
- recommendation generation
- global styles and logo automation
- brand setup wizard
- theme builder wizard
- stock-image search and sideload support
- AI image generation
- change review queue

Representative implementation points:

- [mcp-server/src/tools/assessment.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/tools/assessment.ts)
- [mcp-server/src/tools/recommendations.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/tools/recommendations.ts)
- [mcp-server/src/tools/wizard.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/tools/wizard.ts)
- [mcp-server/src/tools/pages.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/tools/pages.ts)
- [plugin/includes/Api/Assessment.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Api/Assessment.php)
- [plugin/includes/Api/Router.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Api/Router.php)
- [mcp-server/src/client.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/client.ts)
- [ROADMAP.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/ROADMAP.md)

## Sequence Mismatches

### Mismatch 1: No Studio generate route or frontend
The original sequence starts with a fixture-aware `/api/generate` flow and a frontend mode switch between live URL mode and fixture mode.

This repository currently has:
- no `/api/generate` route
- no Studio web frontend in this repo
- no analyzer -> mapper -> builder service chain
- no fixture-backed generation path

Impact:
- Original steps S1 and S2 cannot be executed as written.

### Mismatch 2: Several "later" capabilities already exist
The original sequence treats recommendations, validation-oriented onboarding, and destination-aware operational flows as later phase-2 steps.

This repository already contains:
- `assess_site`
- `set_site_context`
- `get_recommendations`
- `get_recommendation_guide`
- `wizard_brand_setup`
- `creator_mode`
- `wizard_theme_builder`
- `queue_change`

Impact:
- The sequence should not rebuild these concepts from scratch.
- Phase 2 should consolidate and sharpen them rather than introduce parallel duplicates.

### Mismatch 3: Capability and contract primitives are not yet stabilized
Although the repo already has useful operational intelligence, many cross-cutting concepts still live in MCP client and tool-local types rather than in a stable contracts layer.

Examples:
- `SiteAssessment`
- `SiteContext`
- recommendation model
- wizard input and output shapes
- change queue records

Impact:
- The adjusted sequence should begin with contract stabilization around existing functionality instead of introducing an unrelated generation pipeline.

### Mismatch 4: "Fingerprint", "destination", and "import validation" do not yet exist in explicit phase-2 form
The assessment layer already exposes raw ingredients for future intelligence:
- active plugins
- Elementor and Pro detection
- theme builder inventory
- page counts
- performance indicators
- custom post types

But the repo does not yet contain explicit modules or contracts for:
- `SiteFingerprint`
- `DestinationProfile`
- `Capability`
- `CapabilityMatrix`
- `ImportReport`
- `RebuildStrategy`

Impact:
- These are still valid phase-2 targets, but they should be layered on top of existing assessment and composition primitives.

### Mismatch 5: AI already exists, but not in the bounded planning/critique form the sequence wants
The repository already includes AI image generation, but not yet the bounded planning/critique assistance described in the original sequence.

Impact:
- The adjusted phase-2 track should distinguish between existing AI media tooling and the still-missing typed AI planning layer.

## Current Capability Mapping Against Original Sequence

### Already present or substantially present
- governance and workflow direction: partially present in docs and roadmap
- assessment foundation: present
- recommendation engine v1: present in site-ops form
- page composition primitives: present
- theme-builder workflow support: present
- site context / onboarding metadata: present
- change review queue / governance support: present

### Partially present, but not in the intended phase-2 form
- destination awareness: partial via assessment and Elementor/Pro/plugin data
- capability modeling: implicit in governance and tool design, not explicit as shared contracts
- AI assistance: partial via image generation only, not planning/critique
- validation: present in tests and operational checks, not as import-validation harness

### Missing or incompatible with current baseline
- fixture-aware Studio generation flow
- frontend source-mode switch
- golden generation regression suite
- explicit site fingerprint service
- explicit destination scan module
- explicit capability matrix model
- import validation harness
- design-token extraction
- typed AI planning/critique layer
- conversational control seed
- research registry/resolver track

## Adjusted Phase-2 Execution Plan
The corrected plan should start from the current MCP/plugin monorepo and extend what already exists.

### A0 — Phase-2 governance and architecture notes
Status:
- completed

Artifacts:
- [docs/phase-2-scope.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/phase-2-scope.md)
- [docs/architecture/phase-2-foundation.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/architecture/phase-2-foundation.md)

### A1 — Shared contracts for current intelligence layer
Goal:
Stabilize the existing phase-2 baseline before adding new intelligence modules.

Focus:
- move current cross-cutting models into shared contracts
- reduce tool-local type drift
- prepare for later fingerprint, destination, validation, and AI layers

Initial contract targets:
- `SiteAssessment`
- `AssessmentIssue`
- `SiteContext`
- `Recommendation`
- `QueuedChange`
- composition-related request and report shapes where useful

### A2 — Regression coverage for assessment, recommendations, and composition flows
Goal:
Add readable regression coverage around the intelligence and composition features that already exist.

Focus:
- assessment shape stability
- recommendation stability
- composition and wizard path safety
- stable assertions over brittle snapshots

### A3 — Site fingerprint on top of assessment data
Goal:
Introduce an explicit deterministic `SiteFingerprint` module built from existing plugin/site assessment signals.

Focus:
- WordPress and Elementor hints
- builder/theme/plugin hints
- confidence and evidence fields
- no scraping requirement
- no LLM dependency

### A4 — Destination profile and capability matrix
Goal:
Turn existing Elementor/plugin assessment data into explicit destination-aware planning primitives.

Focus:
- `DestinationProfile`
- `Capability`
- `CapabilityMatrix`
- compatibility summary
- clean separation from builder implementation details

### A5 — Import and write validation harness
Goal:
Add an honest validation/reporting layer around template/page/theme-builder writes.

Focus:
- generated or composed output validation
- structural notes
- warnings
- next-step hints
- no false claims about full end-to-end import automation

### A6 — Recommendation engine consolidation
Goal:
Refactor the current recommendation engine onto the new contracts and capability primitives without losing current product value.

Focus:
- reusable recommendation inputs
- compatibility-aware reasoning
- cleaner separation between assessment facts and recommendation policy

### A7 — Design token extraction
Goal:
Introduce a reusable heuristic token layer based on available site and style data.

Focus:
- color signals
- typography hints
- spacing and visual pattern hints where practical
- typed output, not deep builder coupling

### A8 — Bounded AI planning and critique
Goal:
Add a typed, feature-flagged AI planning layer that assists existing deterministic workflows.

Focus:
- planning and critique only
- no direct AI-to-Elementor-data generation
- contract-based reduced inputs
- validated outputs

### A9 — Optional conversational control seed
Goal:
Prepare minimal control-plane concepts only after the underlying contracts and validation layers are stable.

## Recommended New First Implementation Slice

### New first slice
Start with `A1 — Shared contracts for current intelligence layer`.

### Why this should go first
- It matches the real repo baseline.
- It improves existing functionality instead of assuming missing Studio infrastructure.
- It creates the foundation needed by fingerprinting, capability matrices, validation, and bounded AI.
- It avoids duplicating already-shipped assessment and recommendation logic.

### Scope of the first slice
- create or extend shared contracts in `shared/`
- move stable existing models out of `mcp-server/src/client.ts` where appropriate
- update imports with minimal disruption
- add focused tests for the new shared types
- preserve runtime behavior

## Deferred or Removed Original Steps

### Deferred until a real Studio generation baseline exists
- fixture-aware `/api/generate`
- live URL vs fixture source-mode UI
- golden generation regression suite for the missing generate pipeline

### Rewritten rather than removed
- site fingerprint: keep, but derive from assessment baseline instead of scrape pipeline
- destination scan and capability matrix: keep, but build from existing plugin and Elementor signals
- recommendation engine: keep, but treat as consolidation and evolution rather than first introduction
- AI assist: keep, but layer onto explicit contracts and validation

## Operational Recommendation
Proceed with the adjusted sequence, not the original Studio-first order.

The repository is already beyond some parts of the original sequence and still missing the exact baseline assumed by other parts. The safest and fastest path is:

1. stabilize current intelligence contracts
2. add regression coverage around existing operational features
3. derive fingerprint and destination primitives from current assessment data
4. add validation and bounded AI only after those foundations are stable
