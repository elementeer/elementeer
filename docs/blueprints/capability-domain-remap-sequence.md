# Elementify Domain Capability Remap Sequence

## 1. Metadata

- title: Elementify Domain Capability Source of Truth and Transitional Remap
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

Translate the capability reset into a typed runtime source of truth, preserve backward compatibility for legacy key scopes, and realign plugin admin/governance handling to the new domain capability model.

## 3. Success Criteria

- shared types define canonical domain capabilities and explicit legacy aliases
- plugin capability registry uses domain capabilities as source of truth
- legacy keys and legacy endpoint requirements continue to authorize through alias resolution
- admin UI groups new keys by operating domain rather than resource-first capability buckets
- targeted shared, plugin, and mcp-server verification passes

## 4. Assumptions

- legacy endpoint-required capability strings may remain temporarily while authorization resolves them to the canonical domain model
- a full endpoint-by-endpoint rewrite is not required in this batch if transitional aliasing is robust
- Free/Advanced product language remains in blueprint docs, not in the low-level capability vocabulary

## 5. Inputs Required

- [capability-reset.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/capability-reset.md)
- [auth.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/types/auth.ts)
- [Capabilities.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Auth/Capabilities.php)
- [Manager.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Auth/Manager.php)
- [Page.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Admin/Page.php)
- [Settings.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Governance/Settings.php)

## 6. Outputs Required

- updated shared auth types
- updated plugin capability registry and alias resolution
- updated plugin admin/governance handling
- updated tests
- execution report

## 7. Sequence Steps

### S1 — Shared Domain Capability Source of Truth

Goal:

Create canonical domain capabilities and legacy alias metadata in shared types.

Write scope:

- [auth.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/types/auth.ts)
- [intelligence.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/types/intelligence.ts)
- [types.test.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/__tests__/types.test.ts)

### S2 — Plugin Capability Registry Reset

Goal:

Move the plugin capability registry to the new domain model while preserving legacy compatibility.

Write scope:

- [Capabilities.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Auth/Capabilities.php)
- [Manager.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Auth/Manager.php)
- [Settings.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Governance/Settings.php)

### S3 — Admin and Governance Realignment

Goal:

Present domain-oriented capability groups in the admin UI and normalize legacy display for existing keys.

Write scope:

- [Page.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Admin/Page.php)
- [PageTest.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/tests/Unit/Admin/PageTest.php)
- [ManagerTest.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/tests/Unit/Auth/ManagerTest.php)

### GATE A — Transitional Compatibility Gate

Goal:

Verify that shared types, plugin tests, and mcp-server consumers all continue to work with the domain/legacy transitional model.

## 8. Validation Rules

- canonical source of truth must be domain-oriented
- legacy capabilities must remain accepted only as transitional aliases
- admin UI must group capabilities by operating domain
- the batch must not silently drop existing key compatibility

## 9. Final Assembly

Return:

- changed files
- commands run
- compatibility verdict
- known limitations
- next executable batch
