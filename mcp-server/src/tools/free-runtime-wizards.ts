import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  ElementifyClient,
  IntentWizardInput,
  ProjectEditingMode,
  StackReadinessSignals,
} from '../client.js';
import {
  buildFreeRuntimeWizardPlan,
  buildExtensionLiteWizardPlan,
  buildNewSiteLiteWizardPlan,
  buildOptimizationLiteWizardPlan,
  buildRelaunchLiteWizardPlan,
  buildStackBootstrapWizardPlan,
  type FreeRuntimeWizardActionPreset,
  type FreeRuntimeWizardKind,
} from '../free-runtime-wizards.js';
import { deriveStackReadinessSignals, routeIntentWizard } from '../intent-wizard.js';
import { runBrandSetupWizard, runCreatorMode } from './wizard.js';

function normalizeList(values?: string[]): string[] {
  return values?.map((value) => value.trim()).filter(Boolean) ?? [];
}

type RuntimePlan =
  | ReturnType<typeof buildStackBootstrapWizardPlan>
  | ReturnType<typeof buildNewSiteLiteWizardPlan>
  | ReturnType<typeof buildOptimizationLiteWizardPlan>
  | ReturnType<typeof buildExtensionLiteWizardPlan>
  | ReturnType<typeof buildRelaunchLiteWizardPlan>;

type FreePresetRunnerResult = {
  status: 'preview' | 'executed' | 'blocked';
  summary: string;
  output?: string;
  followUps: string[];
  approvalItemId?: string;
  draftCreated?: boolean;
};

type FreeTransitionRunnerResult = {
  status: 'preview' | 'executed' | 'mixed' | 'blocked';
  summary: string;
  steps: Array<{
    presetId: string;
    label: string;
    tool: string;
    status: FreePresetRunnerResult['status'];
    summary: string;
    output?: string;
  }>;
  followUps: string[];
};

async function buildRuntimeInput(
  client: ElementifyClient | null,
  raw: {
    origin: IntentWizardInput['origin'];
    intent: IntentWizardInput['intent'];
    depth: IntentWizardInput['depth'];
    userPosture: IntentWizardInput['userPosture'];
    preservationPriorities?: string[];
    constraints?: string[];
    stackReadinessOverrides?: Partial<StackReadinessSignals>;
  },
): Promise<{
  input: IntentWizardInput;
  assessment: Awaited<ReturnType<ElementifyClient['assessSite']>> | null;
  context: Awaited<ReturnType<ElementifyClient['getSiteContext']>> | null;
}> {
  const [siteInfo, assessment, context] = client
    ? await Promise.all([client.getSiteInfo(), client.assessSite(), client.getSiteContext()])
    : [null, null, null];

  return {
    input: {
      origin: raw.origin,
      intent: raw.intent,
      depth: raw.depth,
      userPosture: raw.userPosture,
      preservationPriorities: normalizeList(raw.preservationPriorities),
      constraints: normalizeList(raw.constraints),
      stackReadiness: deriveStackReadinessSignals(siteInfo, assessment, raw.stackReadinessOverrides),
    },
    assessment,
    context,
  };
}

