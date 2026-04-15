# Elementify Free Preset Execution Sequence

## Metadata

- batch_id: `BATCH-FREE-PRESET-EXECUTION-001`
- sequence_type: `build`
- execution_mode: `ralph_attended`
- audience_mode: `mixed`

## Objective

Introduce a limited guided-execution helper for the new Free runtime wizard families so safe presets can move from descriptive handoff to controlled execution without weakening Free guardrails.

## Success Criteria

- Free runtime presets expose explicit execution modes:
  - `safe_execute`
  - `preview_only`
- a new Free-facing tool can preview any preset and execute only safe presets
- safe execution reuses real internal wizard logic instead of duplicating output formatting
- product-tier and product-surface manifests recognize the new helper as part of the Free front door
- targeted typecheck and MCP tests pass

## Steps

### S1 — Preset execution contract

- extend Free preset metadata with explicit execution eligibility
- keep relaunch preservation and Advanced boundary presets preview-only
- mark context, brand dry-run, and Creator dry-run presets as safe-execute

### S2 — Limited Free preset runner

- add a new Free tool for preset preview and controlled execution
- support safe execution for:
  - `set_site_context`
  - `wizard_brand_setup` dry run
  - `creator_mode` dry run
- block execution for preview-only presets with explicit reasons

### S3 — Surface and verification

- register the new helper in Free tier and Free product surface manifests
- verify with:
  - `npm run typecheck --workspace=mcp-server`
  - `npm run test --workspace=mcp-server -- free-runtime-wizards tools/free-runtime-wizards product-tiers product-surfaces tools/index`

## Next Batch If Pass

1. decide whether Free should chain multiple safe presets into a short guided transition
2. decide whether Free should start persisting wizard state instead of remaining output-only
3. keep Advanced front-door work behind the next decision gate
