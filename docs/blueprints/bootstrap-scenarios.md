# Elementify Bootstrap Scenario Map

## Purpose

This document defines the canonical bootstrap-aware scenario map for Elementify.

It complements:

- [free-advanced-scenario-wizard-prd-v2.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-scenario-wizard-prd-v2.md)
- [usp-foundation.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/usp-foundation.md)

Its job is to ensure that Elementify can support users not only after Elementor is already present, but also while they are still choosing or completing the right stack.

## Scenario Axes

Each scenario should be understood through four axes:

- `origin`
- `intent`
- `depth`
- `user_posture`

## Origin

- `greenfield`
  no site yet, or only an idea / brand / offer

- `bootstrap-existing`
  existing WordPress site exists, but Elementor or the right supporting stack is not yet installed or aligned

- `brownfield`
  Elementor or a meaningful page-building setup already exists and the site now needs change

## Intent

- `bootstrap`
- `clean-up`
- `refresh`
- `optimization`
- `extension`
- `reduction`
- `relaunch`
- `migration`

## Depth

- `light`
- `moderate`
- `deep`

## User posture

- `guided`
- `assisted`
- `technical`

## Bootstrap Scenario Families

## B1 — Bootstrap from Idea

### Starting state

- no website yet
- maybe only a business idea, service, offer, or rough concept
- maybe a brand exists, maybe not

### Typical user needs

- clarify what kind of site should be built
- choose a sane baseline stack
- avoid overbuilding too early
- get a guided first path without already knowing the ecosystem

### Free outcome

Free should help the user:

- define a practical site starting point
- choose WordPress + Elementor Free + Hello Theme when suitable
- optionally add a supported free addon profile if the use case truly benefits
- start a lightweight first-site build path

### Advanced outcome

Advanced deepens this with:

- stronger build-system guidance
- richer blueprint choices
- stronger variant generation
- better upgrade-path clarity

## B2 — Bootstrap from Existing WordPress Without Elementor

### Starting state

- WordPress already exists
- Elementor is not installed
- the site may be manual, theme-led, or classic-editor-led

### Typical user needs

- understand whether Elementor is actually appropriate
- understand whether the current theme foundation should stay or change
- identify the least disruptive path toward a better builder setup

### Free outcome

Free should help the user:

- assess the current baseline
- understand whether Elementor is a good fit
- recommend Hello Theme or a compatible baseline when appropriate
- guide a staged transition rather than forcing a rebuild immediately

### Advanced outcome

Advanced deepens this with:

- stronger migration guidance
- deeper transition planning
- richer site-structure and rebuild support

## B3 — Stack Completion

### Starting state

- WordPress is installed
- maybe Elementor Free is installed
- maybe the theme is weak or misaligned
- maybe relevant addons are missing or excessive

### Typical user needs

- understand what the current setup lacks
- choose the next useful stack layer
- know whether Free is enough or not

### Free outcome

Free should help the user:

- identify stack gaps
- recommend the next supported stack pieces
- avoid unnecessary plugin inflation
- decide whether the current stack is already sufficient

### Advanced outcome

Advanced deepens this with:

- stronger scenario-based upgrade guidance
- richer supported stack profiles
- more complete build or relaunch pathways

## Existing-Site Change Scenario Families

## E1 — Clean-up

### Goal

- remove clutter
- reduce inconsistency
- simplify structures and content sprawl

### Good Free fit

- `light`
- `moderate`

### Stronger Advanced fit

- `deep`
- large library cleanup
- more systemic structural cleanup

## E2 — Refresh

### Goal

- improve presentation and clarity
- modernize without a full rebuild

### Good Free fit

- `light`
- `moderate`

### Stronger Advanced fit

- richer design-system adaptation
- deeper multi-step changes

## E3 — Optimization

### Goal

- improve conversion
- improve structure
- improve clarity and operational quality

### Good Free fit

- `light`
- `moderate`

### Stronger Advanced fit

- deeper diagnostics
- stronger critique / repair loops
- more contextualized optimization pathways

## E4 — Extension

### Goal

- add new site capabilities such as:
  - blog
  - magazine
  - jobs
  - classifieds
  - new content sections
  - additional landing flows

### Good Free fit

- `light`
- narrow, guided additions

### Stronger Advanced fit

- `moderate`
- `deep`
- richer content systems
- multi-step structure rollout

## E5 — Reduction

### Goal

- simplify
- remove unnecessary features or pages
- shrink the site to a clearer scope

### Good Free fit

- `light`
- `moderate`

### Stronger Advanced fit

- deeper structural simplification
- stronger guided deconstruction and replacement

## E6 — Relaunch

### Goal

- larger strategic and structural rework on an existing site

### Good Free fit

- `lite`
  focused diagnostic and early action path only

### Stronger Advanced fit

- full guided relaunch
- deeper variants and critique
- stronger structural workflow

## E7 — Migration

### Goal

- move from the current setup into a cleaner Elementor-centric target state

### Good Free fit

- simple, staged, lower-risk migration guidance

### Stronger Advanced fit

- deeper transition planning
- stronger multi-step workflow behavior

## Scenario-to-Tier Interpretation

## Free

Free must cover:

- bootstrap from idea
- bootstrap from existing WordPress without Elementor
- stack completion
- relaunch lite
- clean-up light/moderate
- refresh light/moderate
- optimization light/moderate
- extension light
- reduction light/moderate

Free is already real when it can move a user meaningfully forward in those paths.

## Advanced

Advanced deepens the same universe through:

- deeper relaunch
- deeper migration
- deeper optimization
- deeper extension
- richer blueprint and variant support
- richer reuse and rollout behavior
- stronger critique and repair support

## Scenario Outputs

Each scenario should eventually produce:

- current state summary
- intended outcome summary
- recommended next wizard
- recommended skill profile
- recommended addon profile
- recommended stack profile
- recommended tier path
- preservation constraints
- explicit guardrails

## Extension-aware outputs

The scenario system should remain modular enough to recommend:

- no extra addon profile
- one curated addon profile
- one skill profile suited to the user's posture and depth

It should avoid:

- arbitrary addon stacking
- opaque skill switching
- unsupported extension combinations

The goal is not "more modules".

The goal is:

- better scenario fit
- better guidance
- better stack honesty

## Binary Success Criteria

- Bootstrap scenarios exist alongside brownfield scenarios.
- The model explicitly supports users without Elementor installed.
- Free and Advanced are distinguishable by scenario depth, not arbitrary feature gating.
- The scenario map can be used directly by the intent-routing wizard contract.