function renderPlanText(plan: RuntimePlan): string {
  const recommendationWarnings = plan.recommendationReport?.capabilityWarnings ?? [];

  return [
    `${plan.title} — ${plan.route.scenarioLabel}`,
    '',
    `Tier: ${plan.route.recommendedTier}`,
    `Routed wizard: ${plan.route.recommendedWizard}`,
    `Stack profile: ${plan.route.recommendedStackProfile.label} (${plan.route.recommendedStackProfile.id})`,
    `Skill profile: ${plan.route.recommendedSkillProfile.label} (${plan.route.recommendedSkillProfile.id})`,
    `Addon profile: ${plan.route.recommendedAddonProfile.label} (${plan.route.recommendedAddonProfile.id})`,
    `Approval mode: ${plan.approvalMode}`,
    `Risk resolution: ${plan.riskResolutionMode}`,
    '',
    plan.summary,
    '',
    '## Project Profile Applied',
    `- Editing mode: ${plan.projectProfileApplied.editing_mode}`,
    `- Copy density: ${plan.projectProfileApplied.copy_density}`,
    `- Layout priority: ${plan.projectProfileApplied.layout_priority}`,
    `- Change style: ${plan.projectProfileApplied.change_style}`,
    `- Question policy: ${plan.projectProfileApplied.question_policy}`,
    ...(plan.projectProfileApplied.notes ? [`- Notes: ${plan.projectProfileApplied.notes}`] : []),
    '',
    '## Layout Risk Signals',
    ...(plan.layoutRiskSignals.length > 0
      ? plan.layoutRiskSignals.flatMap((signal) => [
          `### ${signal.code}`,
          `Severity: ${signal.severity}`,
          `Affected surface: ${signal.affected_surface}`,
          `Reason: ${signal.reason}`,
          `Suggested handling: ${signal.suggested_handling}`,
          '',
        ])
      : ['- No deterministic layout risks flagged for this path.', '']),
    '## Immediate Actions',
    ...plan.immediateActions.map((item) => `- ${item}`),
    '',
    ...plan.phases.flatMap((phase) => ([
      `## ${phase.label}`,
      `Goal: ${phase.goal}`,
      phase.recommendationIds.length > 0 ? `Recommendation ids: ${phase.recommendationIds.join(', ')}` : undefined,
      'Suggested tools:',
      ...phase.suggestedTools.map((tool) => `- ${tool}`),
      phase.notes.length > 0 ? 'Notes:' : undefined,
      ...phase.notes.map((note) => `- ${note}`),
      '',
    ].filter(Boolean) as string[])),
    '## Handoffs',
    ...plan.handoffs.map((item) => `- ${item}`),
    '',
    '## Operative Handoffs',
    ...plan.operativeHandoffs.flatMap((handoff) => ([
      `### ${handoff.label}`,
      `Tool: ${handoff.tool}`,
      `When: ${handoff.when}`,
      `Why: ${handoff.reason}`,
      'Suggested call:',
      `\`${handoff.tool}(${JSON.stringify(handoff.exampleArgs)})\``,
      '',
    ])),
    '## Action Presets',
    ...plan.actionPresets.flatMap((preset) => ([
      `### ${preset.label}`,
      `Tool: ${preset.tool}`,
      `Expected outcome: ${preset.expectedOutcome}`,
      `Execution mode: ${preset.executionMode}`,
      preset.dependsOn.length > 0 ? `Depends on: ${preset.dependsOn.join(', ')}` : undefined,
      preset.executionNotes && preset.executionNotes.length > 0 ? 'Execution notes:' : undefined,
      ...(preset.executionNotes?.map((note) => `- ${note}`) ?? []),
      'Preset call:',
      `\`${preset.tool}(${JSON.stringify(preset.args)})\``,
      '',
    ].filter(Boolean) as string[])),
    '## Profile Applications',
    ...plan.profileApplications.flatMap((profile) => ([
      `### ${profile.layer}: ${profile.label}`,
      profile.summary,
      ...profile.actions.map((action) => `- ${action}`),
      '',
    ])),
    recommendationWarnings.length > 0 ? '' : undefined,
    recommendationWarnings.length > 0 ? '## Capability Warnings' : undefined,
    ...recommendationWarnings.map((warning) => `- ${warning}`),
    '',
    '## Guardrails',
    ...plan.route.guardrails.map((guardrail) => `- ${guardrail}`),
    '',
    `Next decision: ${plan.route.nextDecision}`,
    plan.upgradeSignal ? '' : undefined,
    plan.upgradeSignal ? `Upgrade signal: ${plan.upgradeSignal}` : undefined,
  ].filter(Boolean).join('\n');
}

function wizardKindToLabel(kind: FreeRuntimeWizardKind): string {
  switch (kind) {
    case 'stack-bootstrap':
      return 'Stack Bootstrap Wizard';
    case 'new-site-lite':
      return 'New Site Lite Wizard';
    case 'optimization-lite':
      return 'Optimization Lite Wizard';
    case 'extension-lite':
      return 'Extension Lite Wizard';
    case 'relaunch-lite':
      return 'Relaunch Lite Wizard';
  }
}

function findPreset(plan: RuntimePlan, presetId: string): FreeRuntimeWizardActionPreset | null {
  return plan.actionPresets.find((preset) => preset.id === presetId) ?? null;
}

function getTransitionPresetIds(kind: FreeRuntimeWizardKind): string[] {
  switch (kind) {
    case 'stack-bootstrap':
      return [
        'bootstrap-context-preset',
        'bootstrap-brand-setup',
        'bootstrap-creator-light',
      ];
    case 'new-site-lite':
      return [];
    case 'optimization-lite':
      return [
        'optimization-explain-recommendation',
        'optimization-brand-setup',
        'optimization-creator-light',
      ];
    case 'extension-lite':
    case 'relaunch-lite':
      return [];
  }
}

