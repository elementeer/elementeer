# Elementify Free Completion Batch B Sequence

## Metadata

- batch_id: `FREE-COMP-B`
- items:
  - `FREE-COMP-003`
  - `FREE-COMP-004`
- sequence_type: `build`
- execution_mode: `ralph_attended`
- audience_mode: `mixed`

## Objective

Finish the next Free runtime step by making routed profiles materially reshape runtime defaults and then lock the public Free story around the new scenario-first runtime surface.

## Success Criteria

- stack, skill, and addon profiles change runtime presets and follow-up behavior in observable ways
- this shaping remains deterministic and tested
- public Free docs reflect the scenario-first runtime families and limited guided transitions
- Free mirror and Free release verification remain green after the public-lock update

## Steps

### S1 — Profile-aware runtime shaping

- make stack profiles change runtime defaults where the scenario baseline should stay conservative
- make skill profiles change runtime defaults where posture should affect operator control
- make addon profiles change creator defaults and follow-up guidance where the scenario calls for a narrow curated extension path

### S2 — Public Free runtime lock

- align public quickstart, README Free workflow summary, and public includes/excludes page with the scenario-first runtime surface
- keep the public story honest about:
  - new-site-lite
  - stack-bootstrap
  - optimization-lite
  - relaunch-lite
  - extension-lite
  - limited guided transitions

### S3 — Release and mirror verification

- verify the targeted runtime tests
- verify the Free mirror contract
- prepare the deterministic Free staging artifact
- verify the Free release contract against the staged output

## Verification

- `npm run typecheck --workspace=mcp-server`
- `npm run test --workspace=mcp-server -- free-runtime-wizards tools/free-runtime-wizards intent-wizard product-tiers product-surfaces tools/index`
- `npm run build --workspace=mcp-server`
- `npm run verify:free-mirror`
- `npm run prepare:free-mirror`
- `npm run verify:free-release`

## Next Batch If Pass

1. move into `ADV-COMP-001` for the Advanced scenario front door
2. keep the same scenario-first logic and profile language across the private Advanced runtime layer
