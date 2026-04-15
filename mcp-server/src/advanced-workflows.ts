import type {
  CapabilityMatrix,
  ImportReport,
  LayoutRiskSignal,
  OutputCritique,
  ProjectEditingMode,
  ProjectProfile,
  QueuedChange,
  RecommendationEngineReport,
  RiskResolutionMode,
  SiteAssessment,
  SiteContext,
} from './client.js';
import { buildAdvancedRecommendationReport } from './advanced-recommendations.js';
import {
  buildAdvancedLayoutRiskSignals,
  deriveApprovalMode,
  deriveRiskResolutionMode,
  resolveProjectProfile,
} from './project-profile-runtime.js';

export type AdvancedWorkflowKind =
  | 'deep-relaunch'
  | 'migration-rollout'
  | 'premium-page-rollout'
  | 'theme-builder-rollout'
  | 'critique-repair-loop';

export type AdvancedScenarioKind =
  | 'deep-relaunch'
  | 'migration'
  | 'premium-rollout'
  | 'critique-repair';

export interface AdvancedScenarioPlan {
  scenario: AdvancedScenarioKind;
  title: string;
  summary: string;
  projectProfileApplied: ProjectProfile;
  layoutRiskSignals: LayoutRiskSignal[];
  riskResolutionMode: RiskResolutionMode;
  approvalMode: ProjectEditingMode;
  recommendedWorkflow: AdvancedWorkflowKind;
  supportingWorkflows: AdvancedWorkflowKind[];
  rationale: string[];
  executionSteps: string[];
  recommendedTools: string[];
  guardrails: string[];
  nextDecision: string;
  operativeHandoffs: AdvancedWorkflowAction[];
  actionPresets: AdvancedWorkflowActionPreset[];
  workflowApplications: AdvancedWorkflowApplication[];
  productivityLayer: AdvancedProductivityLayer;
}

export interface AdvancedWorkflowPlan {
  workflow: AdvancedWorkflowKind;
  title: string;
  summary: string;
  projectProfileApplied: ProjectProfile;
  layoutRiskSignals: LayoutRiskSignal[];
  riskResolutionMode: RiskResolutionMode;
  approvalMode: ProjectEditingMode;
  foundationDependencies: string[];
  executionSteps: string[];
  recommendedTools: string[];
  guardrails: string[];
  notes: string[];
  operativeHandoffs: AdvancedWorkflowAction[];
  actionPresets: AdvancedWorkflowActionPreset[];
  workflowApplications: AdvancedWorkflowApplication[];
  productivityLayer: AdvancedProductivityLayer;
}

export interface AdvancedWorkflowAction {
  id: string;
  label: string;
  tool: string;
  reason: string;
  when: string;
  exampleArgs: Record<string, unknown>;
}

export interface AdvancedWorkflowActionPreset {
  id: string;
  label: string;
  tool: string;
  expectedOutcome: string;
  dependsOn: string[];
  args: Record<string, unknown>;
}

export interface AdvancedWorkflowApplication {
  layer: 'workflow' | 'library' | 'quality' | 'governance';
  label: string;
  summary: string;
  actions: string[];
}

export interface AdvancedProductivityLayer {
  summary: string;
  variantMoves: string[];
  reuseLightMoves: string[];
  followUpMode: string;
  timeSavingMoves: string[];
}

export interface AdvancedWorkflowQualityLoop {
  sourceRef: string;
  importReport: ImportReport;
  recommendationReport: RecommendationEngineReport;
  critique: OutputCritique;
  queueRecommended: boolean;
}

export interface AdvancedWorkflowExecutionOutcome {
  executedActions: string[];
  qualityLoop?: AdvancedWorkflowQualityLoop;
  queuedFollowUp?: Pick<QueuedChange, 'id' | 'status' | 'operation' | 'note'>;
  approvalQueued?: Pick<QueuedChange, 'id' | 'status' | 'operation' | 'note'>;
}

function buildAdvancedRuntimePolicy(params: {
  workflow: AdvancedWorkflowKind;
  context: SiteContext;
}): Pick<
  AdvancedWorkflowPlan,
  'projectProfileApplied' | 'layoutRiskSignals' | 'riskResolutionMode' | 'approvalMode'
> {
  const projectProfileApplied = resolveProjectProfile(params.context);
  const layoutRiskSignals = buildAdvancedLayoutRiskSignals({
    scenario: 'advanced-scenario',
    workflow: params.workflow,
    profile: projectProfileApplied,
  });

  return {
    projectProfileApplied,
    layoutRiskSignals,
    riskResolutionMode: deriveRiskResolutionMode(projectProfileApplied, layoutRiskSignals),
    approvalMode: deriveApprovalMode(projectProfileApplied, layoutRiskSignals),
  };
}

function hasCapability(
  capabilityMatrix: CapabilityMatrix,
  capabilityId: string,
): boolean {
  return capabilityMatrix.capabilities.some(
    (capability) => capability.id === capabilityId && capability.available,
  );
}

