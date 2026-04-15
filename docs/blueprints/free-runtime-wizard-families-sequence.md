# Elementify Free Runtime Wizard Families Sequence

## Metadata

- batch_id: `BATCH-FREE-RUNTIME-WIZARDS-001`
- sequence_type: `mixed`
- execution_mode: `ralph_attended`
- audience_mode: `mixed`

## Objective

Turn the new Free front door into the first real runtime wizard families so users can move from routing into concrete phased flows.

## Success Criteria

- Free exposes concrete runtime wizard tools for:
  - stack bootstrap
  - relaunch lite
  - optimization lite
- each runtime wizard consumes the scenario-first route instead of bypassing it
- each runtime wizard hands off into existing Free tools such as:
  - `wizard_brand_setup`
  - `get_recommendations`
  - `explain_recommendation`
  - `creator_mode`
- Free product surfaces and tier assignments reflect the new runtime families
- targeted runtime tests and registration tests pass

## Batch Plan

### S1 — Runtime wizard plan layer

- create a deterministic runtime plan layer for:
  - `stack-bootstrap`
  - `relaunch-lite`
  - `optimization-lite`
- use scenario-first route output as the source of truth
- use live recommendation/context data when available

### S2 — Tool layer

- add Free-facing MCP tools for the three runtime wizard families
- support optional live-site routing via `site_id`
- return phased guidance, handoffs, guardrails, and upgrade signals

### S3 — Product integration

- register the new tools in the Free tool set
- map them into Free tier assignments
- add them to the Free product surface workflow model

### S4 — Verification

- add targeted unit tests for runtime plan builders
- add tool registration and output tests
- run:
  - `npm run typecheck --workspace=mcp-server`
  - `npm run test --workspace=mcp-server -- free-runtime-wizards tools/free-runtime-wizards tools/index product-tiers product-surfaces smoke/server`

## Review Gate

- gate_result must be binary:
  - `continue` only if the new runtime wizard families are registered, typed, and tested
  - `inconclusive` if routing exists but the wizard families do not hand off into real Free tools

## Next Batch If Pass

1. tighten runtime handoffs from the new wizard families into recommendation explanation, brand setup, and creator-light execution
2. add richer stack / skill / addon profile usage inside runtime wizard outputs
3. only then deepen the Advanced runtime side further
