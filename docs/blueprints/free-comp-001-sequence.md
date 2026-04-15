# Elementify FREE-COMP-001 Sequence

## Metadata

- batch_id: `FREE-COMP-001`
- sequence_type: `build`
- execution_mode: `ralph_attended`
- audience_mode: `mixed`

## Objective

Deepen the new Free runtime entry layer by chaining safe presets into short guided transitions for the most important early Free paths.

## Success Criteria

- Free can run a short guided transition for:
  - `stack-bootstrap`
  - `optimization-lite`
- safe presets execute
- preview-only presets remain preview-only
- transition output reports step status clearly
- the helper is reflected in Free tier and Free product surface manifests

## Steps

### S1 — Transition chaining

- add a Free guided transition helper above single-preset execution
- support:
  - bootstrap starter transition
  - optimization starter transition

### S2 — Safety model

- keep preview-only presets blocked from direct execution
- allow only explicit `safe_execute` steps to run
- report mixed transitions honestly

### S3 — Surface and verification

- add the new helper to Free product tiers and surfaces
- verify with:
  - `npm run typecheck --workspace=mcp-server`
  - `npm run test --workspace=mcp-server -- free-runtime-wizards tools/free-runtime-wizards product-tiers product-surfaces tools/index`

## Next Batch If Pass

1. complete the missing Free runtime scenario families
2. decide whether guided transitions should stay stateless or gain persisted wizard state
3. delay the Advanced scenario front door until the Free side is one step more complete
