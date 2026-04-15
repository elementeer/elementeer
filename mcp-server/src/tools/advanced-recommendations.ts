import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import type { AddonProfileId, StackProfileId } from '../client.js';
import { buildCapabilityMatrix } from '../destination.js';
import { buildSiteFingerprint } from '../fingerprint.js';
import {
  buildAdvancedUpgradePlan,
  buildAdvancedRecommendationReport,
  groupAdvancedRecommendationsByTrack,
} from '../advanced-recommendations.js';

function trackLabel(track: string): string {
  switch (track) {
    case 'brand-adaptation':
      return 'Brand Adaptation';
    case 'premium-library':
      return 'Premium Library';
    case 'critique':
      return 'Critique and Repair';
    case 'governed-operations':
      return 'Governed Operations';
    case 'creator-depth':
      return 'Creator Depth';
    case 'upgrade-guidance':
      return 'Upgrade Guidance';
    case 'productivity':
      return 'Productivity Layer';
    default:
      return track;
  }
}

export function registerAdvancedRecommendationTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  server.tool(
    'plan_advanced_upgrade_path',
    'Plan a scenario-aware Advanced upgrade and stack-shaping path. Distinguishes baseline correction, Elementor Pro needs, Elementify Advanced workflow depth, and curated pro-addon guidance without collapsing into generic upsell behavior.',
    {
      site_id: z.string().optional(),
      current_tier: z.enum(['free', 'advanced']).optional().default('advanced')
        .describe('Current product tier or working assumption for this operator'),
      scenario: z.enum(['deep-relaunch', 'migration', 'premium-rollout', 'critique-repair'])
        .describe('Scenario family that needs stack or upgrade guidance'),
      target_surface: z.enum(['page', 'theme-builder', 'mixed']).optional().default('mixed')
        .describe('Primary target surface for the next bounded slice'),
      current_stack_profile: z.enum([
        'fsp-1-minimal-guided-baseline',
        'fsp-2-curated-free-addon',
        'fsp-3-brownfield-staged-transition',
        'asp-1-advanced-productivity-baseline',
        'asp-2-advanced-premium-addon',
        'asp-3-deep-relaunch-migration',
      ]).optional(),
      current_addon_profile: z.enum([
        'none',
        'free-utility-widgets',
        'content-marketing-free',
        'conversion-free',
        'conversion-pro',
        'content-system-pro',
      ]).optional(),
    },
    async ({
      site_id,
      current_tier,
      scenario,
      target_surface,
      current_stack_profile,
      current_addon_profile,
    }) => {
      const client = getClient(site_id);
      const [assessment, context] = await Promise.all([
        client.assessSite(),
        client.getSiteContext(),
      ]);
      const fingerprint = buildSiteFingerprint(assessment);
      const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);
      const plan = buildAdvancedUpgradePlan({
        assessment,
        context,
        capabilityMatrix,
        currentTier: current_tier,
        scenario,
        targetSurface: target_surface,
        currentStackProfile: current_stack_profile as StackProfileId | undefined,
        currentAddonProfile: current_addon_profile as AddonProfileId | undefined,
      });

      const lines: string[] = [
        `Advanced Upgrade Path — ${assessment.wordpress.site_name}`,
        `Current tier: ${current_tier}`,
        `Scenario: ${scenario}`,
        `Target surface: ${target_surface}`,
        `Destination: ${capabilityMatrix.destination.label}`,
        '',
        '## Recommendation',
        `  - Upgrade needed: ${plan.isUpgradeNeeded ? 'yes' : 'no'}`,
        `  - Recommended target: ${plan.recommendedUpgradeTarget}`,
        `  - Recommended stack profile: ${plan.recommendedStackProfile}`,
        `  - Recommended addon profile: ${plan.recommendedAddonProfile}`,
        `  - Confidence: ${plan.confidence}`,
        '',
        '## Why',
        `  - ${plan.reason}`,
        '',
        '## Lighter Alternative Considered',
        `  - ${plan.lighterAlternativeConsidered}`,
        '',
        '## Complexity Tradeoff',
        `  - ${plan.complexityTradeoff}`,
      ];

      if (plan.supportingRecommendations.length > 0) {
        lines.push('');
        lines.push('## Supporting Recommendations');
        lines.push(...plan.supportingRecommendations.map((item) => `  - ${item}`));
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );

  server.tool(
    'get_advanced_recommendations',
    'Generate deeper Advanced-only workflow recommendations on top of the Free foundation. This additive layer highlights premium-library usage, brand adaptation, critique loops, governed operations, and richer creation opportunities without changing the public Free recommendation surface.',
    {
      site_id: z.string().optional(),
      workflow_track: z.enum([
        'brand-adaptation',
        'premium-library',
        'critique',
        'governed-operations',
        'creator-depth',
        'upgrade-guidance',
        'productivity',
      ]).optional().describe('Optional Advanced workflow track to focus on'),
      max_results: z.number().int().min(1).max(10).optional().default(5)
        .describe('Maximum number of Advanced recommendations to return'),
    },
    async ({ site_id, workflow_track, max_results }) => {
      const client = getClient(site_id);
      const [assessment, context] = await Promise.all([
        client.assessSite(),
        client.getSiteContext(),
      ]);
      const fingerprint = buildSiteFingerprint(assessment);
      const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);
      const report = buildAdvancedRecommendationReport({
        assessment,
        context,
        fingerprint,
        capabilityMatrix,
      });

      const filtered = workflow_track
        ? report.advancedRecommendations.filter((recommendation) => recommendation.workflowTrack === workflow_track)
        : report.advancedRecommendations;
      const recommendations = filtered.slice(0, max_results);

      if (recommendations.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No Advanced recommendations match the current filters. The site may still be in a Free-foundation phase or already well-prepared for deeper workflows.',
          }],
        };
      }

      const lines: string[] = [
        `Advanced Recommendations for ${assessment.wordpress.site_name}`,
        `Context: role=${context.user_role ?? 'unknown'} · purpose=${context.site_purpose ?? 'unknown'}`,
        `Destination: ${report.destination.label}`,
        `Compatibility: ${report.compatibilitySummary}`,
        '',
      ];

      if (report.capabilityWarnings.length > 0) {
        lines.push('Warnings:');
        lines.push(...report.capabilityWarnings.map((warning) => `  - ${warning}`));
        lines.push('');
      }

      if (report.foundationRecommendations.length > 0) {
        lines.push('## Foundation Dependencies');
        lines.push(...report.foundationRecommendations.map((recommendation) => `  - [${recommendation.id}] ${recommendation.title}`));
        lines.push('');
      }

      for (const group of groupAdvancedRecommendationsByTrack(recommendations)) {
        lines.push(`## ${trackLabel(group.track)}`);
        for (const recommendation of group.items) {
          const autoFlag = recommendation.automated ? ' [auto]' : ' [needs input]';
          lines.push(`  - [${recommendation.id}] ${recommendation.title}${autoFlag}`);
          lines.push(`    Category: ${recommendation.category} · Priority: ${recommendation.priority} · Impact: ${recommendation.impact}`);
          lines.push(`    ${recommendation.description}`);
          lines.push(`    Why Advanced: ${recommendation.tierRationale}`);
          if (recommendation.tools.length > 0) {
            lines.push(`    Tools: ${recommendation.tools.join(', ')}`);
          }
          if (recommendation.blocked_by.length > 0) {
            lines.push(`    Depends on: ${recommendation.blocked_by.join(', ')}`);
          }
        }
        lines.push('');
      }

      if (report.notes.length > 0) {
        lines.push('## Notes');
        lines.push(...report.notes.map((note) => `  - ${note}`));
      }

      return {
        content: [{ type: 'text', text: lines.join('\n').trim() }],
      };
    },
  );
}