function buildWorkflowApplications(params: {
  workflow: AdvancedWorkflowKind;
  context: SiteContext;
}): AdvancedWorkflowApplication[] {
  const governanceActions = params.context.user_role === 'agency' || params.context.user_role === 'ai-agent'
    ? [
        'Use governed review and follow-up when the workflow changes high-visibility or site-wide structures.',
        'Prefer queued follow-up for caution or blocked critique verdicts.',
      ]
    : [
        'Keep governance available as a safety rail for higher-impact fixes.',
      ];

  if (params.workflow === 'premium-page-rollout') {
    return [
      {
        layer: 'library',
        label: 'Premium library layer',
        summary: 'Begin from a curated premium asset, but keep the imported result local-site operational.',
        actions: [
          'Inspect and plan the premium asset before import.',
          'Treat the imported template as a local Elementor artifact, not as cloud state.',
        ],
      },
      {
        layer: 'quality',
        label: 'Quality loop layer',
        summary: 'The imported structure should be critiqued before it becomes a high-visibility page rollout.',
        actions: [
          'Run critique before publication or broader rollout.',
          'Use repair guidance when the verdict is not solid.',
        ],
      },
      {
        layer: 'governance',
        label: 'Governance layer',
        summary: 'Agencies and higher-trust operators should keep a review path available for stronger premium rollouts.',
        actions: governanceActions,
      },
    ];
  }

  if (params.workflow === 'theme-builder-rollout' || params.workflow === 'deep-relaunch' || params.workflow === 'migration-rollout') {
    return [
      {
        layer: 'workflow',
        label: 'Structural rollout layer',
        summary: params.workflow === 'theme-builder-rollout'
          ? 'Theme Builder rollout should remain capability-aware and deliberately sequenced.'
          : params.workflow === 'deep-relaunch'
            ? 'Deep relaunch should stay sequenced so preservation, structural rollout, and critique remain explicit.'
            : 'Migration should stay staged so the first boundary is clear before larger structure moves.',
        actions: [
          'Confirm Theme Builder capability before structural rollout starts.',
          'Use rebuild planning or critique when the source structure is not obviously safe.',
        ],
      },
      {
        layer: 'quality',
        label: 'Structural quality layer',
        summary: 'Site-wide templates should be validated and critiqued before broader activation.',
        actions: [
          'Treat template creation and critique as one continuous workflow.',
        ],
      },
      {
        layer: 'governance',
        label: 'Governance layer',
        summary: 'Structural rollout becomes safer when review is available before broader rollout.',
        actions: governanceActions,
      },
    ];
  }

  return [
    {
      layer: 'quality',
      label: 'Critique loop layer',
      summary: 'Advanced critique and repair should combine deterministic validation with stronger repair guidance.',
      actions: [
        'Validate first, critique second, then decide whether follow-up should be governed.',
        'Keep the quality loop additive rather than replacing deterministic checks.',
      ],
    },
    {
      layer: 'governance',
      label: 'Governance layer',
      summary: 'Queued follow-up is part of the Advanced safety model for deeper repair work.',
      actions: governanceActions,
    },
  ];
}

function buildProductivityLayer(params: {
  workflow: AdvancedWorkflowKind;
  context: SiteContext;
}): AdvancedProductivityLayer {
  if (params.workflow === 'premium-page-rollout') {
    return {
      summary: 'Premium rollout should reduce work by turning one curated asset into a reusable local branch plus a page-specific adaptation path.',
      variantMoves: [
        'Create a premium starter variant before heavy page-specific changes begin.',
        'Keep one reusable local-library branch and one page-specific branch instead of editing the only copy.',
      ],
      reuseLightMoves: [
        'Tag and preserve the imported local asset so future rollouts start faster.',
        'Use the imported premium asset as a repeatable local building block on the current site.',
      ],
      followUpMode: params.context.user_role === 'agency' || params.context.user_role === 'ai-agent'
        ? 'Queue cautionary premium rollout follow-up when the critique verdict is not solid.'
        : 'Keep critique-driven follow-up explicit so the rollout does not drift silently.',
      timeSavingMoves: [
        'Start from a curated premium asset instead of building the same structure from scratch.',
        'Let critique happen on the imported result before the broader rollout path grows.',
      ],
    };
  }

  if (params.workflow === 'deep-relaunch') {
    return {
      summary: 'Deep relaunch should save time by preserving the current strong state, creating bounded structural slices, and keeping rollback value explicit.',
      variantMoves: [
        'Treat the preservation snapshot as a rollback branch and a source of reusable fragments.',
        'Create one structural slice at a time instead of relaunching the whole site in one pass.',
      ],
      reuseLightMoves: [
        'Preserve high-value existing pages as templates before structural work begins.',
        'Reuse the strongest preserved page fragments in later relaunch slices when they still fit.',
      ],
      followUpMode: params.context.user_role === 'agency' || params.context.user_role === 'ai-agent'
        ? 'Use governed follow-up for structural relaunch slices that return caution or blocked verdicts.'
        : 'Keep structural relaunch follow-up explicit and bounded before the next slice starts.',
      timeSavingMoves: [
        'Bounded structural slices reduce expensive rework and keep rollback obvious.',
        'Quality-loop the persisted draft slice before additional relaunch work branches outward.',
      ],
    };
  }

  if (params.workflow === 'migration-rollout') {
    return {
      summary: 'Migration should save time by staging one migration slice at a time and keeping source-to-target comparison explicit.',
      variantMoves: [
        'Keep a source template reference alongside each migration slice so comparison stays fast.',
        'Use a first bounded migration slice as the repeatable pattern for later migration moves.',
      ],
      reuseLightMoves: [
        'Promote a successful migration slice into a reusable local pattern before broadening the migration.',
        'Reuse the first migrated structural slice instead of rebuilding parallel variants independently.',
      ],
      followUpMode: 'Let critique decide whether the migrated slice is good enough to reuse directly or should go into governed follow-up first.',
      timeSavingMoves: [
        'A first good migration slice becomes the template for the next slices.',
        'Destination-aware staging prevents wasted rebuild effort against unsupported structure.',
      ],
    };
  }

  return {
    summary: 'Critique and repair become a productivity layer when repair guidance turns into explicit, reviewable next actions instead of remaining abstract.',
    variantMoves: [
      'Keep a before-state reference before higher-impact repair work begins.',
      'Use critique to choose the smallest useful repair slice first.',
    ],
    reuseLightMoves: [
      'Promote high-value repaired structures into reusable local templates when the fix is repeatable.',
      'Reuse the same repair logic across similar templates or pages instead of re-diagnosing from scratch.',
    ],
    followUpMode: 'Queue repair follow-up when the verdict is not solid or when the operator wants stronger auditability.',
    timeSavingMoves: [
      'Deterministic validation plus critique shortens the gap between “what is wrong” and “what should happen next”.',
      'Governed follow-up avoids losing repair intent between sessions or operators.',
    ],
  };
}

