import { getProductTierProfile, type ProductTier } from './product-entitlements.js';
import { TOOL_TIER_ASSIGNMENTS, type RegisteredToolName } from './product-tiers.js';

export interface ProductWorkflowDefinition {
  id: string;
  label: string;
  summary: string;
  valueProposition: string;
  toolIds: RegisteredToolName[];
  notes?: string[];
}

export interface ProductSurfaceManifest {
  tier: Extract<ProductTier, 'free' | 'advanced'>;
  label: string;
  positioning: string;
  promise: string;
  entitlements: ReturnType<typeof getProductTierProfile>['entitlements'];
  primaryTools: RegisteredToolName[];
  workflows: ProductWorkflowDefinition[];
  excludes: string[];
  notes: string[];
}

function toolsForTier(tier: ProductTier): RegisteredToolName[] {
  return TOOL_TIER_ASSIGNMENTS
    .filter((assignment) => assignment.tier === tier)
    .map((assignment) => assignment.id as RegisteredToolName);
}

export const FREE_PRODUCT_SURFACE: ProductSurfaceManifest = {
  tier: 'free',
  label: 'Free',
  positioning: 'The intelligent free lift for Elementor.',
  promise: 'Make the current Elementor site immediately more understandable, more guided, and more operationally useful without requiring premium assets or cloud services.',
  entitlements: getProductTierProfile('free').entitlements,
  primaryTools: toolsForTier('free'),
  workflows: [
    {
      id: 'free-front-door',
      label: 'Scenario-first front door',
      summary: 'Route bootstrap, relaunch, optimization, and extension needs into the right Free path before users get lost in tools.',
      valueProposition: 'This is the 360-degree starting point that makes Free feel like a guided system instead of a tool shelf.',
      toolIds: [
        'route_intent_wizard',
        'plan_stack_bootstrap',
        'wizard_new_site_lite',
        'wizard_stack_bootstrap',
        'wizard_relaunch_lite',
        'wizard_optimization_lite',
        'wizard_extension_lite',
        'run_free_wizard_preset',
        'run_free_guided_transition',
        'get_site_info',
        'assess_site',
        'get_site_fingerprint',
        'get_destination_capabilities',
      ],
      notes: [
        'This front door is scenario-first and wizard-first.',
        'It supports bootstrap paths even when Elementor is not yet installed.',
        'The runtime wizard families now cover new-site-lite, stack-bootstrap, relaunch-lite, optimization-lite, and extension-lite.',
        'run_free_wizard_preset adds a limited guided-execution helper for presets that are explicitly marked safe.',
        'run_free_guided_transition chains the first safe and preview-only steps into short guided paths for bootstrap and optimization.',
      ],
    },
    {
      id: 'free-assessment-loop',
      label: 'Assessment and recommendation loop',
      summary: 'Understand the current site, store context, and derive prioritized next steps.',
      valueProposition: 'This is the core intelligence lift that makes Free feel substantially useful on day one.',
      toolIds: [
        'assess_site',
        'set_site_context',
        'get_site_context',
        'get_recommendations',
        'explain_recommendation',
        'get_site_fingerprint',
        'get_destination_capabilities',
        'validate_elementor_write',
      ],
    },
    {
      id: 'free-brand-setup',
      label: 'Brand setup',
      summary: 'Set logo, colors, and typography on the current site through guided local workflows.',
      valueProposition: 'Free should visibly improve the site without requiring a paid upgrade.',
      toolIds: [
        'get_global_styles',
        'set_global_colors',
        'set_global_typography',
        'set_site_logo',
        'wizard_brand_setup',
      ],
    },
    {
      id: 'free-creator-light',
      label: 'Creator Light',
      summary: 'Assemble simple pages and structures from the current site library and existing Elementor assets.',
      valueProposition: 'Free includes real creation and customization value, not just inspection.',
      toolIds: [
        'creator_mode',
        'compose_page_from_templates',
        'update_page_data',
        'get_page_data',
        'save_page_section_as_template',
        'save_full_page_as_template',
      ],
      notes: [
        'This is creator-light, not the deeper Advanced creation layer.',
      ],
    },
    {
      id: 'free-local-library',
      label: 'Local Elementor Library operations',
      summary: 'Manage, inspect, categorize, duplicate, and refine templates stored on the current WordPress site.',
      valueProposition: 'The local Elementor Library is the primary operational target system in Free.',
      toolIds: [
        'list_templates',
        'get_template',
        'create_template',
        'update_template',
        'delete_template',
        'rename_template',
        'duplicate_template',
        'bulk_rename',
        'get_template_data',
        'update_template_data',
        'extract_sections',
        'list_by_type',
        'set_category',
        'set_tags',
        'audit_library',
      ],
    },
    {
      id: 'free-agent-setup',
      label: 'Agent-native local setup',
      summary: 'Work across configured local sites without introducing Studio cloud semantics.',
      valueProposition: 'Free supports real operator convenience while staying local-site-first.',
      toolIds: [
        'get_site_info',
        'list_sites',
        'switch_site',
        'list_elementor_pages',
      ],
    },
  ],
  excludes: [
    'Theme Builder delivery workflows',
    'Premium Elementify Library access',
    'Change-queue governance flows',
    'Brand adaptation planning',
    'Rebuild planning and critique',
    'Output critique and repair guidance',
    'AI image generation and premium media workflows',
    'Cloud library, orchestration, or cross-site delivery promises',
  ],
  notes: [
    'Free remains public and mirror-safe.',
    'Free uses the local Elementor Library as the primary target system.',
    'Free may support local multi-site operator switching, but this is not Studio cloud reuse.',
  ],
};

