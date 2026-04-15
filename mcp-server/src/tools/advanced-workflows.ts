import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient, ProjectEditingMode } from '../client.js';
import { buildCapabilityMatrix } from '../destination.js';
import { resolveElementorSource } from '../elementor-source.js';
import { buildSiteFingerprint } from '../fingerprint.js';
import {
  buildAdvancedWorkflowExecutionOutcome,
  buildAdvancedScenarioPlan,
  buildAdvancedWorkflowPlan,
} from '../advanced-workflows.js';
import { critiqueElementorOutput } from '../output-critique.js';
import { buildPremiumLibraryImportInput } from '../premium-library.js';
import { buildRecommendationReport } from '../recommendations.js';
import { buildImportReport } from '../validation.js';

function hasAvailableCapability(
  capabilityMatrix: ReturnType<typeof buildCapabilityMatrix>,
  capabilityId: string,
): boolean {
  return capabilityMatrix.capabilities.some(
    (capability) => capability.id === capabilityId && capability.available,
  );
}

function resolveWriteMode(
  approvalMode: ProjectEditingMode,
  override?: ProjectEditingMode,
): ProjectEditingMode {
  return override ?? approvalMode;
}

export function registerAdvancedWorkflowTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  server.tool(
    'route_advanced_scenario',
    'Route a deeper Advanced scenario into the right private workflow path. This is the scenario-first front door for Advanced, mapping deep relaunch, migration, premium rollout, and critique/repair intent into the next operational workflow instead of exposing a flat tool shelf.',
    {
      site_id: z.string().optional(),
      scenario: z.enum(['deep-relaunch', 'migration', 'premium-rollout', 'critique-repair'])
        .describe('Advanced scenario family to route'),
      user_posture: z.enum(['guided', 'assisted', 'technical']).optional().default('assisted')
        .describe('Operator posture for the recommended Advanced path'),
      target_surface: z.enum(['page', 'theme-builder', 'mixed']).optional().default('mixed')
        .describe('Primary target surface for the next Advanced slice'),
      premium_asset_id: z.string().optional()
        .describe('Optional premium asset identifier for premium-rollout routing'),
      source_template_id: z.number().int().optional()
        .describe('Optional local source template for deep relaunch, migration, or critique routing'),
      target_page_id: z.number().int().optional()
        .describe('Optional target page id when the next Advanced slice remains page-first'),
      theme_builder_type: z.enum(['header', 'footer', 'single', 'single-post', 'single-page', 'archive', 'search', 'error-404', 'popup'])
        .optional()
        .describe('Optional structural rollout type when the route may cross into Theme Builder'),
      preservation_priorities: z.array(z.string()).optional()
        .describe('Optional preservation priorities that should stay explicit in the route'),
      constraints: z.array(z.string()).optional()
        .describe('Optional constraints that should shape the recommended path'),
      write_mode: z.enum(['direct-edit', 'draft-first', 'approval-first']).optional()
        .describe('Optional override for how Advanced should route writes for this scenario'),
    },
    async ({
      site_id,
      scenario,
      user_posture,
      target_surface,
      premium_asset_id,
      source_template_id,
      target_page_id,
      theme_builder_type,
      preservation_priorities,
      constraints,
      write_mode,
    }) => {
      const client = getClient(site_id);
      const [assessment, context] = await Promise.all([
        client.assessSite(),
        client.getSiteContext(),
      ]);
      const fingerprint = buildSiteFingerprint(assessment);
      const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);
      const plan = buildAdvancedScenarioPlan({
        scenario,
        assessment,
        context,
        capabilityMatrix,
        userPosture: user_posture,
        targetSurface: target_surface,
        premiumAssetId: premium_asset_id,
        sourceTemplateId: source_template_id,
        targetPageId: target_page_id,
        themeBuilderType: theme_builder_type,
        preservationPriorities: preservation_priorities,
        constraints,
      });

      const lines: string[] = [
        `Advanced Scenario Route — ${assessment.wordpress.site_name}`,
        `Route: ${plan.title}`,
        `Scenario: ${scenario}`,
        `Recommended workflow: ${plan.recommendedWorkflow}`,
        `Approval mode: ${resolveWriteMode(plan.approvalMode, write_mode as ProjectEditingMode | undefined)}`,
        `Risk resolution: ${plan.riskResolutionMode}`,
        `User posture: ${user_posture}`,
        `Target surface: ${target_surface}`,
        `Destination: ${capabilityMatrix.destination.label}`,
        `Compatibility: ${capabilityMatrix.compatibilitySummary}`,
        '',
        '## Project Profile Applied',
        `  - Editing mode: ${plan.projectProfileApplied.editing_mode}`,
        `  - Copy density: ${plan.projectProfileApplied.copy_density}`,
        `  - Layout priority: ${plan.projectProfileApplied.layout_priority}`,
        `  - Change style: ${plan.projectProfileApplied.change_style}`,
        `  - Question policy: ${plan.projectProfileApplied.question_policy}`,
        ...(plan.projectProfileApplied.notes ? [`  - Notes: ${plan.projectProfileApplied.notes}`] : []),
        '',
        '## Layout Risk Signals',
        ...(plan.layoutRiskSignals.length > 0
          ? plan.layoutRiskSignals.flatMap((signal) => [
              `  - ${signal.code} (${signal.severity})`,
              `    Surface: ${signal.affected_surface}`,
              `    Reason: ${signal.reason}`,
              `    Handling: ${signal.suggested_handling}`,
            ])
          : ['  - No deterministic layout risks flagged for this route.']),
        '',
        '## Summary',
        `  - ${plan.summary}`,
      ];

      if (plan.rationale.length > 0) {
        lines.push('');
        lines.push('## Why This Route');
        lines.push(...plan.rationale.map((item) => `  - ${item}`));
      }

      lines.push('');
      lines.push('## Execution Steps');
      lines.push(...plan.executionSteps.map((step, index) => `  ${index + 1}. ${step}`));

      lines.push('');
      lines.push('## Recommended Tools');
      lines.push(...plan.recommendedTools.map((tool) => `  - ${tool}`));

      if (plan.supportingWorkflows.length > 0) {
        lines.push('');
        lines.push('## Supporting Workflows');
        lines.push(...plan.supportingWorkflows.map((workflowId) => `  - ${workflowId}`));
      }

      if (plan.operativeHandoffs.length > 0) {
        lines.push('');
        lines.push('## Operative Handoffs');
        for (const handoff of plan.operativeHandoffs) {
          lines.push(`  - ${handoff.label}`);
          lines.push(`    Tool: ${handoff.tool}`);
          lines.push(`    When: ${handoff.when}`);
          lines.push(`    Why: ${handoff.reason}`);
          lines.push(`    Suggested call: ${handoff.tool}(${JSON.stringify(handoff.exampleArgs)})`);
        }
      }

      if (plan.actionPresets.length > 0) {
        lines.push('');
        lines.push('## Action Presets');
        for (const preset of plan.actionPresets) {
          lines.push(`  - ${preset.label}`);
          lines.push(`    Tool: ${preset.tool}`);
          lines.push(`    Expected outcome: ${preset.expectedOutcome}`);
          if (preset.dependsOn.length > 0) {
            lines.push(`    Depends on: ${preset.dependsOn.join(', ')}`);
          }
          lines.push(`    Preset call: ${preset.tool}(${JSON.stringify(preset.args)})`);
        }
      }

      if (plan.workflowApplications.length > 0) {
        lines.push('');
        lines.push('## Workflow Applications');
        for (const application of plan.workflowApplications) {
          lines.push(`  - ${application.layer}: ${application.label}`);
          lines.push(`    ${application.summary}`);
          lines.push(...application.actions.map((action) => `    - ${action}`));
        }
      }

      lines.push('');
      lines.push('## Productivity Layer');
      lines.push(`  - ${plan.productivityLayer.summary}`);
      if (plan.productivityLayer.variantMoves.length > 0) {
        lines.push('  Variant moves:');
        lines.push(...plan.productivityLayer.variantMoves.map((item) => `    - ${item}`));
      }
      if (plan.productivityLayer.reuseLightMoves.length > 0) {
        lines.push('  Reuse-light moves:');
        lines.push(...plan.productivityLayer.reuseLightMoves.map((item) => `    - ${item}`));
      }
      lines.push(`  Follow-up mode: ${plan.productivityLayer.followUpMode}`);
      if (plan.productivityLayer.timeSavingMoves.length > 0) {
        lines.push('  Time-saving moves:');
        lines.push(...plan.productivityLayer.timeSavingMoves.map((item) => `    - ${item}`));
      }

      lines.push('');
      lines.push('## Next Decision');
      lines.push(`  - ${plan.nextDecision}`);

      lines.push('');
      lines.push('## Suggested Execution Call');
      lines.push(
        `  - advanced_creator_mode(${JSON.stringify({
          workflow: plan.recommendedWorkflow,
          premium_asset_id,
          source_template_id,
          target_page_id,
          theme_builder_type,
          auto_execute: false,
        })})`,
      );

      if (plan.guardrails.length > 0) {
        lines.push('');
        lines.push('## Guardrails');
        lines.push(...plan.guardrails.map((guardrail) => `  - ${guardrail}`));
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  server.tool(
    'advanced_creator_mode',
    'Run a deeper Advanced workflow mode for deep relaunch, migration, premium rollouts, Theme Builder structural rollout, or critique/repair loops. This tool differentiates Advanced from Free by connecting multiple private workflow surfaces into one guided execution plan, with optional limited execution for the currently supported rollout paths.',
    {
      site_id: z.string().optional(),
      workflow: z.enum(['deep-relaunch', 'migration-rollout', 'premium-page-rollout', 'theme-builder-rollout', 'critique-repair-loop'])
        .describe('Advanced workflow path to run'),
      premium_asset_id: z.string().optional()
        .describe('Optional premium asset identifier for premium or structural rollout'),
      source_template_id: z.number().int().optional()
        .describe('Optional existing local template to use as rollout source'),
      target_page_id: z.number().int().optional()
        .describe('Optional target page id for premium page rollout or critique planning'),
      theme_builder_type: z.enum(['header', 'footer', 'single', 'single-post', 'single-page', 'archive', 'search', 'error-404', 'popup'])
        .optional()
        .describe('Optional Theme Builder type when running a structural rollout'),
      title: z.string().optional()
        .describe('Optional title override for the imported asset or created Theme Builder template'),
      auto_execute: z.boolean().optional().default(false)
        .describe('If true, execute the supported subset of the workflow instead of returning only a plan'),
      queue_follow_up: z.boolean().optional().default(true)
        .describe('If true, queue a governed follow-up change when the quality loop finds caution or blocked verdicts during auto execution'),
      write_mode: z.enum(['direct-edit', 'draft-first', 'approval-first']).optional()
        .describe('Optional override for direct, draft-first, or approval-first execution behavior'),
    },
    async ({ site_id, workflow, premium_asset_id, source_template_id, target_page_id, theme_builder_type, title, auto_execute, queue_follow_up, write_mode }) => {
      const client = getClient(site_id);
      const [assessment, context] = await Promise.all([
        client.assessSite(),
        client.getSiteContext(),
      ]);
      const fingerprint = buildSiteFingerprint(assessment);
      const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);
      const plan = buildAdvancedWorkflowPlan({
        workflow,
        assessment,
        context,
        capabilityMatrix,
        premiumAssetId: premium_asset_id,
        sourceTemplateId: source_template_id,
        targetPageId: target_page_id,
        themeBuilderType: theme_builder_type,
      });
      const effectiveWriteMode = resolveWriteMode(
        plan.approvalMode,
        write_mode as ProjectEditingMode | undefined,
      );

      let importResult:
        | Awaited<ReturnType<ElementifyClient['importLibraryAsset']>>
        | undefined;
      let themeBuilderResult:
        | Awaited<ReturnType<ElementifyClient['createThemeBuilderTemplate']>>
        | undefined;
      let executionOutcome:
        | ReturnType<typeof buildAdvancedWorkflowExecutionOutcome>
        | undefined;
      const executedActions: string[] = [];

      if (auto_execute && effectiveWriteMode === 'approval-first') {
        const queued = await client.createChange({
          operation: 'advanced_workflow_approval_bundle',
          params: {
            workflow,
            premium_asset_id,
            source_template_id,
            target_page_id,
            theme_builder_type,
            title,
            layout_risk_signals: plan.layoutRiskSignals,
            risk_resolution_mode: plan.riskResolutionMode,
          },
          note: `Approval-first Advanced workflow bundle for ${workflow}`,
          before_state: {
            approval_mode: effectiveWriteMode,
            summary: plan.summary,
          },
        });

        executionOutcome = buildAdvancedWorkflowExecutionOutcome({
          sourceRef: `advanced-workflow:${workflow}`,
          importReport: {
            sourceType: 'raw',
            sourceRef: `advanced-workflow:${workflow}`,
            templateMetadata: {
              title: title ?? plan.title,
              topLevelCount: 0,
              widgetCount: 0,
            },
            validationResult: 'warn',
            warnings: ['Approval-first routing deferred live execution into the review queue.'],
            structuralNotes: [],
            nextStepHints: ['Review the queued Advanced workflow bundle before applying any live changes.'],
            automatedCoverage: 'structural-only',
            smokeTestPlan: {
              readiness: 'ready-for-manual-smoke',
              environmentTargets: ['approval queue review'],
              preparedHooks: ['queue_change', 'review_change', 'apply_change'],
              checklist: ['Review the queued workflow bundle and decide whether it should be approved for execution.'],
            },
          },
          recommendationReport: buildRecommendationReport({
            assessment,
            context,
            fingerprint,
            capabilityMatrix,
          }),
          critique: {
            verdict: 'caution',
            summary: 'Approval-first mode deferred this Advanced workflow into the review queue before live execution.',
            concerns: ['Live execution is intentionally blocked until the queued workflow bundle is reviewed.'],
            repairSteps: ['Review the queued Advanced workflow bundle and approve it before execution.'],
            validationBasis: ['Approval-first operator preference'],
          },
          approvalQueued: {
            id: queued.id,
            status: queued.status,
            operation: queued.operation,
            note: queued.note,
          },
          executedActions: ['Queued the Advanced workflow as an approval-first bundle instead of executing live.'],
        });
      }

      async function runQualityLoop(params: {
        sourceType: 'template' | 'page' | 'raw';
        sourceId?: number;
        title?: string;
        elementorData?: unknown[];
      }) {
        const resolved = params.sourceType === 'raw'
          ? {
              ok: true as const,
              payload: {
                sourceType: 'raw' as const,
                sourceRef: `raw:${params.title ?? 'advanced-workflow'}`,
                title: params.title ?? null,
                elementorData: params.elementorData ?? [],
              },
            }
          : await resolveElementorSource({
              client,
              sourceType: params.sourceType,
              sourceId: params.sourceId,
              title: params.title,
            });

        if (!resolved.ok) {
          throw new Error(resolved.error);
        }

        const recommendationReport = buildRecommendationReport({
          assessment,
          context,
          fingerprint,
          capabilityMatrix,
        });
        const importReport = buildImportReport({
          sourceType: resolved.payload.sourceType,
          sourceRef: resolved.payload.sourceRef,
          title: resolved.payload.title,
          elementorData: resolved.payload.elementorData,
        });
        const critiqueResult = await critiqueElementorOutput({
          report: importReport,
          recommendationReport,
          preferAi: false,
        });

        let queuedFollowUp:
          | Pick<Awaited<ReturnType<ElementifyClient['createChange']>>, 'id' | 'status' | 'operation' | 'note'>
          | undefined;

        if (queue_follow_up && critiqueResult.critique.verdict !== 'solid') {
          const change = await client.createChange({
            operation: 'advanced_workflow_follow_up',
            params: {
              workflow,
              source_ref: resolved.payload.sourceRef,
              critique_verdict: critiqueResult.critique.verdict,
              repair_steps: critiqueResult.critique.repairSteps,
            },
            note: `Advanced workflow follow-up for ${resolved.payload.sourceRef}: ${critiqueResult.critique.summary}`,
            before_state: {
              validation_result: importReport.validationResult,
              warnings: importReport.warnings,
            },
          });

          queuedFollowUp = {
            id: change.id,
            status: change.status,
            operation: change.operation,
            note: change.note,
          };
        }

        executionOutcome = buildAdvancedWorkflowExecutionOutcome({
          sourceRef: resolved.payload.sourceRef,
          importReport,
          recommendationReport,
          critique: critiqueResult.critique,
          queuedFollowUp,
          executedActions,
        });
      }

      if (!executionOutcome && auto_execute && workflow === 'premium-page-rollout' && premium_asset_id) {
        importResult = await client.importLibraryAsset(
          buildPremiumLibraryImportInput({
            assetId: premium_asset_id,
            title,
            status: 'draft',
          }),
        );
        executedActions.push(`Imported premium asset ${premium_asset_id} into the local Elementor Library.`);

        if (target_page_id && effectiveWriteMode === 'direct-edit') {
          const importedData = await client.getTemplateData(importResult.template.id);
          await client.updatePageData(target_page_id, importedData.elementor_data);
          executedActions.push(`Updated page ${target_page_id} with the imported premium structure.`);
          await runQualityLoop({
            sourceType: 'page',
            sourceId: target_page_id,
          });
        } else {
          const importedData = await client.getTemplateData(importResult.template.id);
          if (target_page_id && effectiveWriteMode === 'draft-first') {
            executedActions.push(`Kept the premium rollout as a draft/local import instead of updating page ${target_page_id} live.`);
          }
          await runQualityLoop({
            sourceType: 'raw',
            title: importResult.template.title,
            elementorData: importedData.elementor_data as unknown[],
          });
        }
      }

      if (!executionOutcome && auto_execute && workflow === 'deep-relaunch') {
        if (!target_page_id) {
          throw new Error('advanced_creator_mode deep-relaunch requires target_page_id when auto_execute is true.');
        }
        if (!theme_builder_type) {
          throw new Error('advanced_creator_mode deep-relaunch requires theme_builder_type when auto_execute is true.');
        }
        if (!hasAvailableCapability(capabilityMatrix, 'theme-builder')) {
          throw new Error('advanced_creator_mode deep-relaunch requires Theme Builder capability for the first bounded structural slice.');
        }

        const pageData = await client.getPageData({ id: target_page_id });
        const preservationTemplate = await client.createTemplate({
          title: title ? `${title} — Preservation Snapshot` : `Deep Relaunch Snapshot — ${pageData.post_title}`,
          type: 'page',
          status: 'draft',
        });
        await client.updateTemplateData(preservationTemplate.id, pageData.elementor_data);
        executedActions.push(`Saved preservation snapshot template ${preservationTemplate.id} from page ${target_page_id}.`);

        themeBuilderResult = await client.createThemeBuilderTemplate({
          title: title ?? `Deep relaunch ${theme_builder_type} slice`,
          type: theme_builder_type,
          elementor_data: pageData.elementor_data,
          conditions: 'all',
          status: 'draft',
        });
        executedActions.push(`Created bounded deep relaunch slice ${themeBuilderResult.id} (${themeBuilderResult.type}) in draft mode.`);

        await runQualityLoop({
          sourceType: 'template',
          sourceId: themeBuilderResult.id,
          title: themeBuilderResult.title,
        });
      }

      if (!executionOutcome && auto_execute && workflow === 'migration-rollout') {
        if (!source_template_id) {
          throw new Error('advanced_creator_mode migration-rollout requires source_template_id when auto_execute is true.');
        }
        if (!theme_builder_type) {
          throw new Error('advanced_creator_mode migration-rollout requires theme_builder_type when auto_execute is true.');
        }
        if (!hasAvailableCapability(capabilityMatrix, 'theme-builder')) {
          throw new Error('advanced_creator_mode migration-rollout requires Theme Builder capability for the first bounded migration slice.');
        }

        const sourceData = await client.getTemplateData(source_template_id);
        executedActions.push(`Loaded source template ${source_template_id} for the first bounded migration slice.`);

        themeBuilderResult = await client.createThemeBuilderTemplate({
          title: title ?? `Migration ${theme_builder_type} slice`,
          type: theme_builder_type,
          elementor_data: sourceData.elementor_data,
          conditions: 'all',
          status: 'draft',
        });
        executedActions.push(`Created bounded migration slice ${themeBuilderResult.id} (${themeBuilderResult.type}) in draft mode.`);

        await runQualityLoop({
          sourceType: 'template',
          sourceId: themeBuilderResult.id,
          title: themeBuilderResult.title,
        });
      }

      if (!executionOutcome && auto_execute && workflow === 'theme-builder-rollout') {
        let elementorData: unknown[] | undefined;

        if (premium_asset_id) {
          importResult = await client.importLibraryAsset(
            buildPremiumLibraryImportInput({
              assetId: premium_asset_id,
              title: title ? `${title} — Source` : undefined,
              status: 'draft',
            }),
          );
          executedActions.push(`Imported premium asset ${premium_asset_id} as the structural source asset.`);
          const importedData = await client.getTemplateData(importResult.template.id);
          elementorData = importedData.elementor_data;
        } else if (source_template_id) {
          const sourceData = await client.getTemplateData(source_template_id);
          elementorData = sourceData.elementor_data;
          executedActions.push(`Loaded source template ${source_template_id} for structural rollout.`);
        }

        themeBuilderResult = await client.createThemeBuilderTemplate({
          title: title ?? `Advanced ${theme_builder_type ?? 'header'} rollout`,
          type: theme_builder_type ?? 'header',
          elementor_data: elementorData,
          conditions: 'all',
          status: effectiveWriteMode === 'direct-edit' ? 'publish' : 'draft',
        });
        executedActions.push(`Created Theme Builder template ${themeBuilderResult.id} (${themeBuilderResult.type}).`);
        await runQualityLoop({
          sourceType: 'template',
          sourceId: themeBuilderResult.id,
          title: themeBuilderResult.title,
        });
      }

      if (!executionOutcome && auto_execute && workflow === 'critique-repair-loop') {
        if (source_template_id) {
          executedActions.push(`Loaded template ${source_template_id} into the critique and repair loop.`);
          await runQualityLoop({
            sourceType: 'template',
            sourceId: source_template_id,
          });
        } else if (target_page_id) {
          executedActions.push(`Loaded page ${target_page_id} into the critique and repair loop.`);
          await runQualityLoop({
            sourceType: 'page',
            sourceId: target_page_id,
          });
        } else {
          throw new Error('advanced_creator_mode critique-repair-loop requires source_template_id or target_page_id when auto_execute is true.');
        }
      }

      const lines: string[] = [
        `Advanced Creator Mode — ${assessment.wordpress.site_name}`,
        `Workflow: ${plan.title}`,
        `Mode: ${auto_execute ? 'EXECUTE' : 'PLAN'}`,
        `Write mode: ${effectiveWriteMode}`,
        `Destination: ${capabilityMatrix.destination.label}`,
        `Compatibility: ${capabilityMatrix.compatibilitySummary}`,
        '',
        '## Project Profile Applied',
        `  - Editing mode: ${plan.projectProfileApplied.editing_mode}`,
        `  - Copy density: ${plan.projectProfileApplied.copy_density}`,
        `  - Layout priority: ${plan.projectProfileApplied.layout_priority}`,
        `  - Change style: ${plan.projectProfileApplied.change_style}`,
        `  - Question policy: ${plan.projectProfileApplied.question_policy}`,
        ...(plan.projectProfileApplied.notes ? [`  - Notes: ${plan.projectProfileApplied.notes}`] : []),
        '',
        '## Layout Risk Signals',
        ...(plan.layoutRiskSignals.length > 0
          ? plan.layoutRiskSignals.flatMap((signal) => [
              `  - ${signal.code} (${signal.severity})`,
              `    Surface: ${signal.affected_surface}`,
              `    Reason: ${signal.reason}`,
              `    Handling: ${signal.suggested_handling}`,
            ])
          : ['  - No deterministic layout risks flagged for this workflow.']),
        '',
        '## Summary',
        `  - ${plan.summary}`,
      ];

      if (plan.foundationDependencies.length > 0) {
        lines.push('');
        lines.push('## Foundation Dependencies');
        lines.push(...plan.foundationDependencies.map((item) => `  - ${item}`));
      }

      lines.push('');
      lines.push('## Execution Steps');
      lines.push(...plan.executionSteps.map((step, index) => `  ${index + 1}. ${step}`));

      lines.push('');
      lines.push('## Recommended Tools');
      lines.push(...plan.recommendedTools.map((tool) => `  - ${tool}`));

      if (plan.operativeHandoffs.length > 0) {
        lines.push('');
        lines.push('## Operative Handoffs');
        for (const handoff of plan.operativeHandoffs) {
          lines.push(`  - ${handoff.label}`);
          lines.push(`    Tool: ${handoff.tool}`);
          lines.push(`    When: ${handoff.when}`);
          lines.push(`    Why: ${handoff.reason}`);
          lines.push(`    Suggested call: ${handoff.tool}(${JSON.stringify(handoff.exampleArgs)})`);
        }
      }

      if (plan.actionPresets.length > 0) {
        lines.push('');
        lines.push('## Action Presets');
        for (const preset of plan.actionPresets) {
          lines.push(`  - ${preset.label}`);
          lines.push(`    Tool: ${preset.tool}`);
          lines.push(`    Expected outcome: ${preset.expectedOutcome}`);
          if (preset.dependsOn.length > 0) {
            lines.push(`    Depends on: ${preset.dependsOn.join(', ')}`);
          }
          lines.push(`    Preset call: ${preset.tool}(${JSON.stringify(preset.args)})`);
        }
      }

      if (plan.workflowApplications.length > 0) {
        lines.push('');
        lines.push('## Workflow Applications');
        for (const application of plan.workflowApplications) {
          lines.push(`  - ${application.layer}: ${application.label}`);
          lines.push(`    ${application.summary}`);
          lines.push(...application.actions.map((action) => `    - ${action}`));
        }
      }

      lines.push('');
      lines.push('## Productivity Layer');
      lines.push(`  - ${plan.productivityLayer.summary}`);
      if (plan.productivityLayer.variantMoves.length > 0) {
        lines.push('  Variant moves:');
        lines.push(...plan.productivityLayer.variantMoves.map((item) => `    - ${item}`));
      }
      if (plan.productivityLayer.reuseLightMoves.length > 0) {
        lines.push('  Reuse-light moves:');
        lines.push(...plan.productivityLayer.reuseLightMoves.map((item) => `    - ${item}`));
      }
      lines.push(`  Follow-up mode: ${plan.productivityLayer.followUpMode}`);
      if (plan.productivityLayer.timeSavingMoves.length > 0) {
        lines.push('  Time-saving moves:');
        lines.push(...plan.productivityLayer.timeSavingMoves.map((item) => `    - ${item}`));
      }

      if (importResult) {
        lines.push('');
        lines.push('## Imported Premium Asset');
        lines.push(`  - Local template id: ${importResult.template.id}`);
        lines.push(`  - Local template title: ${importResult.template.title}`);
        lines.push(`  - Import mode: ${importResult.import_mode}`);
      }

      if (themeBuilderResult) {
        lines.push('');
        lines.push('## Theme Builder Result');
        lines.push(`  - Template id: ${themeBuilderResult.id}`);
        lines.push(`  - Type: ${themeBuilderResult.type}`);
        lines.push(`  - Status: ${themeBuilderResult.status}`);
        lines.push(`  - Conditions: ${themeBuilderResult.conditions.join(', ')}`);
      }

      if (executionOutcome) {
        lines.push('');
        lines.push('## Executed Actions');
        lines.push(...executionOutcome.executedActions.map((action, index) => `  ${index + 1}. ${action}`));

        if (executionOutcome.qualityLoop) {
          lines.push('');
          lines.push('## Quality Loop');
          lines.push(`  - Source ref: ${executionOutcome.qualityLoop.sourceRef}`);
          lines.push(`  - Validation result: ${executionOutcome.qualityLoop.importReport.validationResult}`);
          lines.push(`  - Critique verdict: ${executionOutcome.qualityLoop.critique.verdict}`);
          if (executionOutcome.qualityLoop.importReport.warnings.length > 0) {
            lines.push(`  - Validation warnings: ${executionOutcome.qualityLoop.importReport.warnings.join(' | ')}`);
          }
          if (executionOutcome.qualityLoop.recommendationReport.capabilityWarnings.length > 0) {
            lines.push(`  - Capability warnings: ${executionOutcome.qualityLoop.recommendationReport.capabilityWarnings.join(' | ')}`);
          }

          if (executionOutcome.qualityLoop.critique.repairSteps.length > 0) {
            lines.push('');
            lines.push('## Repair Steps');
            lines.push(...executionOutcome.qualityLoop.critique.repairSteps.map((step) => `  - ${step}`));
          }
        }

        if (executionOutcome.queuedFollowUp) {
          lines.push('');
          lines.push('## Governed Follow-Up');
          lines.push(`  - Change id: ${executionOutcome.queuedFollowUp.id}`);
          lines.push(`  - Status: ${executionOutcome.queuedFollowUp.status}`);
          lines.push(`  - Operation: ${executionOutcome.queuedFollowUp.operation}`);
          if (executionOutcome.queuedFollowUp.note) {
            lines.push(`  - Note: ${executionOutcome.queuedFollowUp.note}`);
          }
        }

        if (executionOutcome.approvalQueued) {
          lines.push('');
          lines.push('## Approval Queue');
          lines.push(`  - Change id: ${executionOutcome.approvalQueued.id}`);
          lines.push(`  - Status: ${executionOutcome.approvalQueued.status}`);
          lines.push(`  - Operation: ${executionOutcome.approvalQueued.operation}`);
          if (executionOutcome.approvalQueued.note) {
            lines.push(`  - Note: ${executionOutcome.approvalQueued.note}`);
          }
        }
      }

      if (plan.guardrails.length > 0) {
        lines.push('');
        lines.push('## Guardrails');
        lines.push(...plan.guardrails.map((guardrail) => `  - ${guardrail}`));
      }

      if (plan.notes.length > 0) {
        lines.push('');
        lines.push('## Notes');
        lines.push(...plan.notes.map((note) => `  - ${note}`));
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}