async function runFreePresetExecution(params: {
  client: ElementifyClient | null;
  preset: FreeRuntimeWizardActionPreset;
  mode: 'preview' | 'execute';
  writeMode: ProjectEditingMode;
}): Promise<FreePresetRunnerResult> {
  const { client, preset, mode, writeMode } = params;

  if (mode === 'preview') {
    return {
      status: 'preview',
      summary: 'Preset preview only. No underlying tool was executed.',
      followUps: [
        'Review the preset call and its dependencies first.',
        preset.executionMode === 'safe_execute'
          ? 'This preset can be executed directly once you are ready.'
          : 'This preset intentionally stays preview-only right now.',
      ],
    };
  }

  if (preset.executionMode !== 'safe_execute') {
    return {
      status: 'blocked',
      summary: 'This preset is intentionally preview-only and cannot be executed directly.',
      followUps: preset.executionNotes ?? [
        'Review the preset call manually and continue through the guided wizard flow.',
      ],
    };
  }

  if (!client) {
    return {
      status: 'blocked',
      summary: 'Execution needs a site_id because this preset requires a live client.',
      followUps: ['Run the preset again with a configured site_id.'],
    };
  }

  if (writeMode === 'approval-first' && preset.tool === 'set_site_context') {
    const beforeState = await client.getSiteContext();
    const change = await client.createChange({
      operation: 'set_site_context',
      params: preset.args as Record<string, unknown>,
      note: `Approval-first preset: ${preset.label}`,
      before_state: beforeState as unknown as Record<string, unknown>,
    });

    return {
      status: 'executed',
      summary: 'The preset was routed into the approval queue instead of writing live.',
      output: [
        '🟡 Approval item created from preset.',
        '',
        `  Change ID: ${change.id}`,
        `  Status:    ${change.status}`,
        `  Operation: ${change.operation}`,
      ].join('\n'),
      followUps: [
        'Review the queued change before applying it live.',
        'Use list_change_queue to inspect the pending approval item.',
      ],
      approvalItemId: change.id,
    };
  }

  switch (preset.tool) {
    case 'set_site_context': {
      const saved = await client.setSiteContext(preset.args);
      const text = [
        '✅ Site context saved from preset.',
        '',
        `  User role:       ${saved.user_role ?? '—'}`,
        `  Site purpose:    ${saved.site_purpose ?? '—'}`,
        `  Target audience: ${saved.target_audience ?? '—'}`,
        `  Language:        ${saved.primary_language ?? '—'}`,
      ].join('\n');

      return {
        status: 'executed',
        summary: 'The bootstrap context preset was executed successfully.',
        output: text,
        followUps: ['Run get_recommendations next so the stored context can shape the guidance.'],
      };
    }
    case 'wizard_brand_setup': {
      const result = await runBrandSetupWizard(client, {
        auto_execute: false,
        ...(preset.args as Parameters<typeof runBrandSetupWizard>[1]),
      });

      return {
        status: 'executed',
        summary: 'The preset executed the Brand Setup Wizard in dry-run mode.',
        output: result.text,
        followUps: [
          'Review the dry-run output before deciding on any real brand writes.',
          'Use creator_mode next if the brand baseline looks good enough for a first build pass.',
        ],
        draftCreated: writeMode === 'draft-first',
      };
    }
    case 'creator_mode': {
      const result = await runCreatorMode(
        client,
        preset.args as unknown as Parameters<typeof runCreatorMode>[1],
      );

      return {
        status: result.isError ? 'blocked' : 'executed',
        summary: result.isError
          ? 'The preset could not be executed because the Creator Mode input is incomplete.'
          : 'The preset executed Creator Mode in dry-run mode.',
        output: result.text,
        followUps: result.isError
          ? ['Adjust the preset inputs and try again.']
          : [
              'Use the dry-run matches to decide whether to create a real draft or refine the library first.',
            ],
        draftCreated: !result.isError && writeMode === 'draft-first',
      };
    }
    default:
      return {
        status: 'blocked',
        summary: `Preset execution for ${preset.tool} is not enabled yet.`,
        followUps: [
          'Use preview mode for this preset.',
          'Keep this step inside the guided wizard path until a safe execution helper exists.',
        ],
      };
  }
}