function buildDeepRelaunchOperativeHandoffs(params: {
  sourceTemplateId?: number;
  targetPageId?: number;
  themeBuilderType?: string;
}): AdvancedWorkflowAction[] {
  return [
    {
      id: 'deep-relaunch-preserve',
      label: 'Preserve the current high-value surface first',
      tool: 'save_full_page_as_template',
      reason: 'A deep relaunch should protect the strongest reusable structures before deeper structural work starts.',
      when: 'Use before structural rollout or stronger critique work touches key pages.',
      exampleArgs: {
        page_id: params.targetPageId ?? 55,
        title: 'Pre-Relaunch Advanced Snapshot',
        status: 'draft',
      },
    },
    {
      id: 'deep-relaunch-plan',
      label: 'Make the relaunch boundary explicit',
      tool: 'plan_rebuild_strategy',
      reason: 'Advanced relaunch work should decide the rebuild boundary before templates or site-wide structures are changed.',
      when: 'Use once preservation priorities are clear and before rollout starts.',
      exampleArgs: {
        intent: 'rebuild-close-to-source',
      },
    },
    {
      id: 'deep-relaunch-structure',
      label: 'Prepare the structural rollout seam',
      tool: 'wizard_theme_builder',
      reason: 'Deep relaunch often moves beyond page-level work and needs a deliberate structural seam.',
      when: 'Use when the relaunch is crossing into site-wide delivery surfaces.',
      exampleArgs: {
        type: params.themeBuilderType ?? 'header',
        title: `Deep relaunch ${params.themeBuilderType ?? 'header'} rollout`,
      },
    },
    {
      id: 'deep-relaunch-critique',
      label: 'Critique before broader activation',
      tool: 'critique_elementor_output',
      reason: 'Deep relaunch should use critique as a safety layer before broader rollout.',
      when: 'Use after the first relaunch slice is prepared and before wider activation.',
      exampleArgs: {
        source_type: params.targetPageId ? 'page' : 'template',
        source_id: params.targetPageId ?? params.sourceTemplateId ?? 42,
      },
    },
  ];
}

function buildDeepRelaunchActionPresets(params: {
  sourceTemplateId?: number;
  targetPageId?: number;
  themeBuilderType?: string;
}): AdvancedWorkflowActionPreset[] {
  return [
    {
      id: 'deep-relaunch-preserve-preset',
      label: 'Deep relaunch preservation preset',
      tool: 'save_full_page_as_template',
      expectedOutcome: 'The current high-value surface is preserved before the relaunch moves deeper.',
      dependsOn: ['list_elementor_pages'],
      args: {
        page_id: params.targetPageId ?? 55,
        title: 'Pre-Relaunch Advanced Snapshot',
        status: 'draft',
      },
    },
    {
      id: 'deep-relaunch-plan-preset',
      label: 'Deep relaunch planning preset',
      tool: 'plan_rebuild_strategy',
      expectedOutcome: 'The relaunch boundary is explicit before structural rollout begins.',
      dependsOn: ['get_advanced_recommendations'],
      args: {
        intent: 'rebuild-close-to-source',
      },
    },
    {
      id: 'deep-relaunch-critique-preset',
      label: 'Deep relaunch critique preset',
      tool: 'critique_elementor_output',
      expectedOutcome: 'The first relaunch slice receives a quality verdict before broader activation.',
      dependsOn: ['plan_rebuild_strategy'],
      args: {
        source_type: params.targetPageId ? 'page' : 'template',
        source_id: params.targetPageId ?? params.sourceTemplateId ?? 42,
      },
    },
  ];
}

