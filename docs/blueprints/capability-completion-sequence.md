# Elementify Capability Completion Sequence

## 1. Metadata

- title: Elementify Domain Capability Completion and Governance Policy UX
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

Carry the domain capability reset through the remaining runtime surfaces so the plugin, MCP client examples, tests, and public docs consistently speak the canonical capability language while preserving legacy key compatibility.

## 3. Success Criteria

- plugin endpoints require canonical domain capabilities instead of legacy resource-first strings
- governance settings UI exposes editable domain capability policies
- mcp-server tests and sample site payloads use canonical domain capabilities
- README and plugin readme describe the domain capability model and transitional alias story accurately
- verification passes across shared, mcp-server, and plugin suites

## 4. Assumptions

- legacy keys remain valid through alias resolution in the auth layer
- a limited number of tests should still reference legacy capabilities on purpose to preserve compatibility coverage
- the batch should not yet redesign runtime flows; it only completes the capability language transition

## 5. Inputs Required

- [capability-domain-remap-sequence.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/capability-domain-remap-sequence.md)
- [capability-reset.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/capability-reset.md)
- [free-advanced-scenario-wizard-prd-v2.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-scenario-wizard-prd-v2.md)
- [auth.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/shared/src/types/auth.ts)
- [Capabilities.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Auth/Capabilities.php)
- [Page.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Admin/Page.php)

## 6. Outputs Required

- updated endpoint capability requirements
- updated governance policy UI
- updated tests and client fixtures
- updated public docs
- execution report

## 7. Sequence Steps

### S1 — Endpoint Capability Remap

Goal:

Replace remaining legacy required capabilities in plugin endpoints with canonical domain capabilities.

Write scope:

- [Assessment.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Api/Assessment.php)
- [Site.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Api/Site.php)
- [Logo.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Api/Logo.php)
- [SiteContext.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Api/SiteContext.php)
- [GlobalStyles.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Api/GlobalStyles.php)
- [MediaSideload.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Api/MediaSideload.php)
- [Pages.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Api/Pages.php)
- [Templates.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Api/Templates.php)
- [ThemeBuilder.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Api/ThemeBuilder.php)
- [ChangeQueue.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Api/ChangeQueue.php)

### S2 — Governance Policy UX

Goal:

Make the governance screen capable of explicitly allowing and denying domain capabilities.

Write scope:

- [Page.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Admin/Page.php)
- [Settings.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/includes/Governance/Settings.php)
- [PageTest.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/tests/Unit/Admin/PageTest.php)
- [SettingsTest.php](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/tests/Unit/Governance/SettingsTest.php)

### S3 — Client and Public Surface Cleanup

Goal:

Align mcp-server fixtures and public docs to the canonical domain capability language.

Write scope:

- [client.test.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/__tests__/client.test.ts)
- [client-api.test.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/__tests__/integration/client-api.test.ts)
- [site.test.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/__tests__/tools/site.test.ts)
- [README.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/README.md)
- [plugin/readme.txt](/Users/andrelange/Documents/repositories/github/elementify-mcp/plugin/readme.txt)

### GATE A — Capability Completion Gate

Goal:

Verify the runtime now speaks the domain capability model consistently, with legacy compatibility preserved only where intentionally tested.

## 8. Validation Rules

- endpoint authorization strings should be canonical domain capabilities
- governance UI must expose editable `allowed_capabilities`
- legacy strings should remain only in alias registries or explicit backward-compat tests
- public docs must explain the transition honestly

## 9. Final Assembly

Return:

- changed files
- commands run
- gate verdict
- remaining compatibility pockets
- next executable batch
