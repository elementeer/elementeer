# Elementify Intent Wizard Contract

## Purpose

This document defines the front-door wizard contract for Elementify.

It is the primary routing layer that turns user situation and intent into:

- a scenario
- a wizard path
- a stack recommendation posture
- a tier recommendation posture

It should be understandable for:

- guided users
- assisted users
- technical users

## Role in the Product

The Intent Wizard is not just onboarding.

It is the decision layer that prevents Elementify from feeling like:

- a generic tool shelf
- a capability list
- a hidden upsell engine

Instead it should make Elementify feel like:

- a guided operating system for WordPress + Elementor outcomes

## Wizard Inputs

The wizard should collect the following in order.

## 1. Origin

Question:

- What are we starting from?

Allowed values:

- `idea_only`
- `brand_without_site`
- `wordpress_without_elementor`
- `partial_stack`
- `existing_elementor_site`
- `unclear_needs_diagnosis`

## 2. Primary intent

Question:

- What is your main goal right now?

Allowed values:

- `bootstrap`
- `clean_up`
- `refresh`
- `optimization`
- `extension`
- `reduction`
- `relaunch`
- `migration`

## 3. Depth

Question:

- How far should the change go?

Allowed values:

- `light`
- `moderate`
- `deep`

## 4. Preservation constraints

Question:

- What must definitely stay intact?

Examples:

- current brand
- current content
- current URLs
- current theme
- current plugin setup
- client-approved pages only

## 5. Operational constraints

Question:

- What constraints matter?

Examples:

- `free_only`
- `low_budget`
- `must_avoid_theme_change`
- `must_avoid_plugin_growth`
- `must_move_fast`
- `must_remain_low_risk`

## 6. User posture

Question:

- How do you want to work?

Allowed values:

- `guided`
- `assisted`
- `technical`

## 7. Optional stack readiness inputs

These may be user-provided or system-detected.

- WordPress present?
- Elementor installed?
- Hello Theme installed?
- current theme known?
- relevant addons installed?
- Elementor Pro present?

## Wizard Output Contract

The wizard should produce the following fields.

```json
{
  "origin": "wordpress_without_elementor",
  "intent": "bootstrap",
  "depth": "moderate",
  "userPosture": "guided",
  "scenarioId": "B2",
  "scenarioLabel": "Bootstrap from existing WordPress without Elementor",
  "recommendedWizard": "stack-bootstrap-wizard",
  "recommendedTier": "free",
  "recommendedSkillProfile": "bootstrap-guided",
  "recommendedAddonProfile": "none",
  "recommendedStackProfile": "wp-elementor-free-hello-baseline",
  "preservationPriorities": [
    "keep current content"
  ],
  "constraints": [
    "free_only"
  ],
  "guidanceMode": "step_by_step",
  "guardrails": [
    "Do not recommend paid upgrades unless the scenario clearly justifies them."
  ],
  "nextDecision": "Decide whether Hello Theme should replace the current theme baseline."
}
```

## Routing Logic

## Bootstrap routes

- `idea_only` + `bootstrap`
  -> `stack-bootstrap-wizard`
  -> usually `free`

- `brand_without_site` + `bootstrap`
  -> `brand-foundation-wizard` then `new-site-lite-wizard`
  -> usually `free`

- `wordpress_without_elementor` + `bootstrap`
  -> `stack-bootstrap-wizard`
  -> `free`, with scenario-based upgrade guidance if needed

- `partial_stack` + `bootstrap`
  -> `stack-bootstrap-wizard`
  -> `free` or `advanced` depending on complexity and desired outcome

## Brownfield routes

- `existing_elementor_site` + `clean_up`
  -> `cleanup-wizard`

- `existing_elementor_site` + `refresh`
  -> `refresh-wizard`

- `existing_elementor_site` + `optimization`
  -> `optimization-wizard`

- `existing_elementor_site` + `extension`
  -> `extension-wizard`

- `existing_elementor_site` + `relaunch`
  -> `relaunch-lite-wizard` or `deep-relaunch-wizard`

- `existing_elementor_site` + `migration`
  -> `migration-wizard`

## Tier Recommendation Rules

The wizard should recommend tiers conservatively.

### Recommend `free` when

- the user can achieve the desired outcome with the Free baseline
- the scope is light or moderate
- the scenario does not require deeper workflow reduction or richer generation behavior
- the stack can remain simple

### Recommend `advanced` when

- the scenario is deep
- the workflow requires stronger guided execution
- richer variants or premium blueprint support would materially help
- stronger critique/repair or richer reuse would materially reduce work

### Important rule

Do not recommend `advanced` just because it exists.

Recommend it only when:

- it is justified by the scenario
- and the explanation is clear

## Stack Recommendation Rules

## Free-friendly baseline

Default candidate profile:

- WordPress
- Elementor Free
- Hello Theme
- optionally a supported free addon profile where justified

### Addon rule

Supported free addon profiles should be suggested only when:

- the scenario truly benefits
- support confidence is high
- the added complexity is worth it

## Advanced-friendly baseline

Advanced may recommend:

- Elementor Pro
- Elementify Advanced
- selected supported pro plugin profiles

But only if they improve:

- speed
- structure
- reliability
- workflow quality

## Skill and addon profile rules

The wizard should also be able to recommend:

- a skill profile
- an addon profile

### Skill profile rule

Skill profiles should reflect:

- user posture
- scenario family
- scope depth

Examples:

- `bootstrap-guided`
- `optimization-assisted`
- `relaunch-technical`

### Addon profile rule

Addon profiles should remain:

- curated
- support-aware
- scenario-justified

The default valid answer is often:

- `none`

The wizard should not assume an addon profile is required just because one is available.

## Guidance Modes

The wizard output should also choose a guidance style.

### `guided`

- plain language
- fewer choices at once
- more explanation
- stronger defaults

### `assisted`

- moderate explanation
- moderate control
- clearer branching

### `technical`

- more direct routing
- more explicit stack and constraint language
- less hand-holding

## Guardrails

- Do not assume Elementor is already installed.
- Do not assume the current theme should be replaced.
- Do not assume more plugins are always better.
- Do not recommend paid upgrades without scenario fit.
- Do not let the wizard collapse into a vendor upsell questionnaire.

## Suggested Wizard Families

## Free-facing

- `intent-wizard`
- `stack-bootstrap-wizard`
- `quickstart-wizard`
- `brand-foundation-wizard`
- `new-site-lite-wizard`
- `relaunch-lite-wizard`
- `optimization-lite-wizard`
- `extension-lite-wizard`
- `creator-wizard-light`

## Advanced-facing

- `deep-relaunch-wizard`
- `advanced-site-build-wizard`
- `advanced-creator-wizard`
- `variant-blueprint-wizard`
- `critique-repair-wizard`
- `reuse-rollout-wizard`
- `upgrade-path-wizard`

## Binary Success Criteria

- The wizard contract covers bootstrap and existing-site entry states.
- The contract covers origin, intent, depth, constraints, and user posture.
- The routing model can recommend Free or Advanced without arbitrary upsell logic.
- The output model can recommend curated skill and addon profiles without collapsing into extension inflation.
- The contract is detailed enough to drive future implementation and documentation.
