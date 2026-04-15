# Elementify Project Profile, Sensorik, and Approval Hardening PRD

## Purpose

This document defines the next hardening layer after the current Free and Advanced completion work.

It is based on real pilot usage and addresses three gaps that showed up immediately in live editing:

- missing project-specific expectation capture before writing
- weak layout-risk sensing around text length and section geometry
- missing review-first approval modes for real client and agency usage

These are not isolated UX fixes. Together they define the next trust layer for Elementify.

## Why This Matters

Elementify is no longer only proving that it can technically read and write Elementor content.

It now needs to prove that it can:

- adapt to project-specific expectations
- avoid preventable content/layout friction
- support safe operating modes beyond direct live edits

This is especially important for:

- agency workflows
- freelancer client work
- stakeholder-driven review processes
- multilingual or approval-sensitive sites

## Strategic Position

The new hardening layer should reinforce three already established product principles:

- `user-first`
- `intent-led`
- `ecosystem-honest`

And it should add a fourth operational principle:

- `trust-by-default`

That means:

- ask or infer the right expectations before mutating
- sense likely layout risk before writing
- support draft and approval modes instead of assuming direct edit is always correct

## 1. PROJECT-PROFILE-001

## Goal

Introduce a lightweight, project-specific operating profile that can shape how Elementify behaves before it writes or recommends changes.

## Core Idea

Each site or project should be able to carry a small Elementify-native profile, conceptually similar to a project-local `AGENTS.md`, but focused on delivery behavior rather than coding rules.

This profile should capture:

- editing posture
- verbosity preference
- copy style preference
- structural conservatism
- risk tolerance for direct edits
- approval expectations
- content density preference
- CTA bias
- preferred handling when layout constraints conflict with copy completeness

## Example Dimensions

- `editingMode`
  - `direct`
  - `draft-first`
  - `approval-first`

- `copyDensity`
  - `compact`
  - `balanced`
  - `complete`

- `layoutPriority`
  - `preserve-existing-layout`
  - `preserve-copy-completeness`
  - `balanced`

- `changeStyle`
  - `minimal`
  - `adaptive`
  - `transformative`

- `questionPolicy`
  - `ask-on-ambiguity`
  - `choose-conservative-default`
  - `prefer-complete-content`

## Intended Runtime Effect

Project profiles should shape:

- wizard defaults
- preset defaults
- whether Elementify trims, condenses, or asks
- whether direct write is allowed
- whether review queue is required
- whether a preview/draft path is preferred

## Binary Success Criteria

- Elementify can store and read a project profile per site.
- The profile changes runtime behavior in observable ways.
- Free and Advanced can both use the profile without breaking surface boundaries.
- A conservative default exists when no profile has been defined yet.

## 2. SENSORIK-001

## Goal

Add a lightweight sensing layer that identifies likely layout/content risks before and after writing.

## Core Idea

Elementify should not wait for manual visual inspection to catch obvious problems such as:

- text overflow risk
- card height imbalance
- CTA spacing regressions
- headline line-break problems
- package/FAQ blocks becoming too dense for the current section geometry

This does not need to start as full visual AI.
The first useful version can be deterministic and heuristic.

## Sensorik Layers

### 1. Briefing Sensorik

Ask for or infer:

- expected depth of copy
- willingness to condense
- tolerance for structural changes
- preference for shorter vs fuller blocks

### 2. Pre-Write Layout Risk Sensorik

Estimate risk from:

- character length
- number of list items
- number of FAQ entries
- number of benefit cards
- existing section/card/widget type
- known narrow layouts such as icon boxes, package cards, CTA blocks

### 3. Post-Write Review Sensorik

Return warnings such as:

- `headline_wrap_risk`
- `card_density_risk`
- `cta_spacing_review`
- `faq_block_density_risk`
- `package_card_overflow_risk`

## Decision Behavior

If the risk crosses a threshold, Elementify should:

- ask a question
- choose a conservative default based on project profile
- or route to draft/approval instead of direct apply

It should not silently discard content unless the project profile explicitly allows that behavior.

## Binary Success Criteria

- Runtime outputs can emit deterministic layout-risk warnings.
- Briefing and profile preferences can influence how risk is resolved.
- Elementify can distinguish low-risk direct writes from medium/high-risk review candidates.
- The system no longer silently drops likely-overflow content as an implicit default.

## 3. APPROVAL-FLOW-001

## Goal

Add a review-oriented editing mode that supports draft and approval workflows for content and structure changes.

## Core Idea

For real agency and stakeholder work, not every change should go directly live.

Elementify should support three operating modes:

- `direct-edit`
- `draft-first`
- `approval-first`

## Operating Model

### Direct Edit

- existing current mode
- immediate write to target page/template
- appropriate for low-risk or explicitly allowed work

### Draft First

- create a draft/staged copy or reusable snapshot
- apply the proposed changes there first
- operator reviews before promotion

### Approval First

- create a change bundle
- place it in a review queue
- optionally include:
  - changed items
  - rationale
  - affected sections
  - risk notes
  - layout-risk warnings

This should feel closer to a content-operations dashboard than to a hidden internal queue.

## WPML Analogy

The approval model should borrow the good parts of a translation dashboard:

- select affected items
- batch them
- review pending changes
- apply only what is approved
- track status across staged work

But it should remain Elementify-native and apply to:

- page edits
- section edits
- library imports
- advanced rollout drafts
- critique/repair suggestions

## Runtime Effects

Approval mode should influence:

- write target
- queue creation
- follow-up instructions
- review output
- governance-aware apply paths

## Binary Success Criteria

- Elementify supports explicit `direct-edit`, `draft-first`, and `approval-first` modes.
- A change can be staged without going live immediately.
- Approval-first produces a reviewable queue item or draft artifact with enough context for human review.
- The chosen approval mode can be set by project profile and overridden per workflow.

## Recommended Execution Order

1. `PROJECT-PROFILE-001`
2. `SENSORIK-001`
3. `APPROVAL-FLOW-001`

This order matters because:

- profile preferences should shape how sensorik resolves ambiguity
- sensorik should shape when approval is required
- approval logic is strongest once profile and risk signals exist

## Free vs Advanced Guidance

### Free

Free should support:

- basic project profile
- basic briefing preferences
- deterministic risk notes
- conservative draft recommendation

Free should not become a heavy enterprise workflow product.

### Advanced

Advanced should support:

- deeper project profile shaping
- stronger pre-write and post-write sensorik
- queue-backed approval behavior
- richer draft-oriented operational flows

This reinforces Advanced as a productivity and trust layer, not only a deeper tool set.

## Output Shape

These three slices should eventually enable runtime outputs like:

- `projectProfileApplied`
- `layoutRiskSignals`
- `riskResolutionMode`
- `approvalMode`
- `draftCreated`
- `approvalItemCreated`

## Next Implementation Transition

After this blueprint batch, the next execution path should be:

1. typed project profile contract
2. project profile storage and retrieval
3. deterministic layout-risk scoring for current runtime wizards
4. write-mode routing into direct vs draft vs approval behavior

