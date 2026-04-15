# Regression Guidance

## Purpose
Elementify phase-2 regression coverage should protect behavior that agents and users rely on without turning the test suite into a wall of brittle snapshots.

## What to Prefer
- stable assertions over exact giant payload dumps
- exact recommendation ID order when order itself is product behavior
- exact section order when composition order is product behavior
- section and heading presence when output structure matters
- focused fixtures that explain why a case exists

## What to Avoid
- giant snapshots of full text responses when only a few invariants matter
- assertions on incidental whitespace or formatting noise
- snapshots that mix many unrelated concerns into one golden file

## When Intentional Behavior Changes
If a regression test fails because product behavior was intentionally changed:

1. confirm the new behavior is actually desired
2. update the focused expectation, not the whole test style
3. keep the assertion readable enough to explain the product decision
4. note the behavior change in the implementation slice summary

## Current Regression Targets
- assessment output section order
- recommendation ordering for representative site states
- composition order for assembled Elementor sections

## Rule of Thumb
If a test failure cannot be explained in one or two sentences, the regression assertion is probably too broad and should be narrowed.
