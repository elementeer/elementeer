# Elementify Free + Advanced Scenario/Wizard Blueprint

## 1. Executive Summary

This blueprint refines the current Elementify launch model around the actual product promise:

- `Free` is a real lift-up layer for WordPress + Elementor Free/Essentials
- `Advanced` is a real workflow and productivity upgrade for deeper Elementor work
- `Studio` remains future seam work and must not distort current packaging

The key correction is:

- product design must be `scenario-first`
- workflow design must be `wizard-first`
- technical permissions must remain a lower safety layer, not the primary product abstraction

Elementify should therefore be modeled as an intelligent operational layer over:

- WordPress
- Elementor
- Hello Theme or a future Elementify Theme layer
- relevant supporting plugins
- agent-native and human-guided workflows

## 2. Problem Statement

The earlier Free/Advanced launch blueprint established repo and tier boundaries well, but it still leaned too heavily on tool and capability classification.

That is not sufficient to express the real product promise.

The actual user expectation is not:

- “I got a few more safe APIs”

It is:

- “Elementify helps me relaunch an existing site”
- “Elementify helps me build a new site from scratch”
- “Elementify helps me use WordPress + Elementor + theme + plugins more intelligently”

If Elementify is modeled too narrowly around internal resources such as templates, pages, or raw permissions, then:

- Free becomes too weak and too technical
- Advanced risks feeling like locked extras rather than a productivity upgrade
- the wizard layer remains under-designed
- theme and plugin context remain under-integrated
- the whole system underdelivers on perceived value

## 3. Business Objectives

- Make `Free` feel like a serious, useful operational layer rather than a teaser
- Make `Advanced` feel like a workflow and productivity upgrade rather than an upsell bundle
- Keep `Studio` architecturally anticipated but strategically deferred
- Preserve the Forgejo-primary / GitHub-Free-mirror split
- Differentiate Elementify through guided outcomes, not through arbitrary gating

## 4. Target Users & Personas

### Primary personas

- `Non-technical site owner`
  Wants step-by-step help, clear guidance, and real results without needing to think in Elementor internals.

- `Freelancer / solo builder`
  Wants faster site improvement, cleaner structure, stronger reuse, and less trial-and-error.

- `Tech-savvy WordPress / Elementor operator`
  Wants precise tools, faster control, and deeper stack-aware support.

### Secondary personas

- `Agency / delivery-oriented power user`
  Needs stronger workflow depth, reuse, review, and systematized creation.

- `AI-native operator`
  Wants typed tools, skills, multi-step flows, critique, and operational guardrails.

## 5. Product Vision

Elementify should be experienced as:

- an intelligent layer over the existing WordPress + Elementor stack
- a guided builder companion for both non-technical and technical users
- a system that moves users from uncertainty to action
- a wizard-driven operational surface, not just a tool catalog

The product should think in:

- use cases
- user maturity levels
- guided workflows
- theme + plugin + site context

not only in:

- REST resources
- isolated CRUD permissions
- Elementor internals

## 6. Solution Overview

## 6.1 Free

`Free` is the public and mirror-safe lift layer.

It must already support two major real-world outcomes:

1. Relaunch an existing site
2. Build a new site from scratch with Elementor Free/Essentials

Free must therefore combine:

- assessment
- recommendations
- onboarding
- brand/design foundation
- simple creation and assembly
- local library usage
- WordPress + theme + plugin awareness
- no-code-near and technical entry points

## 6.2 Advanced

`Advanced` is the first paid productivity layer.

It should deepen the same scenarios rather than merely append isolated extras.

Advanced adds:

- deeper wizard depth
- more guided generation and variant support
- stronger critique and repair behavior
- stronger reuse-light behavior
- premium blueprint and library behavior
- more workflow reduction and better results

## 6.3 Studio

`Studio` remains future seam work for:

- cloud library
- cross-site storage and reuse
- orchestration
- delivery logic
- team and agency cloud semantics

Studio is not an active product promise in this blueprint.

## 7. Scenario Model

## 7.1 Free scenarios

### Scenario F1 — Relaunch Existing Site

Free must help a user understand and improve an existing WordPress + Elementor site.

Includes:

- assessment
- stack/context understanding
- prioritized recommendations
- brand/design foundation fixes
- targeted restructuring of existing Elementor content
- guided next steps

### Scenario F2 — Start New Site

Free must help a user create a new site baseline with Elementor Free/Essentials.

Includes:

- setup guidance
- theme foundation
- brand setup
- page/section/widget structure light
- local template and assembly support

### Scenario F3 — Improve Existing Stack

Free must help a user make better use of:

- WordPress settings that matter
- Elementor structures
- Hello Theme baseline
- relevant installed plugins

### Scenario F4 — Guided Learning and Operator Enablement

Free must support:

- no-code-near users who need explanation and guidance
- technical users who need control and speed

## 7.2 Advanced scenarios

### Scenario A1 — Deep Relaunch

Advanced deepens the relaunch path with:

- richer context use
- deeper structural recommendations
- stronger workflow sequencing
- critique and repair support

### Scenario A2 — Guided Site Build System

Advanced supports:

- more complete build workflows
- stronger multi-step creation
- better structural continuity across pages and templates

### Scenario A3 — Variant-Driven Creation

Advanced adds:

- more creator power
- more variants
- stronger guided generation
- premium blueprint usage

### Scenario A4 — Reuse Light+

Advanced provides stronger local reusable building behavior without implying Studio cloud semantics.

### Scenario A5 — Critique / Repair / Optimization

Advanced should reduce work by:

- critiquing output
- turning critique into explicit next actions
- preparing repair-oriented workflows

## 8. Wizard Model

## 8.1 Free wizard families

- `Quickstart Wizard`
- `Recommendation Wizard`
- `Creator Wizard Light`
- `Brand Foundation Wizard`
- `Relaunch Lite Wizard`
- `New Site Lite Wizard`
- `Stack Setup Wizard`

These must work for:

- `guided`
- `assisted`
- `technical`

## 8.2 Advanced wizard families

- `Deep Relaunch Wizard`
- `Advanced Creator Wizard`
- `Site Build Wizard`
- `Variant / Blueprint Wizard`
- `Critique & Repair Wizard`
- `Reuse / Rollout Wizard`
- `Advanced Workflow Wizard`

These must feel like:

- reduced labor
- better outcomes
- deeper operational support

not just:

- more toggles
- more raw tools

## 9. Product Domain Model

The correct middle layer should be modeled as product domains:

- `site-audit`
- `site-foundation`
- `design-system`
- `content-structure`
- `theme-structure`
- `library-operations`
- `media-operations`
- `plugin-stack-context`
- `governance`
- `workflow-orchestration`

These domains are closer to the product promise than low-level REST resources.

## 10. Capability and Permission Model

Capabilities should become a lower safety layer, not the top-level product abstraction.

They should primarily:

- protect destructive or high-trust operations
- define internal tool boundaries
- support governance and API key scoping

Candidate technical substrate groups:

- `elementor-data`
- `theme-builder`
- `design-system`
- `library`
- `media`
- `site-context`
- `plugin-context`
- `governance`

Important rule:

- Do not model the product around checkbox inflation.
- Add capability granularity only when it creates a real operational or safety boundary.

## 11. Theme and Stack Model

Elementify must think beyond “Elementor only”.

The effective stack is:

- WordPress
- Elementor
- Hello Theme as current reliable baseline
- possibly a future `Elementify Theme` or stronger Hello-derived uplift layer
- supporting plugins relevant to the site

### Theme decision guidance

Short term:

- treat `Hello Theme` as the reliable default baseline for Free

Mid term:

- define whether `Elementify Theme` should be:
  - a Hello child theme
  - a Hello-compatible replacement
  - or a theme system layered above Hello conventions

This blueprint does not lock that implementation choice, but it requires the decision to become explicit.

## 12. Functional Requirements

## 12.1 Free requirements

### FR-F-1 Real relaunch support

Free shall support a guided relaunch of an existing site.

Acceptance:

- assessment, recommendation, and brand/design foundation flows can be chained coherently
- existing Elementor structures can be inspected and improved
- the resulting workflow is documented as a real user-facing scenario

### FR-F-2 Real greenfield support

Free shall support a guided new-site path with Elementor Free/Essentials.

Acceptance:

- the new-site baseline includes theme, brand, structure, and local library use
- the flow is usable without premium assets or Studio behavior

### FR-F-3 Wizard coverage for multiple user levels

Free shall expose wizard flows that support guided, assisted, and technical entry.

Acceptance:

- each major Free scenario maps to at least one wizard family
- each wizard family defines a target user posture

### FR-F-4 Stack-aware value

Free shall consider not only Elementor but also relevant WordPress, theme, and plugin context when producing guidance.

Acceptance:

- site analysis and recommendations include stack-aware interpretation
- Free documentation does not position Elementify as Elementor-only CRUD

## 12.2 Advanced requirements

### FR-A-1 Same scenarios, deeper execution

Advanced shall deepen the main Free scenarios rather than fragment into unrelated features.

Acceptance:

- Advanced scenarios explicitly extend Free scenario families
- the differentiation is described as workflow depth and productivity gain

### FR-A-2 Wizard depth as primary differentiator

Advanced shall differentiate primarily through stronger wizard and workflow behavior.

Acceptance:

- Advanced wizard families are explicit and distinct
- they materially reduce work or improve outcomes

### FR-A-3 Stronger reuse, variants, and premium blueprint behavior

Advanced shall provide stronger reusable building behavior and premium blueprint support.

Acceptance:

- reuse-light is stronger than Free
- premium blueprint behavior is operationally useful without implying Studio cloud behavior

### FR-A-4 Critique and repair as workflow behavior

Advanced shall convert critique into guided operational next steps.

Acceptance:

- critique is not merely advisory
- repair or follow-up behavior is represented in workflow outputs

## 13. Non-Functional Requirements

- Free must remain public and mirror-safe
- Advanced must remain private and clearly separable
- no current flow may require Studio cloud behavior
- docs, tool registration, and release flow must remain aligned with product surfaces
- low-level capabilities must stay consistent across shared types, plugin config, and admin UI

## 14. Scope

### In scope

- scenario-first redefinition of Free and Advanced
- wizard-family model
- product domain model
- lower-layer capability reset guidance
- theme/stack role clarification
- mapping current tools and flows into this corrected model

### Out of scope

- implementing Studio cloud behavior
- finalizing a full Elementify Theme implementation
- marketplace rollout
- enterprise delivery orchestration

## 15. Success Metrics

- Free can be described and demonstrated through real relaunch and greenfield scenarios
- Advanced can be described and demonstrated as a real productivity upgrade on the same scenario families
- Wizard families are explicit, role-aware, and tier-aware
- capability design is clearly subordinate to product scenarios and workflow domains
- the Free/Advanced split remains mirror-safe and operationally enforceable

## 16. Recommended Execution Package

1. `FREE-ADV-SCENARIO-001`
   Define the canonical Free and Advanced scenario map.

2. `FREE-ADV-WIZARD-001`
   Define wizard families and user-level mappings.

3. `CAP-RESET-001`
   Replace the resource-first capability model with a lower-layer technical substrate model.

4. `THEME-STACK-001`
   Clarify Hello Theme vs future Elementify Theme / theme-system role.

5. `SURFACE-REALIGN-001`
   Re-map existing tools, docs, and workflows to the new scenario/wizard blueprint.