async function runFreeGuidedTransition(params: {
  client: ElementifyClient | null;
  plan: RuntimePlan;
  mode: 'preview' | 'execute';
  writeMode: ProjectEditingMode;
}): Promise<FreeTransitionRunnerResult> {
  const presetIds = getTransitionPresetIds(params.plan.kind);
  const presets = presetIds
    .map((presetId) => findPreset(params.plan, presetId))
    .filter((preset): preset is FreeRuntimeWizardActionPreset => Boolean(preset));

  const steps: FreeTransitionRunnerResult['steps'] = [];

  for (const preset of presets) {
    const effectiveMode =
      params.mode === 'execute' && preset.executionMode === 'safe_execute'
        ? 'execute'
        : 'preview';

    const result = await runFreePresetExecution({
      client: params.client,
      preset,
      mode: effectiveMode,
      writeMode: params.writeMode,
    });

    steps.push({
      presetId: preset.id,
      label: preset.label,
      tool: preset.tool,
      status: result.status,
      summary: result.summary,
      output: result.output,
    });
  }

  const statuses = new Set(steps.map((step) => step.status));
  const status =
    statuses.size === 1 && statuses.has('preview')
      ? 'preview'
      : statuses.size === 1 && statuses.has('executed')
        ? 'executed'
        : steps.some((step) => step.status === 'executed')
          ? 'mixed'
          : steps.some((step) => step.status === 'blocked')
            ? 'blocked'
            : 'preview';

  return {
    status,
    summary:
      params.mode === 'preview'
        ? 'Transition preview assembled. No safe steps were executed.'
        : status === 'mixed'
          ? 'Safe steps were executed and preview-only steps stayed in preview mode.'
          : status === 'executed'
            ? 'All transition steps executed successfully.'
            : 'The transition could not complete as an executable guided path.',
    steps,
    followUps:
      params.plan.kind === 'stack-bootstrap'
        ? [
            'Review the brand dry run and creator dry run together before any real writes.',
            'If the first build path looks right, keep the next execution step inside Creator Light.',
          ]
        : params.plan.kind === 'optimization-lite'
          ? [
              'Use the explained recommendation as the named bottleneck for the next optimization pass.',
              'Keep the first real changes limited and validate after each write.',
            ]
          : [
              'Treat this as a preservation-aware review path first.',
              'Move to Advanced once the relaunch no longer fits lite scope.',
            ],
  };
}

async function buildRuntimePlanForKind(
  client: ElementifyClient | null,
  raw: {
    kind: FreeRuntimeWizardKind;
    origin: IntentWizardInput['origin'];
    intent?: IntentWizardInput['intent'];
    depth: IntentWizardInput['depth'];
    userPosture: IntentWizardInput['userPosture'];
    preservationPriorities?: string[];
    constraints?: string[];
    stackReadinessOverrides?: Partial<StackReadinessSignals>;
  },
): Promise<RuntimePlan> {
  const runtime = await buildRuntimeInput(client, {
    origin: raw.origin,
    intent: raw.kind === 'stack-bootstrap'
      ? 'bootstrap'
      : raw.kind === 'new-site-lite'
        ? 'bootstrap'
      : raw.kind === 'optimization-lite'
        ? (raw.intent ?? 'optimization')
        : raw.kind === 'extension-lite'
          ? 'extension'
        : 'relaunch',
    depth: raw.depth,
    userPosture: raw.userPosture,
    preservationPriorities: raw.preservationPriorities,
    constraints: raw.constraints,
    stackReadinessOverrides: raw.stackReadinessOverrides,
  });
  const route = routeIntentWizard(runtime.input);

  return buildFreeRuntimeWizardPlan({
    kind: raw.kind,
    route,
    assessment: runtime.assessment,
    context: runtime.context,
  });
}

function resolveWriteMode(
  plan: RuntimePlan,
  override?: ProjectEditingMode,
): ProjectEditingMode {
  return override ?? plan.approvalMode;
}

function renderPresetExecutionText(params: {
  plan: RuntimePlan;
  preset: FreeRuntimeWizardActionPreset;
  mode: 'preview' | 'execute';
  result: FreePresetRunnerResult;
  writeMode: ProjectEditingMode;
}): string {
  const { plan, preset, mode, result, writeMode } = params;

  return [
    `${wizardKindToLabel(plan.kind)} — ${preset.label}`,
    '',
    `Mode: ${mode.toUpperCase()}`,
    `Write mode: ${writeMode}`,
    `Status: ${result.status}`,
    `Tool: ${preset.tool}`,
    `Execution mode: ${preset.executionMode}`,
    '',
    preset.expectedOutcome,
    '',
    preset.dependsOn.length > 0 ? `Depends on: ${preset.dependsOn.join(', ')}` : undefined,
    preset.executionNotes && preset.executionNotes.length > 0 ? 'Execution notes:' : undefined,
    ...(preset.executionNotes?.map((note) => `- ${note}`) ?? []),
    '',
    `Preset call: \`${preset.tool}(${JSON.stringify(preset.args)})\``,
    '',
    `Summary: ${result.summary}`,
    result.approvalItemId ? `Approval item: ${result.approvalItemId}` : undefined,
    result.draftCreated ? 'Draft/staged output: yes' : undefined,
    result.output ? '' : undefined,
    result.output ? '## Output' : undefined,
    result.output ?? undefined,
    '',
    '## Follow-ups',
    ...result.followUps.map((followUp) => `- ${followUp}`),
  ].filter(Boolean).join('\n');
}

