# Elementify Domain Capability Remap Execution Report

## Batch Summary

- batch_id: `BATCH-CAP-DOMAIN-001`
- sequence: [capability-domain-remap-sequence.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/capability-domain-remap-sequence.md)
- sequence_type: `mixed`
- execution_mode: `ralph_attended`
- gate_result: `continue`

## Steps Completed

- `S1`
  - introduced canonical domain capabilities, legacy capability aliases, and normalization helpers in [auth.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/types/auth.ts)
  - widened stored capability-bearing contracts in [intelligence.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/types/intelligence.ts)
  - updated shared tests in [types.test.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/__tests__/types.test.ts)

- `S2`
  - moved plugin capability source of truth to domain capabilities in [Capabilities.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Auth/Capabilities.php)
  - added transitional alias matching in [Manager.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Auth/Manager.php)
  - normalized governance capability handling in [Settings.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Governance/Settings.php)

- `S3`
  - updated admin key display and capability generation grouping in [Page.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Admin/Page.php)
  - added transitional UI coverage in [PageTest.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/tests/Unit/Admin/PageTest.php)
  - expanded capability transition coverage in [ManagerTest.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/tests/Unit/Auth/ManagerTest.php)
  - updated governance tests for canonical domain defaults in [SettingsTest.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/tests/Unit/Governance/SettingsTest.php)

## Verification Commands

- `npm run test --workspace=shared -- types`
- `./vendor/bin/phpunit tests/Unit/Auth/ManagerTest.php tests/Unit/Admin/PageTest.php`
- `./vendor/bin/phpunit`
- `npm run typecheck --workspace=mcp-server`
- `npm run test --workspace=mcp-server -- client site`
- `npm run build --workspace=shared`

## Verification Results

- shared tests: `pass`
- plugin capability/admin tests: `pass`
- full plugin suite: `pass` with 3 known environment skips
- mcp-server typecheck: `pass`
- mcp-server targeted client/site tests: `pass`
- shared build: `pass`

## Files Changed

- [auth.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/types/auth.ts)
- [intelligence.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/types/intelligence.ts)
- [types.test.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/__tests__/types.test.ts)
- [Capabilities.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Auth/Capabilities.php)
- [Manager.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Auth/Manager.php)
- [Settings.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Governance/Settings.php)
- [Page.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Admin/Page.php)
- [ManagerTest.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/tests/Unit/Auth/ManagerTest.php)
- [PageTest.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/tests/Unit/Admin/PageTest.php)
- [SettingsTest.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/tests/Unit/Governance/SettingsTest.php)

## Review Result

- status: `continue`
- summary:
  - domain capabilities are now the canonical typed model
  - legacy key scopes remain functional through explicit alias resolution
  - admin UX has moved to the new domain-oriented grouping without breaking existing keys

## Known Limitations

- endpoint definitions still request many legacy capability strings directly; compatibility is currently preserved through the authorization layer rather than full endpoint vocabulary replacement
- mcp-server and plugin runtime documentation still refer to some legacy scope examples and should be cleaned up in a follow-up slice
- this batch does not yet expose a finalized governance UI for explicit domain-capability allow/deny toggles
- the full plugin suite still contains 3 known environment-dependent skips in activation-mode tests

## Next Executable Batch

1. replace legacy endpoint-required capability strings with canonical domain capabilities where safe
2. realign mcp-server client examples, tests, and docs to canonical domain capabilities
3. add a cleaner governance/settings UX for domain-capability policy control
