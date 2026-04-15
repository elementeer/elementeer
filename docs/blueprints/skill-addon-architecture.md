# Elementify Skill and Add-on Architecture

## Purpose

This document defines how Elementify remains modular and extensible without turning into uncontrolled extension sprawl.

It formalizes two curated extension surfaces:

- skill profiles
- addon profiles

These extension surfaces should strengthen scenario fit and user outcomes, not distract from them.

## Design Principle

Elementify should be modular in a user-facing way.

That means:

- extensions should improve the route for a real scenario
- extensions should be explained in plain language
- extensions should stay subordinate to intent and support confidence

The product should never feel like:

- a plugin marketplace first
- a random skill catalog
- a stack lottery

## Two Extension Surfaces

## 1. Skill profiles

Skill profiles are curated operating modes that shape how Elementify guides and assists the user.

They are not simply internal tool flags.

They function as:

- posture-aware guidance layers
- scenario-specific workflow templates
- reusable operating patterns

Examples:

- `bootstrap-guided`
- `new-site-assisted`
- `optimization-technical`
- `relaunch-assisted`

### Skill profile inputs

Skill profile selection should depend on:

- scenario family
- user posture
- scope depth
- trust/safety needs

### Skill profile outputs

A selected skill profile may change:

- explanation depth
- branching complexity
- operator control
- suggested next steps
- whether a guided checklist or a more direct execution path is shown

## 2. Addon profiles

Addon profiles are curated extension bundles for the surrounding Elementor-capable stack.

They are not free-form plugin search.

They function as:

- named, support-aware stack extensions
- scenario-justified capability bundles
- restrained alternatives to random plugin accretion

Examples:

- `none`
- `free-utility-widgets`
- `content-marketing-free`
- `conversion-pro`

### Addon profile rule

Addon profiles should:

- remain optional
- remain curated
- remain transparent
- remain support-bound

Addon profiles should not:

- be recommended by default for every user
- silently stack on top of each other
- obscure what the baseline stack already solves

## Product Behavior Rule

The intent wizard and later scenario-routing flows should be able to output:

- one baseline stack profile
- zero or one addon profile
- zero or one skill profile

That keeps the system composable without becoming incoherent.

## Free vs Advanced Interpretation

## Free

Free may recommend:

- simpler skill profiles
- conservative guided paths
- at most restrained, well-supported addon profiles

Free should prefer:

- clarity
- minimal complexity
- fast momentum

## Advanced

Advanced may recommend:

- deeper skill profiles
- more technical or workflow-heavy operating modes
- richer addon profiles when clearly justified

Advanced should feel like:

- better orchestration
- stronger productivity
- more intelligent reuse

not:

- uncontrolled extension growth

## Architecture Implication

The product model should keep these layers separate:

- scenario system
- wizard routing
- stack profile model
- skill profile model
- addon profile model
- low-level capabilities and permissions

This separation is what makes future implementation modular and explainable.

## Guardrails

- Do not expose every internal skill as a product-level skill profile.
- Do not expose every supported plugin as a first-class addon profile.
- Do not recommend both a skill profile and an addon profile unless both materially help.
- Do not let extension surfaces outrank scenario fit.

## Binary Success Criteria

- Skill profiles and addon profiles are modeled as distinct extension surfaces.
- The model supports modular growth without collapsing into arbitrary extension sprawl.
- Free and Advanced can use the same extension architecture with different depth and restraint.
- The extension model remains coherent with the USP and scenario-first product logic.