function buildMigrationOperativeHandoffs(params: {
  sourceTemplateId?: number;
  targetPageId?: number;
  themeBuilderType?: string;
}): AdvancedWorkflowAction[] {
  return [
    {
      id: 'migration-capability',
      label: 'Confirm migration target capability',
      tool: 'get_destination_capabilities',
      reason: 'Migration should start by confirming what the destination can safely support.',
      when: 'Use before deciding the first migration slice.',
      exampleArgs: {},
    },
    {
      id: 'migration-plan',
      label: 'Stage the migration boundary',
      tool: 'plan_rebuild_strategy',
      reason: 'A migration path should decide what moves first instead of treating the whole site as one batch.',
      when: 'Use before the first structural or template migration step.',
      exampleArgs: {
        intent: 'optimize-for-existing-destination',
      },
    },
    {
      id: 'migration-critique-strategy',
      label: 'Critique the migration strategy',
      tool: 'critique_rebuild_strategy',
      reason: 'The migration path should be pressure-tested before structural execution starts.',
      when: 'Use after the rebuild plan exists and before the first migration slice is executed.',
      exampleArgs: {
        strategy_title: 'First migration slice',
      },
    },
    {
      id: 'migration-structure',
      label: 'Create the first migration target structure',
      tool: 'wizard_theme_builder',
      reason: 'The first migration slice should land in a real target structure rather than stay abstract.',
      when: 'Use once the target capability and first migration boundary are confirmed.',
      exampleArgs: {
        type: params.themeBuilderType ?? 'header',
        title: `Migration ${params.themeBuilderType ?? 'header'} rollout`,
        source_template_id: params.sourceTemplateId ?? undefined,
      },
    },
  ];
}

function buildMigrationActionPresets(params: {
  sourceTemplateId?: number;
  targetPageId?: number;
  themeBuilderType?: string;
}): AdvancedWorkflowActionPreset[] {
  return [
    {
      id: 'migration-capability-preset',
      label: 'Migration capability preset',
      tool: 'get_destination_capabilities',
      expectedOutcome: 'The migration path knows the real destination support before moving structure.',
      dependsOn: [],
      args: {},
    },
    {
      id: 'migration-plan-preset',
      label: 'Migration planning preset',
      tool: 'plan_rebuild_strategy',
      expectedOutcome: 'The first migration slice is explicit before execution.',
      dependsOn: ['get_destination_capabilities'],
      args: {
        intent: 'optimize-for-existing-destination',
      },
    },
    {
      id: 'migration-critique-preset',
      label: 'Migration strategy critique preset',
      tool: 'critique_rebuild_strategy',
      expectedOutcome: 'The first migration slice is critiqued before structural execution starts.',
      dependsOn: ['plan_rebuild_strategy'],
      args: {
        strategy_title: 'First migration slice',
      },
    },
  ];
}

function buildPremiumPageRolloutOperativeHandoffs(params: {
  premiumAssetId?: string;
  targetPageId?: number;
}): AdvancedWorkflowAction[] {
  return [
    {
      id: 'premium-inspect',
      label: 'Inspect the premium source asset first',
      tool: 'inspect_premium_library_asset',
      reason: 'The premium workflow should confirm the imported starting point before it is rolled out locally.',
      when: 'Use before import so the chosen asset is scenario-fit and support-aware.',
      exampleArgs: {
        asset_id: params.premiumAssetId ?? 'premium-service-section-stack',
      },
    },
    {
      id: 'premium-plan',
      label: 'Plan premium library usage',
      tool: 'plan_premium_library_usage',
      reason: 'The rollout should explain how the asset will be adapted before it touches the current page.',
      when: 'Use after inspection and before import or page update.',
      exampleArgs: {
        asset_id: params.premiumAssetId ?? 'premium-service-section-stack',
        target_page_id: params.targetPageId ?? 55,
      },
    },
    {
      id: 'premium-critique',
      label: 'Critique the output before broader rollout',
      tool: 'critique_elementor_output',
      reason: 'Premium starters still need quality review before becoming production-facing outcomes.',
      when: 'Use after local import or page update and before final publication.',
      exampleArgs: {
        source_type: params.targetPageId ? 'page' : 'template',
        source_id: params.targetPageId ?? 701,
      },
    },
  ];
}

function buildPremiumPageRolloutActionPresets(params: {
  premiumAssetId?: string;
  targetPageId?: number;
}): AdvancedWorkflowActionPreset[] {
  return [
    {
      id: 'premium-inspect-preset',
      label: 'Premium inspection preset',
      tool: 'inspect_premium_library_asset',
      expectedOutcome: 'The selected premium asset is validated as the right starting point before import.',
      dependsOn: ['list_premium_library_assets'],
      args: {
        asset_id: params.premiumAssetId ?? 'premium-service-section-stack',
      },
    },
    {
      id: 'premium-import-preset',
      label: 'Premium import preset',
      tool: 'import_premium_library_asset',
      expectedOutcome: 'The chosen premium asset is imported into the local Elementor Library for the current site.',
      dependsOn: ['inspect_premium_library_asset', 'plan_premium_library_usage'],
      args: {
        asset_id: params.premiumAssetId ?? 'premium-service-section-stack',
        title: 'Premium Rollout Import',
        status: 'draft',
      },
    },
    {
      id: 'premium-critique-preset',
      label: 'Premium critique preset',
      tool: 'critique_elementor_output',
      expectedOutcome: 'The imported premium result receives a quality verdict before wider rollout.',
      dependsOn: ['import_premium_library_asset'],
      args: {
        source_type: params.targetPageId ? 'page' : 'template',
        source_id: params.targetPageId ?? 701,
      },
    },
  ];
}

