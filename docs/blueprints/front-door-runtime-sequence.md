# Elementify Front Door Runtime Sequence

## 1. Metadata

- title: Elementify Free Front Door Runtime
- domain: software
- intent: build
- sequence_type: mixed
- execution_mode: ralph_attended
- target: mixed
- capability_profile:
  - planning
  - code_generation
  - testing
  - review

## 2. Objective

Turn the scenario-first, wizard-first blueprint into the first runtime front door for Free so users can start from bootstrap, brownfield, or unclear states and get a deterministic route into the right stack, skill, addon, and tier path.

## 3. Success Criteria

- shared types define intent-wizard and routing contracts
- mcp-server exposes a general intent wizard router and a bootstrap-specific front door
- routing outputs include scenario, wizard, tier, stack profile, skill profile, addon profile, guardrails, and suggested tools
- Free tool registration and product surfaces include the new front-door layer
- targeted shared and mcp-server verification passes

## 4. Assumptions

- this batch focuses on the first routing layer and does not yet implement full multi-step guided runtime wizards
- plugin changes are not required because the front door lives in the MCP/runtime guidance layer first
- stack readiness can be partially inferred from live site signals and partially overridden by user input

## 5. Inputs Required

- [free-advanced-scenario-wizard-prd-v2.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-scenario-wizard-prd-v2.md)
- [bootstrap-scenarios.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/bootstrap-scenarios.md)
- [intent-wizard-contract.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/intent-wizard-contract.md)
- [stack-profiles.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/stack-profiles.md)
- [skill-addon-architecture.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/skill-addon-architecture.md)
- [free-advanced-full-scope-gap-map.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-full-scope-gap-map.md)

## 6. Outputs Required

- typed shared routing contracts
- runtime routing engine
- Free tool registrations for front-door guidance
- updated product-tier and product-surface mappings
- verification results
- execution report

## 7. Sequence Steps

### S1 — Typed Routing Contracts

Goal:

Introduce a typed contract for origin, intent, depth, user posture, stack readiness, and routing outputs.

Write scope:

- [wizard.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/types/wizard.ts)
- [index.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/index.ts)
- [client.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/client.ts)

### S2 — Runtime Front Door Engine

Goal:

Implement deterministic routing from runtime inputs into scenario, wizard, tier, stack, skill, and addon outputs.

Write scope:

- [intent-wizard.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/intent-wizard.ts)
- [intent-wizard.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/tools/intent-wizard.ts)

### S3 — Product Surface Realignment

Goal:

Register the new front-door tools as Free and reflect them in the current surface model.

Write scope:

- [index.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/tools/index.ts)
- [product-tiers.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/product-tiers.ts)
- [product-surfaces.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/product-surfaces.ts)

### GATE A — Front Door Runtime Gate

Goal:

Verify that the first Free front door is runtime-real, registrable, typed, and positioned as part of the Free surface.

## 8. Validation Rules

- the runtime must remain scenario-first rather than capability-first
- bootstrap must work even when Elementor is not installed yet
- routing must be conservative about paid upgrades
- Free front-door tools must remain public-tier surfaces

## 9. Final Assembly

Return:

- changed files
- commands run
- gate verdict
- known limitations
- next executable batch
