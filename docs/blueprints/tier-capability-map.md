# Elementify Tier Capability Map

## Purpose

This document is the executable product boundary for the current repository state. It maps every currently registered MCP tool to one of three product tiers:

- `free`
- `advanced`
- `studio_future`

It is grounded in:

- [elementify_drei_stufen_launchstrategie_finalisierung.md](/Users/andrelange/Library/CloudStorage/GoogleDrive-andre.lange@lange-network.com/Meine%20Ablage/02_Projects/Vamerli_Elementify/05_Go_to_Market/elementify_drei_stufen_launchstrategie_finalisierung.md)
- [phase-2-baseline-alignment.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/phase-2-baseline-alignment.md)
- [free-advanced-launch-prd.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-advanced-launch-prd.md)
- [mcp-server/src/product-tiers.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/product-tiers.ts)

This map is intentionally stricter than marketing language. Its job is to make the future Forgejo-primary and GitHub-Free-mirror split technically enforceable.

## Important Interpretation

This map is no longer the primary product model.

The primary product model now lives in the scenario-, wizard-, stack-, skill-, and addon-profile blueprints.

This document should therefore be read as:

- a current tool-tier projection
- an implementation boundary map
- not the main explanation of what Elementify is

That distinction matters because the product is now intentionally:

- scenario-first
- wizard-first
- stack-aware
- extension-aware

while this map remains a lower-level runtime packaging artifact.

## Decision Rules

- `free` means public, mirror-safe, and core to the Free value promise.
- `advanced` means private, additive, and clearly beyond the Free core.
- `studio_future` means strategically important seam work that should not yet be part of the active public or paid packaging story.
- Local multi-site operator convenience is not automatically `studio_future`.
- Local Elementor Library workflows belong in `free` unless they require deeper governance, premium assets, or orchestration logic.
- Premium-library access belongs in `advanced`.
- Cloud library, cross-site delivery, and orchestration belong to `studio_future` unless and until Studio is formally activated.

## Free

### Site understanding and guidance

- `assess_site`
- `set_site_context`
- `get_site_context`
- `get_recommendations`
- `explain_recommendation`
- `get_site_fingerprint`
- `get_destination_capabilities`
- `validate_elementor_write`
- `get_site_info`

Why:

- This is the core intelligence lift that makes Free feel meaningfully useful.
- These tools explain the current site, guide the next action, and protect execution without requiring premium assets or cloud services.

### Agent-native setup and local operator context

- `list_sites`
- `switch_site`

Why:

- Free includes API-key and agent-native setup.
- Local site switching is an operator convenience, not Studio-style cloud orchestration.

### Local Elementor Library management

- `list_templates`
- `get_template`
- `create_template`
- `update_template`
- `delete_template`
- `rename_template`
- `duplicate_template`
- `bulk_rename`
- `get_template_data`
- `update_template_data`
- `extract_sections`
- `list_by_type`
- `set_category`
- `set_tags`
- `audit_library`

Why:

- The local Elementor Library is the primary target system in Free.
- Free should feel operationally real, not artificially crippled.
- The product promise is to make the existing Elementor stack more useful, not to gate basic library control behind payment.

### Page, section, and simple assembly workflows

- `list_elementor_pages`
- `get_page_data`
- `save_page_section_as_template`
- `update_page_data`
- `compose_page_from_templates`
- `save_full_page_as_template`

Why:

- Free explicitly includes simple page, section, and widget assembly.
- Free also includes intelligent customization of existing Elementor structures on the current site.

### Brand and onboarding workflows

- `get_global_styles`
- `set_global_colors`
- `set_global_typography`
- `set_site_logo`
- `wizard_brand_setup`
- `creator_mode`

Why:

- These flows deliver the “strong intelligent lift” promised in Free.
- `creator_mode` remains the Free-grade creator-light workflow, not the full deeper creation layer.

## Advanced

### Deeper structural workflow depth

- `wizard_theme_builder`

Why:

- Theme Builder crosses into site-wide structural delivery.
- It is a clear step up from creator-light into deeper workflow control and should therefore mark Advanced.

### Deeper creation and media workflow power

- `search_stock_images`
- `sideload_stock_image`
- `generate_ai_image`

Why:

- These tools increase creator power and guided generation depth.
- They are useful, but not required to satisfy the Free core promise.

### Governance and higher-trust operational workflows

- `queue_change`
- `list_change_queue`
- `review_change`
- `apply_change`

Why:

- Approval-based change governance is stronger operational workflow behavior.
- It fits Advanced much better than Free.

### Deeper brand, critique, and planning layer

- `extract_design_tokens`
- `plan_brand_adaptation`
- `plan_rebuild_strategy`
- `critique_rebuild_strategy`
- `critique_elementor_output`

Why:

- These are not baseline guidance features.
- They deepen contextualization, critique, brand adaptation, and agent-native workflow quality.
- This matches the intended Productivity Upgrade role of Advanced.

## Studio Future

### Orchestration seed

- `suggest_pipeline_path`

Why:

- The current implementation is useful as a seam, but strategically it belongs to the later Studio operating mode.
- It points toward conversational orchestration and delivery control rather than toward the current Free or Advanced packaging story.

## Workflow Surface Mapping

### Free workflow surfaces

- bootstrap and stack-start surfaces
- Assessment and recommendation loop
- Quickstart and recommendation-guided onboarding
- Brand setup
- Creator Light
- local library organization and customization
- simple page and section assembly
- honest validation and capability explanation

### Advanced workflow surfaces

- deeper bootstrap and stack-shaping surfaces
- Theme Builder delivery flows
- deeper creator and media flows
- stronger governance and review flows
- brand adaptation planning
- output critique and repair guidance
- deeper strategy and workflow-planning assistance

### Studio future seams

- conversational orchestration
- cloud library provider
- cross-site template storage
- blueprint and delivery logic

## Boundary Cases

### `wizard_theme_builder`

Decision:

- keep in `advanced`

Reason:

- It changes site-wide structural behavior and is a natural boundary between creator-light and deeper workflow control.

### `list_sites` and `switch_site`

Decision:

- keep in `free`

Reason:

- They express local agent setup convenience, not cloud reuse or multi-client delivery orchestration.

### `delete_template`

Decision:

- keep in `free`

Reason:

- Free should remain operationally serious.
- Safety is already handled by governance and scoped capabilities.

### `suggest_pipeline_path`

Decision:

- classify as `studio_future`

Reason:

- Even though the seed exists today, it is strategically closer to future Studio orchestration than to the current public product surfaces.

## Mirror Implications

The future GitHub mirror should include:

- every `free` tool
- only `free` docs and public-facing workflows

The mirror should exclude:

- every `advanced` tool and private module
- any premium-library policy or asset implementation
- every `studio_future` surface

This means the next architecture slices must enforce:

- no Free imports from Advanced-only modules
- no public docs promising Advanced or Studio behavior
- no accidental leakage of orchestration or premium-library code into the mirror
