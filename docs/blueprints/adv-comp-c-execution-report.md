# ADV-COMP-C Execution Report

## Summary

Completed `ADV-COMP-001` and `ADV-COMP-002` by adding a scenario-first private Advanced entry layer plus deeper workflow planning for deep relaunch and migration paths.

## Files Changed

- `mcp-server/src/advanced-workflows.ts`
- `mcp-server/src/tools/advanced-workflows.ts`
- `mcp-server/src/product-tiers.ts`
- `mcp-server/src/product-surfaces.ts`
- `mcp-server/src/__tests__/advanced-workflows.test.ts`
- `mcp-server/src/__tests__/tools/advanced-workflows.test.ts`
- `mcp-server/src/__tests__/product-tiers.test.ts`
- `mcp-server/src/__tests__/product-surfaces.test.ts`
- `mcp-server/src/__tests__/tools/index.test.ts`
- `docs/blueprints/advanced-product-surface.md`

## Behavior Added

- Added `route_advanced_scenario` as the private Advanced front door.
- Added deep Advanced scenario plans for:
  - `deep-relaunch`
  - `migration`
  - `premium-rollout`
  - `critique-repair`
- Extended `advanced_creator_mode` planning to support:
  - `deep-relaunch`
  - `migration-rollout`
- Blocked `auto_execute` for the new deep workflows until a bounded execution slice is explicitly chosen.
- Realigned Advanced tier and product-surface manifests around the scenario-first model.

## Exact Test Commands

- `npm run typecheck --workspace=mcp-server`
- `npm run test --workspace=mcp-server -- advanced-workflows tools/advanced-workflows product-tiers product-surfaces tools/index`

## Assumptions Made

- Deep relaunch and migration should enter Advanced immediately as richer planning flows, even if their first executable bounded slice is implemented later.
- Advanced should keep a strong scenario-first front door separate from the public Free front door.

## Known Limitations

- `deep-relaunch` and `migration-rollout` are currently planning-only in `advanced_creator_mode`.
- Their first bounded execution slices still need a follow-on batch.

## Next Best Prompt

Implement the next Advanced completion batch by turning the new planning-only deep workflows into bounded executable slices:

1. add a first executable `deep-relaunch` slice
2. add a first executable `migration-rollout` slice
3. keep plan-vs-execute guardrails explicit
4. extend tests and reports accordingly
