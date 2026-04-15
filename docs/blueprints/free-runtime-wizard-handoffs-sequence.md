# Elementify Free Runtime Wizard Handoff Tightening Sequence

## Metadata

- batch_id: `BATCH-FREE-RUNTIME-HANDOFFS-001`
- sequence_type: `build`
- execution_mode: `ralph_attended`
- audience_mode: `mixed`

## Objective

Make the first Free runtime wizard families more operative by tightening action-level handoffs and translating stack, skill, and addon profiles into explicit downstream guidance.

## Success Criteria

- runtime wizard plans include explicit operative handoffs
- each operative handoff identifies:
  - target tool
  - why it should be used
  - when it should be used
  - an example call shape
- runtime wizard plans include explicit profile applications for:
  - stack profile
  - skill profile
  - addon profile
- targeted typecheck and runtime wizard tests pass

## Steps

### S1 — Operative handoff model

- extend Free runtime wizard plans with structured operative handoffs
- derive handoffs for:
  - stack bootstrap
  - optimization lite
  - relaunch lite

### S2 — Profile application model

- translate stack, skill, and addon profiles into explicit downstream actions
- keep the profile outputs scenario-first and support-aware

### S3 — Tool output and tests

- render the new handoff and profile-application sections in Free runtime wizard tool output
- update plan-level and tool-level tests

## Verification

- `npm run typecheck --workspace=mcp-server`
- `npm run test --workspace=mcp-server -- free-runtime-wizards tools/free-runtime-wizards`

## Next Batch If Pass

1. connect the operative handoffs to stronger recommendation and creator-light action presets
2. decide whether to deepen Free execution further or mirror the same runtime uplift on the Advanced side