function buildThemeBuilderOperativeHandoffs(params: {
  premiumAssetId?: string;
  sourceTemplateId?: number;
  themeBuilderType?: string;
}): AdvancedWorkflowAction[] {
  return [
    {
      id: 'theme-capability-check',
      label: 'Confirm destination capability first',
      tool: 'get_destination_capabilities',
      reason: 'Theme Builder rollout should begin only when destination capability is truly available.',
      when: 'Use before choosing the structural source or activating site-wide rollout.',
      exampleArgs: {},
    },
    {
      id: 'theme-build-plan',
      label: 'Review the rebuild boundary',
      tool: 'plan_rebuild_strategy',
      reason: 'A stronger structural rollout should make the rebuild boundary explicit before template activation.',
      when: 'Use when the rollout source is not obviously safe or the structure change is broad.',
      exampleArgs: {
        intent: 'optimize-for-existing-destination',
      },
    },
    {
      id: 'theme-create',
      label: 'Create the Theme Builder template',
      tool: 'wizard_theme_builder',
      reason: 'The structural rollout should flow through the dedicated Theme Builder seam instead of ad hoc edits.',
      when: 'Use once capability and source are confirmed.',
      exampleArgs: {
        type: params.themeBuilderType ?? 'header',
        title: `Advanced ${params.themeBuilderType ?? 'header'} rollout`,
        source_template_id: params.sourceTemplateId ?? undefined,
      },
    },
  ];
}

function buildThemeBuilderActionPresets(params: {
  premiumAssetId?: string;
  sourceTemplateId?: number;
  themeBuilderType?: string;
}): AdvancedWorkflowActionPreset[] {
  return [
    {
      id: 'theme-capability-preset',
      label: 'Theme Builder capability preset',
      tool: 'get_destination_capabilities',
      expectedOutcome: 'The workflow knows whether structural rollout is truly supported before template creation.',
      dependsOn: [],
      args: {},
    },
    {
      id: 'theme-plan-preset',
      label: 'Theme Builder planning preset',
      tool: 'plan_rebuild_strategy',
      expectedOutcome: 'The rebuild boundary and rollout order are explicit before structural activation.',
      dependsOn: ['get_destination_capabilities'],
      args: {
        intent: 'optimize-for-existing-destination',
      },
    },
    {
      id: 'theme-create-preset',
      label: 'Theme Builder creation preset',
      tool: 'wizard_theme_builder',
      expectedOutcome: 'A site-wide structural template is created through the dedicated Theme Builder seam.',
      dependsOn: ['get_destination_capabilities'],
      args: {
        type: params.themeBuilderType ?? 'header',
        title: `Advanced ${params.themeBuilderType ?? 'header'} rollout`,
        source_template_id: params.sourceTemplateId ?? undefined,
        conditions: 'all',
      },
    },
  ];
}

function buildCritiqueRepairOperativeHandoffs(params: {
  sourceTemplateId?: number;
  targetPageId?: number;
}): AdvancedWorkflowAction[] {
  return [
    {
      id: 'repair-validate',
      label: 'Validate the current output first',
      tool: 'validate_elementor_write',
      reason: 'The critique loop should start from deterministic structural evidence.',
      when: 'Use before critique so the repair loop knows where the real risks are.',
      exampleArgs: {
        source_type: params.targetPageId ? 'page' : 'template',
        source_id: params.targetPageId ?? params.sourceTemplateId ?? 42,
      },
    },
    {
      id: 'repair-critique',
      label: 'Run critique and repair guidance',
      tool: 'critique_elementor_output',
      reason: 'Advanced should turn validation findings into deeper repair guidance before changes are queued.',
      when: 'Use after validation and before queuing higher-impact follow-up.',
      exampleArgs: {
        source_type: params.targetPageId ? 'page' : 'template',
        source_id: params.targetPageId ?? params.sourceTemplateId ?? 42,
      },
    },
    {
      id: 'repair-governance',
      label: 'Queue governed follow-up when needed',
      tool: 'queue_change',
      reason: 'Higher-impact repair work should be reviewable when the critique verdict is not solid.',
      when: 'Use after critique when the workflow should preserve approval or auditability.',
      exampleArgs: {
        operation: 'advanced_workflow_follow_up',
      },
    },
  ];
}

function buildCritiqueRepairActionPresets(params: {
  sourceTemplateId?: number;
  targetPageId?: number;
}): AdvancedWorkflowActionPreset[] {
  return [
    {
      id: 'repair-validate-preset',
      label: 'Validation preset',
      tool: 'validate_elementor_write',
      expectedOutcome: 'The repair loop starts from deterministic structural feedback.',
      dependsOn: [],
      args: {
        source_type: params.targetPageId ? 'page' : 'template',
        source_id: params.targetPageId ?? params.sourceTemplateId ?? 42,
      },
    },
    {
      id: 'repair-critique-preset',
      label: 'Critique preset',
      tool: 'critique_elementor_output',
      expectedOutcome: 'The output receives a repair-oriented quality verdict before broader changes are made.',
      dependsOn: ['validate_elementor_write'],
      args: {
        source_type: params.targetPageId ? 'page' : 'template',
        source_id: params.targetPageId ?? params.sourceTemplateId ?? 42,
      },
    },
    {
      id: 'repair-queue-preset',
      label: 'Governed follow-up preset',
      tool: 'queue_change',
      expectedOutcome: 'Higher-impact repair work remains reviewable and auditable.',
      dependsOn: ['critique_elementor_output'],
      args: {
        operation: 'advanced_workflow_follow_up',
      },
    },
  ];
}

