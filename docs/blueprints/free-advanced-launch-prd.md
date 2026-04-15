# Elementify Free + Advanced Launch Blueprint

## 1. Executive Summary

Elementify will be implemented as a Forgejo-first product with a public GitHub mirror that exposes only the `Free` product surface.

The product model is:

- `Free`: intelligent lift for existing Elementor workflows on the current site
- `Advanced`: deeper creation, customization, reuse-light, and workflow acceleration
- `Studio`: later cloud, cross-site, delivery, and orchestration layer

This blueprint is grounded in:

- the final launch strategy in [elementify_drei_stufen_launchstrategie_finalisierung.md](/Users/andrelange/Library/CloudStorage/GoogleDrive-andre.lange@lange-network.com/Meine%20Ablage/02_Projects/Vamerli_Elementify/05_Go_to_Market/elementify_drei_stufen_launchstrategie_finalisierung.md)
- the repository baseline correction in [phase-2-baseline-alignment.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/phase-2-baseline-alignment.md)
- the current MCP/plugin capability surface in [README.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/README.md), [ROADMAP.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/ROADMAP.md), and [mcp-server/src/tools/index.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/tools/index.ts)

The implementation goal is not only to make `Free` and `Advanced` fully functional, but to make the boundary between them explicit enough that a public `Free` mirror can be produced cleanly and repeatably.

## 2. Problem Statement

Elementify already has a strong operational foundation as a WordPress plugin plus MCP server, but its current codebase is not yet packaged as a clean three-layer product model.

The immediate product problem is:

- `Free` and `Advanced` are strategically defined, but not yet mapped to enforceable code boundaries
- the future `Studio` layer must be anticipated architecturally, without leaking cloud or cross-site assumptions into the current local-site product
- the repo is about to move to a private Forgejo primary with a public GitHub mirror, which requires product boundaries to be mirrored in code, packaging, and release flow

If these boundaries are not made explicit now, the team will face:

- mirror-export complexity
- accidental Advanced leakage into public Free
- later Studio coupling that forces rework
- weak product messaging because capabilities will not align with tier promises

## 3. Business Objectives

- Launch a public `Free` offer that feels genuinely useful and not artificially crippled
- Launch a private `Advanced` offer that clearly feels like a workflow and productivity upgrade
- Preserve a clean future path to `Studio` without prematurely shipping cloud or cross-site systems
- Make the Forgejo primary and GitHub mirror split operationally cheap
- Differentiate Elementify through intelligent workflow lift, not through site limits

## 4. Target Users & Personas

### Primary personas

- `Site owner`
  Needs guided improvements, faster setup, and practical output without needing deep Elementor expertise.

- `Freelancer / solo builder`
  Needs faster page assembly, better reuse, better recommendations, and lightweight workflow acceleration.

- `Small agency / delivery-heavy power user`
  Needs deeper workflows, more guided creation, better reuse, and premium building blocks without yet requiring full multi-site cloud orchestration.

### Secondary personas

- `AI-native operator`
  Uses MCP tools and structured workflows directly, values typed contracts, critique, validation, and deterministic fallbacks.

- `Future studio operator`
  Will later need cross-site reuse, cloud library, team delivery, and operational orchestration, but is not the primary implementation target of this blueprint.

## 5. Product Vision

Elementify should be perceived as an intelligent operational layer for Elementor workflows.

It should not be positioned as:

- just another template provider
- just a wizard collection
- just an AI gimmick

Its core value is:

- understanding the current site and builder state
- recommending sensible next actions
- customizing and assembling existing Elementor structures intelligently
- making local library workflows more useful
- later extending into premium reusable assets and eventually into cloud-based delivery

## 6. Solution Overview

### 6.1 Free

`Free` is the public and mirrorable product surface.

It delivers:

- site assessment
- prioritized recommendations
- quickstart and recommendation guidance
- creator light flows
- intelligent customization of existing Elementor structures
- simple page, section, and widget assembly
- local Elementor Library as the primary target system
- skills catalog and agent-native setup
- deterministic capability and validation guidance

### 6.2 Advanced

`Advanced` is the private paid layer on top of the same core.

It delivers:

- deeper wizard depth
- deeper recommendation quality and context use
- more creator power and stronger guided generation
- stronger contextualization and output critique
- brand adaptation workflows
- reuse-light workflows and stronger premium asset usage
- first visible `Elementify Library` as a curated premium library
- stronger agent-native workflow acceleration

### 6.3 Studio Seams

