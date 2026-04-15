# Elementify CAP-RESET-001 + SURFACE-REALIGN-002 Execution Sequence

## 1. Metadata

- title: Elementify Capability Reset and Surface Realignment
- domain: software
- intent: plan
- sequence_type: mixed
- execution_mode: ralph_attended
- target: mixed
- capability_profile:
  - planning
  - review
  - architecture
  - documentation

## 2. Objective

Reset the capability model so it becomes a technical safety layer beneath the scenario/wizard product model, and realign the documented Free and Advanced product surfaces to the new bootstrap-aware, scenario-first architecture.

## 3. Success Criteria

- A capability-reset document exists and clearly subordinates capabilities to scenarios, wizards, stack profiles, skill profiles, and addon profiles.
- Free is documented as a 360-degree starting point, not only an uplift for existing Elementor users.
- Advanced is documented as a deeper workflow and productivity layer across the same scenario families.
- The current tool-tier map is explicitly reframed as an implementation boundary map rather than the primary product model.
- The v2 scenario/wizard blueprint references the artifacts created by this batch.

## 4. Assumptions

- [free-advanced-scenario-wizard-prd-v2.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-scenario-wizard-prd-v2.md) is the current source of truth for upper-layer product design.
- The current capability vocabulary in [auth.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/types/auth.ts) should be treated as transitional and not as final product truth.
- This batch is documentation-first and does not yet rewrite runtime capability code.

## 5. Usage Notes

- Keep the product model scenario-first and wizard-first.
- Do not let capability language become the user-facing information architecture.
- Preserve the existing Free mirror guardrails while broadening the documented Free role.
- Treat skills and addon profiles as curated extension surfaces, not uncontrolled growth vectors.

## 6. Inputs Required

- [free-advanced-scenario-wizard-prd-v2.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-scenario-wizard-prd-v2.md)
- [free-product-surface.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-product-surface.md)
- [advanced-product-surface.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/advanced-product-surface.md)
- [tier-capability-map.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/tier-capability-map.md)
- [auth.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/types/auth.ts)

## 7. Outputs Required

- [capability-reset.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/capability-reset.md)
- updated [free-product-surface.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-product-surface.md)
- updated [advanced-product-surface.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/advanced-product-surface.md)
- updated [tier-capability-map.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/tier-capability-map.md)
- updated [free-advanced-scenario-wizard-prd-v2.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-scenario-wizard-prd-v2.md)

## 8. Sequence Steps

### S1 — Capability Reset Foundation

Goal:

Document the new capability model as a technical substrate rather than the primary product face.

Write scope:

- [capability-reset.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/capability-reset.md)
- [tier-capability-map.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/tier-capability-map.md)

Verification:

- capability domains cover stack-bootstrap, site foundation, design system, content structure, theme structure, library, media, plugin context, governance, and workflow orchestration
- migration path from current mixed state is documented

### S2 — Free Surface Realignment

Goal:

Realign Free to the new 360-degree, bootstrap-aware scenario model.

Write scope:

- [free-product-surface.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-product-surface.md)

Verification:

- Free includes bootstrap and existing-site uplift framing
- Free remains mirror-safe and avoids cloud / Studio promises

### S3 — Advanced Surface Realignment

Goal:

Realign Advanced to the same scenario universe as Free, but with deeper workflow, critique, stack-shaping, and productivity depth.

Write scope:

- [advanced-product-surface.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/advanced-product-surface.md)

Verification:

- Advanced reads as a workflow/productivity upgrade
- Advanced does not collapse into “Free plus extras”

### GATE A — Consistency Review

Goal:

Check that the reset and surface docs are coherent with the v2 blueprint and current mirror/architecture constraints.

Write scope:

- [free-advanced-scenario-wizard-prd-v2.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-scenario-wizard-prd-v2.md)

Verification:

- artifact references are present
- product model and implementation-boundary map are no longer in tension

## 9. Final Assembly

Return:

- files changed
- artifacts created
- verification commands
- gate result
- next executable batch

## 10. Validation Rules

- Do not introduce new product-facing taxonomy that contradicts the scenario/wizard model.
- Do not promise Studio behavior in Free or Advanced.
- Do not redefine capabilities as the main user-facing language.
- Keep the Free/Advanced difference rooted in scenario depth and workflow value.

## 11. Failure Handling

- If a surface doc contradicts the v2 blueprint, align it to the blueprint rather than inventing a third model.
- If capability design drifts back into resource-first language, reset to domain-first technical boundaries.
- If a statement risks weakening Free mirror boundaries, prefer the stricter interpretation and note the tradeoff.

## 12. Final Deliverable Format

- one prompt-sequence markdown document
- one execution report markdown document
- updated blueprint artifacts