export function buildAdvancedWorkflowPlan(params: {
  workflow: AdvancedWorkflowKind;
  assessment: SiteAssessment;
  context: SiteContext;
  capabilityMatrix: CapabilityMatrix;
  validationWarnings?: string[];
  premiumAssetId?: string;
  sourceTemplateId?: number;
  targetPageId?: number;
  themeBuilderType?: string;
}): AdvancedWorkflowPlan {
  const advancedReport = buildAdvancedRecommendationReport({
    assessment: params.assessment,
    context: params.context,
    fingerprint: {
      cms: 'wordpress',
      builder: params.capabilityMatrix.destination.elementorDetected ? 'elementor' : 'unknown',
      elementorDetected: params.capabilityMatrix.destination.elementorDetected,
      elementorPro: params.capabilityMatrix.destination.elementorPro,
      ecommerceDetected: params.assessment.plugins.woocommerce,
      multilingualDetected: params.assessment.plugins.multilingual,
      themeBuilderCoverage: 0,
      elementorPageCount: params.assessment.pages.elementor_total,
      confidence: 1,
      signals: [],
      notes: [],
    },
    capabilityMatrix: params.capabilityMatrix,
    validationWarnings: params.validationWarnings,
  });

  const foundationDependencies = advancedReport.foundationRecommendations.map(
    (recommendation) => recommendation.id,
  );
  const runtimePolicy = buildAdvancedRuntimePolicy({
    workflow: params.workflow,
    context: params.context,
  });

  if (params.workflow === 'premium-page-rollout') {
    return {
      workflow: params.workflow,
      title: 'Advanced premium page rollout',
      summary: 'Use the curated premium library as the starting point, then adapt and optionally deploy the imported structure onto the current site.',
      ...runtimePolicy,
      foundationDependencies,
      executionSteps: [
        params.premiumAssetId
          ? `Inspect and import premium asset ${params.premiumAssetId} into the local Elementor Library.`
          : 'Browse the premium catalog, inspect a suitable premium asset, and import it into the local Elementor Library.',
        params.targetPageId
          ? `Use the imported structure as the starting point for page ${params.targetPageId} on the current site.`
          : 'Use the imported structure as the starting point for a current-site page rollout.',
        'Run brand adaptation or creator-depth adjustments before final rollout.',
        'Validate and critique the output before final publication.',
      ],
      recommendedTools: [
        'list_premium_library_assets',
        'inspect_premium_library_asset',
        'plan_premium_library_usage',
        'import_premium_library_asset',
        'creator_mode',
        'update_page_data',
        'critique_elementor_output',
      ],
      guardrails: [
        'Keep the premium asset anchored to the local Elementor Library.',
        'Do not imply cloud sync or cross-site storage.',
        'Use critique before publishing high-visibility layouts.',
      ],
      notes: [
        'This is a stronger Advanced rollout path than Free creator_mode because it begins from curated premium starters.',
      ],
      operativeHandoffs: buildPremiumPageRolloutOperativeHandoffs(params),
      actionPresets: buildPremiumPageRolloutActionPresets(params),
      workflowApplications: buildWorkflowApplications({
        workflow: params.workflow,
        context: params.context,
      }),
      productivityLayer: buildProductivityLayer({
        workflow: params.workflow,
        context: params.context,
      }),
    };
  }

  if (params.workflow === 'deep-relaunch') {
    return {
      workflow: params.workflow,
      title: 'Advanced deep relaunch',
      summary: 'Move a relaunch beyond lite stabilization into a deliberate preservation, structural rollout, and critique path.',
      ...runtimePolicy,
      foundationDependencies,
      executionSteps: [
        params.targetPageId
          ? `Preserve the strongest current state from page ${params.targetPageId} before relaunch work moves deeper.`
          : 'Preserve the strongest current-state surfaces before relaunch work moves deeper.',
        'Use rebuild planning to define the first relaunch boundary instead of treating the whole site as one batch.',
        'Prepare the first structural rollout seam where the relaunch crosses from page-level work into site-wide delivery.',
        'Run critique and governed follow-up before broader activation.',
      ],
      recommendedTools: [
        'get_advanced_recommendations',
        'save_full_page_as_template',
        'plan_rebuild_strategy',
        'wizard_theme_builder',
        'critique_elementor_output',
        'queue_change',
      ],
      guardrails: [
        'Do not skip preservation before structural relaunch work begins.',
        'Keep the first relaunch slice explicit and reviewable.',
        'Hand off to governed follow-up when the critique verdict is not solid.',
      ],
      notes: [
        'Deep relaunch is the clearest workflow step up from Free relaunch-lite into a true Advanced structural path.',
      ],
      operativeHandoffs: buildDeepRelaunchOperativeHandoffs(params),
      actionPresets: buildDeepRelaunchActionPresets(params),
      workflowApplications: buildWorkflowApplications({
        workflow: params.workflow,
        context: params.context,
      }),
      productivityLayer: buildProductivityLayer({
        workflow: params.workflow,
        context: params.context,
      }),
    };
  }

  if (params.workflow === 'migration-rollout') {
    return {
      workflow: params.workflow,
      title: 'Advanced migration rollout',
      summary: 'Stage the first migration slice with explicit destination capability, rebuild planning, and structural target selection.',
      ...runtimePolicy,
      foundationDependencies,
      executionSteps: [
        'Confirm what the destination can actually support before migrating structure.',
        'Use rebuild planning and strategy critique to choose the first migration slice deliberately.',
        'Move the first structural slice through the dedicated Theme Builder seam or another bounded target surface.',
        'Validate and critique the migrated result before broader rollout.',
      ],
      recommendedTools: [
        'get_destination_capabilities',
        'plan_rebuild_strategy',
        'critique_rebuild_strategy',
        'wizard_theme_builder',
        'critique_elementor_output',
        'queue_change',
      ],
      guardrails: [
        'Do not treat migration as a one-shot conversion.',
        'Keep the first migration slice narrow and capability-aware.',
        'Use critique and governance before broader rollout.',
      ],
      notes: [
        'Migration becomes an Advanced workflow once the path needs stronger structural staging and review depth.',
      ],
      operativeHandoffs: buildMigrationOperativeHandoffs(params),
      actionPresets: buildMigrationActionPresets(params),
      workflowApplications: buildWorkflowApplications({
        workflow: params.workflow,
        context: params.context,
      }),
      productivityLayer: buildProductivityLayer({
        workflow: params.workflow,
        context: params.context,
      }),
    };
  }

  if (params.workflow === 'theme-builder-rollout') {
    const themeBuilderType = params.themeBuilderType ?? 'header';
    return {
      workflow: params.workflow,
      title: 'Advanced Theme Builder rollout',
      summary: 'Create site-wide structural delivery from an imported premium starter or an existing source template.',
      ...runtimePolicy,
      foundationDependencies,
      executionSteps: [
        hasCapability(params.capabilityMatrix, 'theme-builder')
          ? `Confirm Theme Builder capability, then prepare a ${themeBuilderType} rollout source.`
          : 'Resolve Theme Builder capability before attempting structural rollout.',
        params.premiumAssetId
          ? `Import premium asset ${params.premiumAssetId} and use it as the structural source for the ${themeBuilderType} template.`
          : params.sourceTemplateId
            ? `Use template ${params.sourceTemplateId} as the structural source for the ${themeBuilderType} template.`
            : `Choose a source template or premium asset for the ${themeBuilderType} rollout.`,
        `Create the ${themeBuilderType} Theme Builder template with the dedicated wizard or direct template creation seam.`,
        'Run validation and critique before broadening the structural rollout.',
      ],
      recommendedTools: [
        'get_destination_capabilities',
        'wizard_theme_builder',
        'plan_rebuild_strategy',
        'critique_rebuild_strategy',
        'critique_elementor_output',
        'queue_change',
      ],
      guardrails: [
        'Do not start Theme Builder rollout until destination capability is confirmed.',
        'Treat structural rollout as governed change for agencies or high-trust sites.',
        'Keep premium assets local-site operational after import.',
      ],
      notes: [
        'This workflow is the clearest structural separation between Free and Advanced.',
      ],
      operativeHandoffs: buildThemeBuilderOperativeHandoffs(params),
      actionPresets: buildThemeBuilderActionPresets(params),
      workflowApplications: buildWorkflowApplications({
        workflow: params.workflow,
        context: params.context,
      }),
      productivityLayer: buildProductivityLayer({
        workflow: params.workflow,
        context: params.context,
      }),
    };
  }

  return {
    workflow: params.workflow,
    title: 'Advanced critique and repair loop',
    summary: 'Use validation, critique, and governed follow-through to improve output quality before rollout.',
    ...runtimePolicy,
    foundationDependencies,
    executionSteps: [
      params.sourceTemplateId
        ? `Start from template ${params.sourceTemplateId} as the target of the critique loop.`
        : params.targetPageId
          ? `Start from page ${params.targetPageId} as the target of the critique loop.`
          : 'Choose the page or template that needs a deeper critique pass.',
      'Run validation to surface structural warnings and likely rollout risks.',
      'Generate critique and repair guidance before changing the live output.',
      'Queue or review significant fixes when the site or workflow requires stronger governance.',
    ],
    recommendedTools: [
      'validate_elementor_write',
      'critique_elementor_output',
      'queue_change',
      'review_change',
      'apply_change',
    ],
    guardrails: [
      'Do not skip validation when warnings already exist.',
      'Use governed change handling for high-impact structural fixes.',
      'Treat critique as an additive quality loop, not as a replacement for deterministic validation.',
    ],
    notes: [
      'This workflow makes Advanced feel safer and more disciplined than Free, not just more powerful.',
    ],
    operativeHandoffs: buildCritiqueRepairOperativeHandoffs(params),
    actionPresets: buildCritiqueRepairActionPresets(params),
    workflowApplications: buildWorkflowApplications({
      workflow: params.workflow,
      context: params.context,
    }),
    productivityLayer: buildProductivityLayer({
      workflow: params.workflow,
      context: params.context,
    }),
  };
}