function renderTransitionExecutionText(params: {
  plan: RuntimePlan;
  mode: 'preview' | 'execute';
  result: FreeTransitionRunnerResult;
  writeMode: ProjectEditingMode;
}): string {
  const { plan, mode, result, writeMode } = params;

  return [
    `${wizardKindToLabel(plan.kind)} — Guided Transition`,
    '',
    `Mode: ${mode.toUpperCase()}`,
    `Write mode: ${writeMode}`,
    `Status: ${result.status}`,
    '',
    plan.summary,
    '',
    `Summary: ${result.summary}`,
    '',
    '## Transition Steps',
    ...result.steps.flatMap((step) => ([
      `### ${step.label}`,
      `Preset: ${step.presetId}`,
      `Tool: ${step.tool}`,
      `Status: ${step.status}`,
      step.summary,
      step.output ? '' : undefined,
      step.output ? 'Output:' : undefined,
      step.output,
      '',
    ].filter(Boolean) as string[])),
    '## Follow-ups',
    ...result.followUps.map((followUp) => `- ${followUp}`),
  ].filter(Boolean).join('\n');
}

export function registerFreeRuntimeWizardTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  server.tool(
    'wizard_new_site_lite',
    'Run the Free runtime new-site-lite wizard. It turns an idea or brand starting point into a clear baseline, first foundation step, and first Elementor draft path.',
    {
      site_id: z.string().optional(),
      starting_point: z.enum([
        'idea_only',
        'brand_without_site',
      ]),
      user_posture: z.enum(['guided', 'assisted', 'technical']).default('guided'),
      depth: z.enum(['light', 'moderate']).default('moderate'),
      constraints: z.array(z.string()).optional(),
      preservation_priorities: z.array(z.string()).optional(),
      wordpress_present: z.boolean().optional(),
      elementor_installed: z.boolean().optional(),
      elementor_pro_installed: z.boolean().optional(),
      hello_theme_installed: z.boolean().nullable().optional(),
      current_theme: z.string().nullable().optional(),
      known_addons: z.array(z.string()).optional(),
    },
    async ({
      site_id,
      starting_point,
      user_posture,
      depth,
      constraints,
      preservation_priorities,
      wordpress_present,
      elementor_installed,
      elementor_pro_installed,
      hello_theme_installed,
      current_theme,
      known_addons,
    }) => {
      const client = site_id ? getClient(site_id) : null;
      const runtime = await buildRuntimeInput(client, {
        origin: starting_point as IntentWizardInput['origin'],
        intent: 'bootstrap',
        depth: depth as IntentWizardInput['depth'],
        userPosture: user_posture as IntentWizardInput['userPosture'],
        preservationPriorities: preservation_priorities,
        constraints,
        stackReadinessOverrides: {
          wordpressPresent: wordpress_present,
          elementorInstalled: elementor_installed,
          elementorProInstalled: elementor_pro_installed,
          helloThemeInstalled: hello_theme_installed ?? undefined,
          currentTheme: current_theme ?? undefined,
          knownAddons: known_addons,
        },
      });
      const route = routeIntentWizard(runtime.input);
      const plan = buildNewSiteLiteWizardPlan({
        route,
        assessment: runtime.assessment,
        context: runtime.context,
      });

      return {
        content: [{ type: 'text', text: renderPlanText(plan) }],
      };
    },
  );

  server.tool(
    'wizard_stack_bootstrap',
    'Run the first concrete Free runtime wizard for bootstrap scenarios. It turns intent routing plus live site signals into phased baseline, foundation, and first-build handoffs.',
    {
      site_id: z.string().optional(),
      starting_point: z.enum([
        'idea_only',
        'brand_without_site',
        'wordpress_without_elementor',
        'partial_stack',
      ]),
      user_posture: z.enum(['guided', 'assisted', 'technical']).default('guided'),
      depth: z.enum(['light', 'moderate', 'deep']).default('moderate'),
      constraints: z.array(z.string()).optional(),
      preservation_priorities: z.array(z.string()).optional(),
      wordpress_present: z.boolean().optional(),
      elementor_installed: z.boolean().optional(),
      elementor_pro_installed: z.boolean().optional(),
      hello_theme_installed: z.boolean().nullable().optional(),
      current_theme: z.string().nullable().optional(),
      known_addons: z.array(z.string()).optional(),
    },
    async ({
      site_id,
      starting_point,
      user_posture,
      depth,
      constraints,
      preservation_priorities,
      wordpress_present,
      elementor_installed,
      elementor_pro_installed,
      hello_theme_installed,
      current_theme,
      known_addons,
    }) => {
      const client = site_id ? getClient(site_id) : null;
      const runtime = await buildRuntimeInput(client, {
        origin: starting_point as IntentWizardInput['origin'],
        intent: 'bootstrap',
        depth: depth as IntentWizardInput['depth'],
        userPosture: user_posture as IntentWizardInput['userPosture'],
        preservationPriorities: preservation_priorities,
        constraints,
        stackReadinessOverrides: {
          wordpressPresent: wordpress_present,
          elementorInstalled: elementor_installed,
          elementorProInstalled: elementor_pro_installed,
          helloThemeInstalled: hello_theme_installed ?? undefined,
          currentTheme: current_theme ?? undefined,
          knownAddons: known_addons,
        },
      });
      const route = routeIntentWizard(runtime.input);
      const plan = buildStackBootstrapWizardPlan({
        route,
        assessment: runtime.assessment,
        context: runtime.context,
      });

      return {
        content: [{ type: 'text', text: renderPlanText(plan) }],
      };
    },
  );

  server.tool(
    'run_free_wizard_preset',
    'Preview or safely execute a supported Free runtime wizard preset. This is a limited guided-execution helper for the new Free scenario-first wizard families and only executes presets that are explicitly marked safe.',
    {
      site_id: z.string().optional(),
      wizard: z.enum(['stack-bootstrap', 'new-site-lite', 'optimization-lite', 'extension-lite', 'relaunch-lite']),
      preset_id: z.string(),
      mode: z.enum(['preview', 'execute']).default('preview'),
      write_mode: z.enum(['direct-edit', 'draft-first', 'approval-first']).optional(),
      starting_point: z.enum([
        'idea_only',
        'brand_without_site',
        'wordpress_without_elementor',
        'partial_stack',
      ]).optional(),
      user_posture: z.enum(['guided', 'assisted', 'technical']).default('guided'),
      depth: z.enum(['light', 'moderate', 'deep']).default('moderate'),
      constraints: z.array(z.string()).optional(),
      preservation_priorities: z.array(z.string()).optional(),
      wordpress_present: z.boolean().optional(),
      elementor_installed: z.boolean().optional(),
      elementor_pro_installed: z.boolean().optional(),
      hello_theme_installed: z.boolean().nullable().optional(),
      current_theme: z.string().nullable().optional(),
      known_addons: z.array(z.string()).optional(),
    },
    async ({
      site_id,
      wizard,
      preset_id,
      mode,
      write_mode,
      starting_point,
      user_posture,
      depth,
      constraints,
      preservation_priorities,
      wordpress_present,
      elementor_installed,
      elementor_pro_installed,
      hello_theme_installed,
      current_theme,
      known_addons,
    }) => {
      if ((wizard === 'stack-bootstrap' || wizard === 'new-site-lite') && !starting_point) {
        return {
          content: [{ type: 'text', text: `${wizard} presets require starting_point.` }],
          isError: true,
        };
      }

      const client = site_id ? getClient(site_id) : null;
      const plan = await buildRuntimePlanForKind(client, {
        kind: wizard as FreeRuntimeWizardKind,
        origin: (starting_point ?? 'existing_elementor_site') as IntentWizardInput['origin'],
        intent: wizard === 'optimization-lite'
          ? 'optimization'
          : wizard === 'extension-lite'
            ? 'extension'
            : undefined,
        depth: depth as IntentWizardInput['depth'],
        userPosture: user_posture as IntentWizardInput['userPosture'],
        preservationPriorities: preservation_priorities,
        constraints,
        stackReadinessOverrides: {
          wordpressPresent: wordpress_present,
          elementorInstalled: elementor_installed,
          elementorProInstalled: elementor_pro_installed,
          helloThemeInstalled: hello_theme_installed ?? undefined,
          currentTheme: current_theme ?? undefined,
          knownAddons: known_addons,
        },
      });

      const preset = findPreset(plan, preset_id);
      if (!preset) {
        return {
          content: [{
            type: 'text',
            text: [
              `Unknown preset "${preset_id}" for ${wizard}.`,
              '',
              'Known presets:',
              ...plan.actionPresets.map((candidate) => `- ${candidate.id}`),
            ].join('\n'),
          }],
          isError: true,
        };
      }

      const result = await runFreePresetExecution({
        client,
        preset,
        mode,
        writeMode: resolveWriteMode(plan, write_mode as ProjectEditingMode | undefined),
      });

      return {
        content: [{
          type: 'text',
          text: renderPresetExecutionText({
            plan,
            preset,
            mode,
            result,
            writeMode: resolveWriteMode(plan, write_mode as ProjectEditingMode | undefined),
          }),
        }],
        isError: result.status === 'blocked' && mode === 'execute',
      };
    },
  );

  server.tool(
    'run_free_guided_transition',
    'Run a short scenario-aware Free guided transition for the most important early paths. This chains safe presets and keeps preview-only steps visible without executing them.',
    {
      site_id: z.string().optional(),
      wizard: z.enum(['stack-bootstrap', 'optimization-lite']),
      mode: z.enum(['preview', 'execute']).default('preview'),
      write_mode: z.enum(['direct-edit', 'draft-first', 'approval-first']).optional(),
      starting_point: z.enum([
        'idea_only',
        'brand_without_site',
        'wordpress_without_elementor',
        'partial_stack',
      ]).optional(),
      user_posture: z.enum(['guided', 'assisted', 'technical']).default('guided'),
      depth: z.enum(['light', 'moderate', 'deep']).default('moderate'),
      constraints: z.array(z.string()).optional(),
      preservation_priorities: z.array(z.string()).optional(),
      wordpress_present: z.boolean().optional(),
      elementor_installed: z.boolean().optional(),
      elementor_pro_installed: z.boolean().optional(),
      hello_theme_installed: z.boolean().nullable().optional(),
      current_theme: z.string().nullable().optional(),
      known_addons: z.array(z.string()).optional(),
    },
    async ({
      site_id,
      wizard,
      mode,
      write_mode,
      starting_point,
      user_posture,
      depth,
      constraints,
      preservation_priorities,
      wordpress_present,
      elementor_installed,
      elementor_pro_installed,
      hello_theme_installed,
      current_theme,
      known_addons,
    }) => {
      if (wizard === 'stack-bootstrap' && !starting_point) {
        return {
          content: [{ type: 'text', text: 'stack-bootstrap guided transitions require starting_point.' }],
          isError: true,
        };
      }

      const client = site_id ? getClient(site_id) : null;
      const plan = await buildRuntimePlanForKind(client, {
        kind: wizard as FreeRuntimeWizardKind,
        origin: (starting_point ?? 'existing_elementor_site') as IntentWizardInput['origin'],
        depth: depth as IntentWizardInput['depth'],
        userPosture: user_posture as IntentWizardInput['userPosture'],
        preservationPriorities: preservation_priorities,
        constraints,
        stackReadinessOverrides: {
          wordpressPresent: wordpress_present,
          elementorInstalled: elementor_installed,
          elementorProInstalled: elementor_pro_installed,
          helloThemeInstalled: hello_theme_installed ?? undefined,
          currentTheme: current_theme ?? undefined,
          knownAddons: known_addons,
        },
      });

      const result = await runFreeGuidedTransition({
        client,
        plan,
        mode,
        writeMode: resolveWriteMode(plan, write_mode as ProjectEditingMode | undefined),
      });

      return {
        content: [{
          type: 'text',
          text: renderTransitionExecutionText({
            plan,
            mode,
            result,
            writeMode: resolveWriteMode(plan, write_mode as ProjectEditingMode | undefined),
          }),
        }],
        isError: result.status === 'blocked' && mode === 'execute',
      };
    },
  );

  server.tool(
    'wizard_extension_lite',
    'Run the Free runtime extension-lite wizard. It scopes a new capability narrowly, stabilizes the baseline, and guides the first extension draft without uncontrolled addon growth.',
    {
      site_id: z.string().optional(),
      depth: z.enum(['light', 'moderate']).default('moderate'),
      user_posture: z.enum(['guided', 'assisted', 'technical']).default('assisted'),
      preservation_priorities: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      elementor_installed: z.boolean().optional(),
      elementor_pro_installed: z.boolean().optional(),
      hello_theme_installed: z.boolean().nullable().optional(),
      current_theme: z.string().nullable().optional(),
      known_addons: z.array(z.string()).optional(),
    },
    async ({
      site_id,
      depth,
      user_posture,
      preservation_priorities,
      constraints,
      elementor_installed,
      elementor_pro_installed,
      hello_theme_installed,
      current_theme,
      known_addons,
    }) => {
      const client = site_id ? getClient(site_id) : null;
      const runtime = await buildRuntimeInput(client, {
        origin: 'existing_elementor_site',
        intent: 'extension',
        depth: depth as IntentWizardInput['depth'],
        userPosture: user_posture as IntentWizardInput['userPosture'],
        preservationPriorities: preservation_priorities,
        constraints,
        stackReadinessOverrides: {
          elementorInstalled: elementor_installed,
          elementorProInstalled: elementor_pro_installed,
          helloThemeInstalled: hello_theme_installed ?? undefined,
          currentTheme: current_theme ?? undefined,
          knownAddons: known_addons,
        },
      });
      const route = routeIntentWizard(runtime.input);
      const plan = buildExtensionLiteWizardPlan({
        route,
        assessment: runtime.assessment,
        context: runtime.context,
      });

      return {
        content: [{ type: 'text', text: renderPlanText(plan) }],
      };
    },
  );

  server.tool(
    'wizard_relaunch_lite',
    'Run the first concrete Free runtime relaunch-lite wizard. It keeps preservation priorities explicit, starts with low-risk uplift, and marks the boundary where Advanced should take over.',
    {
      site_id: z.string().optional(),
      depth: z.enum(['light', 'moderate']).default('moderate'),
      user_posture: z.enum(['guided', 'assisted', 'technical']).default('assisted'),
      preservation_priorities: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      elementor_installed: z.boolean().optional(),
      elementor_pro_installed: z.boolean().optional(),
      hello_theme_installed: z.boolean().nullable().optional(),
      current_theme: z.string().nullable().optional(),
      known_addons: z.array(z.string()).optional(),
    },
    async ({
      site_id,
      depth,
      user_posture,
      preservation_priorities,
      constraints,
      elementor_installed,
      elementor_pro_installed,
      hello_theme_installed,
      current_theme,
      known_addons,
    }) => {
      const client = site_id ? getClient(site_id) : null;
      const runtime = await buildRuntimeInput(client, {
        origin: 'existing_elementor_site',
        intent: 'relaunch',
        depth: depth as IntentWizardInput['depth'],
        userPosture: user_posture as IntentWizardInput['userPosture'],
        preservationPriorities: preservation_priorities,
        constraints,
        stackReadinessOverrides: {
          elementorInstalled: elementor_installed,
          elementorProInstalled: elementor_pro_installed,
          helloThemeInstalled: hello_theme_installed ?? undefined,
          currentTheme: current_theme ?? undefined,
          knownAddons: known_addons,
        },
      });
      const route = routeIntentWizard(runtime.input);
      const plan = buildRelaunchLiteWizardPlan({
        route,
        assessment: runtime.assessment,
        context: runtime.context,
      });

      return {
        content: [{ type: 'text', text: renderPlanText(plan) }],
      };
    },
  );

  server.tool(
    'wizard_optimization_lite',
    'Run the first concrete Free runtime optimization-lite wizard. It turns recommendations and current-state signals into a phased low-risk optimization loop with handoffs into Creator Light when useful.',
    {
      site_id: z.string().optional(),
      depth: z.enum(['light', 'moderate']).default('moderate'),
      user_posture: z.enum(['guided', 'assisted', 'technical']).default('guided'),
      preservation_priorities: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      elementor_installed: z.boolean().optional(),
      elementor_pro_installed: z.boolean().optional(),
      hello_theme_installed: z.boolean().nullable().optional(),
      current_theme: z.string().nullable().optional(),
      known_addons: z.array(z.string()).optional(),
    },
    async ({
      site_id,
      depth,
      user_posture,
      preservation_priorities,
      constraints,
      elementor_installed,
      elementor_pro_installed,
      hello_theme_installed,
      current_theme,
      known_addons,
    }) => {
      const client = site_id ? getClient(site_id) : null;
      const runtime = await buildRuntimeInput(client, {
        origin: 'existing_elementor_site',
        intent: 'optimization',
        depth: depth as IntentWizardInput['depth'],
        userPosture: user_posture as IntentWizardInput['userPosture'],
        preservationPriorities: preservation_priorities,
        constraints,
        stackReadinessOverrides: {
          elementorInstalled: elementor_installed,
          elementorProInstalled: elementor_pro_installed,
          helloThemeInstalled: hello_theme_installed ?? undefined,
          currentTheme: current_theme ?? undefined,
          knownAddons: known_addons,
        },
      });
      const route = routeIntentWizard(runtime.input);
      const plan = buildOptimizationLiteWizardPlan({
        route,
        assessment: runtime.assessment,
        context: runtime.context,
      });

      return {
        content: [{ type: 'text', text: renderPlanText(plan) }],
      };
    },
  );
}
