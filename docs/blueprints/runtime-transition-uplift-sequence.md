# Elementify Runtime Transition Uplift Sequence

## Metadata

- batch_id: `BATCH-RUNTIME-TRANSITION-UPLIFT-001`
- sequence_type: `build`
- execution_mode: `ralph_attended`
- audience_mode: `mixed`

## Objective

Tighten the new runtime wizard and workflow layers so they move closer to guided execution instead of staying at descriptive handoff level.

## Success Criteria

- Free runtime wizard families expose stronger action presets for:
  - recommendation explanation
  - brand setup
  - Creator Light
- Advanced workflow plans expose mirrored runtime uplift through:
  - operative handoffs
  - action presets
  - workflow applications
- targeted typecheck and runtime tests pass for both Free and Advanced workflow layers

## Steps

### S1 — Free transition uplift

- convert Free action-level handoffs into stronger action presets
- connect presets more tightly to:
  - `explain_recommendation`
  - `wizard_brand_setup`
  - `creator_mode`

### S2 — Advanced runtime mirror

- mirror the same runtime uplift pattern into Advanced workflow planning
- add:
  - operative handoffs
  - action presets
  - workflow applications

### S3 — Verification

- `npm run typecheck --workspace=mcp-server`
- `npm run test --workspace=mcp-server -- free-runtime-wizards tools/free-runtime-wizards advanced-workflows tools/advanced-workflows`

## Next Batch If Pass

1. decide whether Free should gain limited preset execution helpers
2. decide whether Advanced should gain a dedicated scenario-front-door above its workflow modes