export function buildAdvancedScenarioPlan(params: {
  scenario: AdvancedScenarioKind;
  assessment: SiteAssessment;
  context: SiteContext;
  capabilityMatrix: CapabilityMatrix;
  userPosture: 'guided' | 'assisted' | 'technical';
  targetSurface?: 'page' | 'theme-builder' | 'mixed';
  premiumAssetId?: string;
  sourceTemplateId?: number;
  targetPageId?: number;
  themeBuilderType?: string;
  preservationPriorities?: string[];
  constraints?: string[];
}): AdvancedScenarioPlan {
  const recommendedWorkflow: AdvancedWorkflowKind =
    params.scenario === 'deep-relaunch'
      ? 'deep-relaunch'
      : params.scenario === 'migration'
        ? 'migration-rollout'
        : params.scenario === 'premium-rollout'
          ? 'premium-page-rollout'
          : 'critique-repair-loop';

  const workflowPlan = buildAdvancedWorkflowPlan({
    workflow: recommendedWorkflow,
    assessment: params.assessment,
    context: params.context,
    capabilityMatrix: params.capabilityMatrix,
    premiumAssetId: params.premiumAssetId,
    sourceTemplateId: params.sourceTemplateId,
    targetPageId: params.targetPageId,
    themeBuilderType: params.themeBuilderType,
  });

  const supportingWorkflows: AdvancedWorkflowKind[] =
    params.scenario === 'deep-relaunch'
      ? ['theme-builder-rollout', 'critique-repair-loop']
      : params.scenario === 'migration'
        ? ['theme-builder-rollout', 'critique-repair-loop']
        : params.scenario === 'premium-rollout'
          ? ['critique-repair-loop']
          : [];

  const rationale = [
    params.scenario === 'deep-relaunch'
      ? 'This scenario goes beyond Free relaunch-lite and needs a deeper structural and critique-aware path.'
      : params.scenario === 'migration'
        ? 'This scenario needs a staged migration boundary rather than a flat tool-by-tool approach.'
        : params.scenario === 'premium-rollout'
          ? 'This scenario starts from a curated premium asset and should move through a stronger rollout path.'
          : 'This scenario starts from quality and repair pressure, so critique is the right primary workflow.',
    params.userPosture === 'technical'
      ? 'The operator posture allows a more direct workflow recommendation and fewer hand-holding steps.'
      : params.userPosture === 'assisted'
        ? 'The operator posture benefits from a branched but still guided advanced path.'
        : 'The operator posture still needs a clearly staged advanced path with explicit guardrails.',
    params.targetSurface === 'theme-builder'
      ? 'The target surface points toward structural rollout rather than page-only work.'
      : params.targetSurface === 'page'
        ? 'The target surface stays page-first, so the first advanced slice can remain closer to the current output.'
        : 'The scenario may cross between page-level and structural work, so the boundary must stay explicit.',
  ];

  const nextDecision =
    params.scenario === 'deep-relaunch'
      ? 'Choose the first relaunch slice that should move from preserved current state into deeper structural rollout.'
      : params.scenario === 'migration'
        ? 'Choose the first migration slice and whether it lands in a page, template, or Theme Builder target.'
        : params.scenario === 'premium-rollout'
          ? 'Choose whether the premium rollout should stay page-first or escalate into a structural target.'
          : 'Choose whether the critique outcome can be repaired directly or should become a governed follow-up.';

  return {
    scenario: params.scenario,
    title:
      params.scenario === 'deep-relaunch'
        ? 'Advanced Deep Relaunch Route'
        : params.scenario === 'migration'
          ? 'Advanced Migration Route'
          : params.scenario === 'premium-rollout'
            ? 'Advanced Premium Rollout Route'
            : 'Advanced Critique / Repair Route',
    summary:
      params.scenario === 'deep-relaunch'
        ? 'Enter Advanced through a preservation-aware deep relaunch path instead of a flat tool shelf.'
        : params.scenario === 'migration'
          ? 'Enter Advanced through a staged migration path with explicit destination and rollout boundaries.'
          : params.scenario === 'premium-rollout'
            ? 'Enter Advanced through a curated premium rollout path that remains local-site operational.'
            : 'Enter Advanced through a critique-first repair path that can escalate into governed follow-up.',
    projectProfileApplied: workflowPlan.projectProfileApplied,
    layoutRiskSignals: workflowPlan.layoutRiskSignals,
    riskResolutionMode: workflowPlan.riskResolutionMode,
    approvalMode: workflowPlan.approvalMode,
    recommendedWorkflow,
    supportingWorkflows,
    rationale,
    executionSteps: workflowPlan.executionSteps,
    recommendedTools: uniqueStrings([
      'get_advanced_recommendations',
      ...workflowPlan.recommendedTools,
    ]),
    guardrails: workflowPlan.guardrails,
    nextDecision,
    operativeHandoffs: workflowPlan.operativeHandoffs,
    actionPresets: workflowPlan.actionPresets,
    workflowApplications: workflowPlan.workflowApplications,
    productivityLayer: workflowPlan.productivityLayer,
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function buildAdvancedWorkflowExecutionOutcome(params: {
  sourceRef: string;
  importReport: ImportReport;
  recommendationReport: RecommendationEngineReport;
  critique: OutputCritique;
  queuedFollowUp?: Pick<QueuedChange, 'id' | 'status' | 'operation' | 'note'>;
  approvalQueued?: Pick<QueuedChange, 'id' | 'status' | 'operation' | 'note'>;
  executedActions: string[];
}): AdvancedWorkflowExecutionOutcome {
  return {
    executedActions: params.executedActions,
    qualityLoop: {
      sourceRef: params.sourceRef,
      importReport: params.importReport,
      recommendationReport: params.recommendationReport,
      critique: params.critique,
      queueRecommended: params.critique.verdict !== 'solid',
    },
    queuedFollowUp: params.queuedFollowUp,
    approvalQueued: params.approvalQueued,
  };
}