export const ADVANCED_PRODUCT_SURFACE: ProductSurfaceManifest = {
  tier: 'advanced',
  label: 'Advanced',
  positioning: 'The smarter workflow and premium creation layer for Elementor.',
  promise: 'Extend the Free core with deeper workflow control, deeper creator power, stronger critique and adaptation, and the first curated Elementify Library experience.',
  entitlements: getProductTierProfile('advanced').entitlements,
  primaryTools: toolsForTier('advanced'),
  workflows: [
    {
      id: 'advanced-front-door',
      label: 'Scenario-first Advanced front door',
      summary: 'Route deep relaunch, migration, premium rollout, and critique-first work into the right Advanced path before execution begins.',
      valueProposition: 'Advanced should feel like a deeper operating layer with clear scenario routes, not a private shelf of disconnected extra tools.',
      toolIds: [
        'route_advanced_scenario',
        'advanced_creator_mode',
        'get_advanced_recommendations',
        'plan_advanced_upgrade_path',
        'get_destination_capabilities',
      ],
      notes: [
        'This is the private scenario-first front door for Advanced.',
        'It keeps deep relaunch, migration, premium rollout, and critique / repair work explicit before execution.',
      ],
    },
    {
      id: 'advanced-upgrade-guidance',
      label: 'Upgrade and stack-shaping runtime',
      summary: 'Distinguish builder upgrades, workflow-depth upgrades, and curated addon expansion based on the real scenario.',
      valueProposition: 'Advanced should help shape the next sensible stack move instead of turning paid paths into generic upsell prompts.',
      toolIds: [
        'get_advanced_recommendations',
        'plan_advanced_upgrade_path',
        'get_destination_capabilities',
        'route_advanced_scenario',
      ],
      notes: [
        'This keeps Elementor Pro, Elementify Advanced, and curated pro-addon profiles clearly separated.',
      ],
    },
    {
      id: 'advanced-theme-builder',
      label: 'Theme Builder delivery workflows',
      summary: 'Create and manage header, footer, archive, single, and related site-wide structural templates.',
      valueProposition: 'Advanced should feel like a real workflow and productivity upgrade, not just Free plus extras.',
      toolIds: [
        'route_advanced_scenario',
        'advanced_creator_mode',
        'wizard_theme_builder',
      ],
    },
    {
      id: 'advanced-creator-depth',
      label: 'Deeper creation and media workflows',
      summary: 'Enhance creation depth with stock sourcing, sideloading, and AI image support where useful.',
      valueProposition: 'Advanced adds stronger creator power and guided generation depth.',
      toolIds: [
        'search_stock_images',
        'sideload_stock_image',
        'generate_ai_image',
      ],
      notes: [
        'These tools are additive to the Free creator-light surface, not replacements for it.',
        'advanced_creator_mode is the orchestration layer that turns these deeper surfaces into a guided rollout path.',
        'The productivity layer now makes variant, reuse-light, and follow-up behavior explicit inside the workflow output.',
      ],
    },
    {
      id: 'advanced-governed-operations',
      label: 'Governed change workflows',
      summary: 'Queue, review, and apply changes through stronger approval-oriented operational flows.',
      valueProposition: 'Advanced supports higher-trust workflows and more disciplined site operations.',
      toolIds: [
        'queue_change',
        'list_change_queue',
        'review_change',
        'apply_change',
      ],
    },
    {
      id: 'advanced-brand-and-critique',
      label: 'Brand adaptation and critique',
      summary: 'Use token extraction, adaptation planning, rebuild strategy support, and output critique to guide deeper work.',
      valueProposition: 'Advanced improves both the quality and the confidence of deeper workflow execution.',
      toolIds: [
        'route_advanced_scenario',
        'advanced_creator_mode',
        'get_advanced_recommendations',
        'extract_design_tokens',
        'plan_brand_adaptation',
        'plan_rebuild_strategy',
        'critique_rebuild_strategy',
        'critique_elementor_output',
      ],
    },
    {
      id: 'advanced-premium-library',
      label: 'Elementify Library premium layer',
      summary: 'Browse, inspect, and plan curated premium assets that import into the local Elementor Library on the current site.',
      valueProposition: 'Advanced introduces a visible Elementify Library catalog without prematurely claiming cloud behavior.',
      toolIds: [
        'route_advanced_scenario',
        'advanced_creator_mode',
        'list_premium_library_assets',
        'inspect_premium_library_asset',
        'plan_premium_library_usage',
        'import_premium_library_asset',
      ],
      notes: [
        'This workflow is a product surface requirement and a packaging seam, with explicit browse -> inspect -> plan -> import flow.',
        'Premium library is local-site operational and not a cloud library.',
      ],
    },
  ],
  excludes: [
    'Studio cloud library',
    'Cross-site template storage',
    'Delivery orchestration as a public product promise',
    'Team or agency cloud sync semantics',
    'Marketplace launch behavior',
  ],
  notes: [
    'Advanced is private in the Forgejo primary and must remain separable from the public mirror.',
    'Advanced extends the Free core rather than replacing it.',
    'Advanced may mention the Elementify Library, but must not imply Studio cloud sync.',
  ],
};
