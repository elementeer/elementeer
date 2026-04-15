# ADV-COMP-C Sequence

## Batch

- ADV-COMP-001
- ADV-COMP-002

## Goal

Add the scenario-first Advanced front door and deepen the main Advanced scenario workflows so Advanced feels like a routed operating layer instead of a private tool shelf.

## Steps

1. Extend Advanced workflow planning with `deep-relaunch` and `migration-rollout`.
2. Add a private `route_advanced_scenario` front door for:
   - `deep-relaunch`
   - `migration`
   - `premium-rollout`
   - `critique-repair`
3. Keep `advanced_creator_mode` as the execution seam, but make `deep-relaunch` and `migration-rollout` planning-only until a bounded execution slice is chosen.
4. Realign Advanced product surfaces and tier assignments to include the new scenario-first entry layer.
5. Add targeted tests for:
   - new workflow plans
   - scenario routing
   - registration and surface manifests
   - planning-only guardrails for new deep workflows

## Gate

- `route_advanced_scenario` is registered as an Advanced-only tool.
- `advanced_creator_mode` supports planning for `deep-relaunch` and `migration-rollout`.
- `auto_execute` is explicitly blocked for those new deep workflows.
- Product tier and surface manifests stay aligned with the new Advanced front door.
- Targeted TypeScript and Vitest checks pass.
