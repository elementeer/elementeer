# Elementify Upgrade Guidance Model

## Purpose

This document defines how Elementify should recommend deeper stack levels and paid paths without collapsing into generic upsell behavior.

It covers recommendations for:

- Elementor Pro
- Elementify Advanced
- selected supported pro addon profiles

## Core Rule

Upgrade guidance must remain:

- scenario-based
- proportional
- transparent
- non-coercive

The system should be comfortable saying:

- Free is enough
- the current stack is already fine
- a small curated free addon profile is enough
- a deeper paid step is genuinely justified

## Upgrade Questions

Before recommending a stronger paid layer, Elementify should be able to answer:

1. What is the user trying to achieve?
2. What is missing in the current baseline?
3. Is the gap real or only convenience-related?
4. Would a different free baseline solve enough already?
5. If a paid layer is justified, which one is the least wasteful next step?

## Upgrade Targets

## 1. Elementor Pro

Recommend when:

- the scenario clearly needs stronger builder or theme capabilities
- site-wide structural control matters
- the gain is mainly in deeper Elementor-native capability

Do not recommend when:

- the user can reach the current goal cleanly with Elementor Free plus a simpler stack
- the real need is workflow depth rather than builder licensing

## 2. Elementify Advanced

Recommend when:

- the user needs deeper workflow reduction
- the scenario benefits from richer guided execution
- stronger critique, reuse, premium blueprints, or operating depth would materially reduce work

Do not recommend when:

- the user mainly needs one missing builder capability
- the current problem is better solved by a simpler baseline correction

## 3. Supported pro addon profile

Recommend when:

- a specific scenario gap is well understood
- support confidence is high
- the profile materially reduces friction or improves outcome quality

Do not recommend when:

- the addon profile is only “nice to have”
- it mostly duplicates what the baseline stack already covers
- it would create unjustified complexity

## Recommendation Hierarchy

The recommendation order should remain:

1. keep current stack if enough
2. improve baseline if enough
3. add one curated free addon profile if enough
4. recommend Elementor Pro if the builder gap is real
5. recommend Elementify Advanced if workflow/productivity depth is the real need
6. recommend a supported pro addon profile only when scenario-fit is strong

## Explanation Contract

Every upgrade recommendation should be able to explain:

- what problem it solves
- why the current baseline is insufficient
- why a lighter option is not enough
- what complexity it introduces
- whether the step is optional or strongly justified

## Free to Advanced Transition

The transition from Free to Advanced should feel like:

- deeper workflow help
- stronger orchestration
- richer creation and reuse
- better productivity

It should not feel like:

- a paywall around the first meaningful result
- a vague premium promise
- a generic “buy the pro version” prompt

## Elementor Pro vs Elementify Advanced

These recommendations should remain distinct:

- Elementor Pro solves builder and structural capability gaps
- Elementify Advanced solves workflow, productivity, guidance, and premium-creation depth

Some scenarios may justify both.

But the system should still explain:

- why each is recommended
- what role each plays

## Output Shape

Upgrade guidance should eventually produce:

- `isUpgradeNeeded`
- `recommendedUpgradeTarget`
- `reason`
- `lighterAlternativeConsidered`
- `complexityTradeoff`
- `confidence`

## Guardrails

- Do not recommend paid paths just because the user is ambitious.
- Do not recommend both Elementor Pro and Elementify Advanced by default.
- Do not let addon-profile monetization distort recommendation honesty.
- Do not frame Advanced as “more features”; frame it as deeper workflow value.

## Binary Success Criteria

- Upgrade logic clearly distinguishes baseline correction, builder upgrades, workflow upgrades, and addon-profile upgrades.
- The model can explain when Free is enough.
- Elementor Pro and Elementify Advanced are recommended for different reasons.
- The guidance remains aligned with the user-first, ecosystem-honest USP.