`Studio` is not implemented in this blueprint, but its seams must be preserved.

The current deferment boundary is locked in:

- [studio-deferment-note.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/architecture/studio-deferment-note.md)

Studio future scope:

- cloud library
- cross-site template storage
- blueprint and delivery logic
- stronger team, agency, and multi-client flows
- cloud-synced asset and template orchestration

The current architecture must therefore distinguish:

- local Elementor Library
- curated premium library
- future cloud library

## 7. Functional Requirements

### 7.1 Free feature set

#### FR-F-1 Assessment and fingerprint-driven understanding

- The system shall expose deterministic assessment, site context, and fingerprint signals for the current site.
- The system shall explain relevant Elementor, plugin, and builder context without requiring scraping or cloud services.

Acceptance:

- `assess_site`, site-context, fingerprint, and destination capability outputs work in public mode
- no Advanced or Studio dependency is required

#### FR-F-2 Recommendations and guided next steps

- The system shall provide prioritized and actionable recommendations for the current site.
- The recommendation surface shall remain deterministic and capability-aware.

Acceptance:

- public recommendation tools remain usable without premium library or private modules
- recommendations clearly distinguish facts, warnings, and next-step suggestions

#### FR-F-3 Quickstart and recommendation-guided workflows

- The system shall expose Free-grade wizard flows for onboarding and next-step execution.
- These flows shall feel more useful than a demo.

Acceptance:

- quickstart and recommendation-guided flows are documented and testable as part of Free
- the Free wizard set is explicit and product-facing

#### FR-F-4 Creator Light and simple assembly

- The system shall support simple page, section, and widget structure assembly using existing local assets and templates.
- The system shall support intelligent customization of existing Elementor structures on the current site.

Acceptance:

- creator-light and basic composition remain available in public Free
- local Elementor Library is the primary target and storage context

#### FR-F-5 Validation and safe execution guidance

- The system shall provide honest write and import validation reports, including warnings and next-step hints.
- Validation shall not claim full automation when only a harness exists.

Acceptance:

- validation output is available in public Free
- smoke-test readiness remains explicit and truthful

### 7.2 Advanced feature set

#### FR-A-1 Deeper wizard depth and creation power

- The system shall provide deeper workflow wizards and stronger creator flows than Free.
- These flows shall materially reduce work and improve results.

Acceptance:

- Advanced-only wizard and creator flows are identified separately from Free
- Free remains functional without these flows

#### FR-A-2 Stronger recommendation depth

- Advanced shall use richer context, stronger interpretation, and more operational guidance than Free.

Acceptance:

- recommendation enhancements are additive
- public Free recommendations remain intact and independent

#### FR-A-3 Brand adaptation and output critique

- Advanced shall expose structured brand adaptation planning and output critique workflows.
- These workflows may use bounded AI assistance, but deterministic fallback must remain available.

Acceptance:

- brand adaptation and output critique are private Advanced features
- no public Free path depends on their presence

#### FR-A-4 Premium library experience

- Advanced shall expose a curated premium library clearly branded as `Elementify Library`.
- Premium assets shall import into or work with the local Elementor Library on the current site.

Acceptance:

- Advanced premium library does not imply cloud sync
- local Elementor Library remains the operational destination

#### FR-A-5 Reuse-light and stronger agent-native workflow behavior

- Advanced shall provide stronger reusable workflow behavior and stronger agent-native assistance than Free.

Acceptance:

- reuse-light features stay local-site-first
- no cloud or cross-site dependency is introduced

### 7.3 Studio architectural seams

#### FR-S-1 Provider-ready library boundary

- The architecture shall distinguish local library access, premium library access, and future cloud library access.

Acceptance:

- provider boundaries exist in contracts and module design
- no Free or Advanced path treats premium library as cloud storage

#### FR-S-2 Future entitlement extensibility

- Tier and entitlement models shall support future `studio` introduction without breaking Free or Advanced packaging.

Acceptance:

- current tier model anticipates `studio_future`
- no rewrite of public/private boundaries is needed to add Studio later

## 8. Non-Functional Requirements

### 8.1 Packaging and repository boundaries

- Forgejo shall be the canonical primary repository
- GitHub shall be generated as a public mirror with only the Free product surface
- Advanced code shall remain identifiable and separable

### 8.2 Reliability

- Free builds and tests shall pass without private Advanced modules
- Advanced builds and tests shall pass on the private primary repo

### 8.3 Maintainability

