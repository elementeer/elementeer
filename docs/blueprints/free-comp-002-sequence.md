# Elementify FREE-COMP-002 Sequence

## Metadata

- batch_id: `FREE-COMP-002`
- sequence_type: `build`
- execution_mode: `ralph_attended`
- audience_mode: `mixed`

## Objective

Complete the missing Free runtime scenario families so the scenario-first front door covers the full intended Free range instead of falling back to generic routing.

## Success Criteria

- Free has concrete runtime wizard families for:
  - `new-site-lite`
  - `extension-lite`
- `clean_up` and `refresh` map explicitly into the `optimization-lite` runtime family
- Free surfaces and tier mappings reflect the new runtime families
- targeted runtime and surface tests pass

## Steps

### S1 — Runtime family completion

- add `new-site-lite` as a concrete Free runtime family for:
  - `idea_only`
  - `brand_without_site`
- add `extension-lite` as a concrete Free runtime family for restrained extension work
- keep both families scenario-first and local-site-first

### S2 — Intent remapping

- map `clean_up` to `optimization-lite`
- map `refresh` to `optimization-lite`
- keep language and phase goals scenario-specific so these paths do not feel generic

### S3 — Surface and verification

- add the new runtime families to Free tier and surface manifests
- update tests and routing expectations
- verify with:
  - `npm run typecheck --workspace=mcp-server`
  - `npm run test --workspace=mcp-server -- intent-wizard free-runtime-wizards tools/free-runtime-wizards product-tiers product-surfaces tools/index`

## Next Batch If Pass

1. make stack, skill, and addon profiles shape runtime defaults more strongly
2. translate the new families into more profile-aware presets and guided transitions
3. then lock the public Free runtime story against the new scenario-first surface