- capability, entitlement, and module boundaries shall be documented
- mirror-export rules shall be automatable
- no hidden product-tier coupling shall remain

### 8.4 AI safety

- deterministic paths must remain available when AI is unavailable or disabled
- no product-critical Free path may require AI-only execution

## 9. Technical Architecture

### 9.1 Baseline

The implementation starts from the current MCP/plugin baseline, not from a Studio web app.

Key current assets include:

- plugin activation modes in [plugin/includes/Activation/Mode.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Activation/Mode.php)
- shared config in [shared/src/types/config.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/types/config.ts)
- current MCP tool registration in [mcp-server/src/tools/index.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/tools/index.ts)

### 9.2 Proposed boundary model

#### Public core

- shared contracts and models
- site assessment, fingerprint, destination, validation primitives
- Free-safe recommendation policies
- Free-safe wizard and creator-light surfaces
- local library provider

#### Private Advanced modules

- premium library provider and curated asset policies
- deeper recommendation policies
- deeper wizard depth
- brand adaptation product flows
- output critique product flows
- stronger guided generation overlays

#### Studio seams

- future cloud library provider interfaces
- future cross-site identity and delivery models
- future sync and storage boundaries

### 9.3 Entitlement model

The system shall introduce explicit tier classification for product surfaces:

- `free`
- `advanced`
- `studio_future`

The classification shall apply to:

- tools
- modules
- premium assets
- recommendation and wizard policies
- release and mirror rules

### 9.4 Mirror model

The mirror shall be produced by rules, not manual pruning.

Required properties:

- public builds cannot import private modules
- public docs cannot promise Advanced or Studio behavior
- premium assets are excluded from the public export
- mirror verification blocks leakage

## 10. Scope

### In scope

- explicit Free and Advanced product definition based on current repo reality
- code and packaging boundaries that support a public Free mirror
- entitlement and capability mapping
- local library and premium library separation
- Studio seams at the architecture level

### Out of scope

- shipping Studio cloud library
- cross-site sync
- team and delivery orchestration
- full enterprise or partner packaging
- marketplace launch
- replacing Elementor as the visual editor

## 11. Risks and Mitigations

### Risk 1: Free and Advanced remain only documentation concepts

Mitigation:

- introduce explicit tier and entitlement mapping in code
- require mirror checks and build verification

### Risk 2: Premium library gets confused with future cloud library

Mitigation:

- create separate provider concepts now
- keep Advanced premium library local-site operational only

### Risk 3: Private features leak into the public mirror

Mitigation:

- private module boundaries
- automated leakage checks
- Free-only build and test job

### Risk 4: Studio assumptions distort current product design

Mitigation:

- treat Studio as seam planning only
- no mandatory cloud dependency in Free or Advanced

## 12. Success Metrics

- A canonical private primary repo supports complete Free + Advanced builds and tests.
- A public mirror supports Free-only builds and tests without private dependencies.
- Every user-facing tool and premium asset has a declared tier classification.
- Free and Advanced product documentation can be published without scope ambiguity.
- Premium library behavior is clearly local-site-first and non-cloud.
- No public Free workflow depends on private Advanced modules.

## 13. Timeline & Milestones

### Milestone 1: Tier definition and module boundary

- create tier capability map
- classify existing tools and policies
- define private vs public module seams

### Milestone 2: Public Free surface and mirror rules

- finalize Free surface
- make public build and docs self-consistent
- implement mirror verification

### Milestone 3: Advanced private surface

- finalize Advanced product flows
- attach premium library and deeper workflow modules
- keep Free independent

### Milestone 4: Studio seam validation

- confirm provider and entitlement seams
- verify no cloud dependency leaks into Free or Advanced

## 14. Resource Requirements

- product definition work for tier boundaries
- TypeScript and packaging work in shared and mcp-server
- release engineering for mirror export and validation
- documentation work for tier-specific product surfaces

## 15. Assumptions & Dependencies

- Forgejo becomes the canonical private primary repository
- GitHub remains a public mirror and not the main development surface
- current repo features described in the baseline alignment remain the real starting point
- plugin activation modes can be extended or reused for tier-aware packaging as needed
- Free and Advanced can share a core without sharing all modules

## 16. Recommended Next Execution Package

The immediate execution track should be:

1. create the tier capability map
2. carve Free and Advanced module boundaries
3. define the public Free surface
4. define the private Advanced surface
5. separate local, premium, and future cloud library provider concepts
6. implement mirror export rules and verification
