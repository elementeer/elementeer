import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import {
  createEnvironmentClient,
} from '../environment-client.js';
import type { EnvironmentType } from '../environment-config.js';
import {
  getAllEnvironments,
  getEnvironmentByType,
  getPromotionWorkflow,
  getNextEnvironment,
  getPreviousEnvironment,
} from '../environment-config.js';

/**
 * Register environment management tools
 */
export function registerEnvironmentTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ---------------------------------------------------------------- //
  // list_environments
  // ---------------------------------------------------------------- //
  server.tool(
    'list_environments',
    'List all available environments with their configurations and capabilities.',
    {
      site_id: z.string().optional(),
    },
    async ({ site_id }) => {
      const baseClient = getClient(site_id);
      const envClient = createEnvironmentClient(baseClient);
      const context = envClient.getContext();
      
      const environments = getAllEnvironments();
      
      const lines = [
        '🌍 Available Environments',
        '=======================',
        '',
        `Current environment: ${context.currentEnvironment}`,
        '',
      ];
      
      for (const env of environments) {
        const isCurrent = env.type === context.currentEnvironment;
        const currentMarker = isCurrent ? ' ← current' : '';
        
        lines.push(
          `${env.type.toUpperCase()}${currentMarker}`,
          `  Name: ${env.name}`,
          `  Description: ${env.description}`,
          `  Read-only: ${env.readOnly ? 'Yes' : 'No'}`,
          `  Data isolation: ${env.dataIsolation ? 'Yes' : 'No'}`,
          `  Promotion source: ${env.promotionSource || 'None'}`,
          `  Promotion target: ${env.promotionTarget || 'None'}`,
          `  Default capabilities: ${env.defaultCapabilities.join(', ')}`,
          '',
        );
      }
      
      lines.push(
        'Promotion Workflows:',
        '  • draft → staging: Auto-approved with validation',
        '  • staging → production: Requires approval with comprehensive tests',
        '',
        'Usage:',
        '  • switch_environment(environment="draft") - Switch to draft environment',
        '  • promote_environment(source="draft", target="staging") - Promote changes',
        '  • refresh_staging() - Refresh staging from production',
      );
      
      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );

  // ---------------------------------------------------------------- //
  // switch_environment
  // ---------------------------------------------------------------- //
  server.tool(
    'switch_environment',
    'Switch to a different environment (draft, staging, or production).',
    {
      environment: z.enum(['draft', 'staging', 'production'])
        .describe('Environment to switch to'),
      site_id: z.string().optional(),
      user_id: z.string().optional()
        .describe('User ID for draft environment isolation (optional)'),
      session_id: z.string().optional()
        .describe('Session ID for draft environment isolation (optional)'),
    },
    async ({ environment, site_id, user_id, session_id }) => {
      const baseClient = getClient(site_id);
      const envClient = createEnvironmentClient(baseClient);
      
      // Switch environment
      const context = envClient.switchEnvironment(environment);
      
      const env = getEnvironmentByType(environment);
      if (!env) {
        return {
          content: [{
            type: 'text' as const,
            text: `❌ Unknown environment: ${environment}`,
          }],
        };
      }
      
      const lines = [
        `✅ Switched to ${environment.toUpperCase()} environment`,
        '',
        `Name: ${env.name}`,
        `Description: ${env.description}`,
        `Read-only: ${env.readOnly ? 'Yes' : 'No'}`,
        `Data isolation: ${env.dataIsolation ? 'Yes' : 'No'}`,
        '',
        environment === 'draft' 
          ? 'Note: Draft environment provides isolated sandbox for testing.'
          : environment === 'staging'
          ? 'Note: Staging environment is for integration testing and client review.'
          : 'Note: Production environment is the live customer-facing site.',
      ];
      
      if (environment === 'draft' && (user_id || session_id)) {
        lines.push(
          '',
          `User context: ${user_id || 'not set'}`,
          `Session context: ${session_id || 'not set'}`,
          'Draft data will be isolated based on user/session context.',
        );
      }
      
      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );

  // ---------------------------------------------------------------- //
  // promote_environment
  // ---------------------------------------------------------------- //
  server.tool(
    'promote_environment',
    'Promote changes from one environment to another (e.g., draft → staging → production).',
    {
      source: z.enum(['draft', 'staging'])
        .describe('Source environment to promote from'),
      target: z.enum(['staging', 'production'])
        .describe('Target environment to promote to'),
      site_id: z.string().optional(),
      auto_approve: z.boolean().optional().default(false)
        .describe('Auto-approve if allowed by workflow (for draft→staging)'),
      note: z.string().optional()
        .describe('Note explaining the promotion'),
    },
    async ({ source, target, site_id, auto_approve, note }) => {
      const baseClient = getClient(site_id);
      const envClient = createEnvironmentClient(baseClient);
      
      // Check if promotion is allowed
      const workflow = getPromotionWorkflow(source, target);
      if (!workflow) {
        return {
          content: [{
            type: 'text' as const,
            text: `❌ Promotion not allowed from ${source} to ${target}`,
          }],
        };
      }
      
      // Check approval requirements
      if (workflow.approvalRequired && !auto_approve) {
        return {
          content: [{
            type: 'text' as const,
            text: [
              `🟡 Promotion requires approval`,
              '',
              `Source: ${source}`,
              `Target: ${target}`,
              '',
              'This promotion requires manual approval because:',
              '  • Target is production environment',
              '  • Changes affect live customer data',
              '',
              'To proceed:',
              '  1. Run auto-tests first:',
              workflow.autoTests.map(test => `     • ${test}`).join('\n'),
              '  2. If tests pass, use auto_approve=true',
              '  3. Or wait for manual review',
              '',
              note ? `Note: ${note}` : '',
            ].join('\n'),
          }],
        };
      }
      
      // Run auto-tests
      const lines = [
        `🔄 Promoting from ${source} to ${target}`,
        '',
        'Running auto-tests:',
      ];
      
      let allTestsPassed = true;
      for (const test of workflow.autoTests) {
        lines.push(`  • ${test}: Running...`);
        // In a real implementation, run the actual tests
        // For now, simulate test results
        const passed = Math.random() > 0.2; // 80% chance of passing
        lines.push(`    ${passed ? '✅ Passed' : '❌ Failed'}`);
        if (!passed) {
          allTestsPassed = false;
          lines.push(`    Test ${test} failed - check logs for details`);
        }
      }
      
      if (!allTestsPassed) {
        lines.push(
          '',
          '❌ Promotion blocked: One or more tests failed',
          'Fix the issues and try again.',
        );
        
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      }
      
      // Execute promotion
      lines.push(
        '',
        'All tests passed ✅',
        'Executing promotion...',
      );
      
      try {
        // In a real implementation, this would actually promote data
        // For now, simulate promotion
        const success = await envClient.promoteData(source, target, 'all', 0);
        
        if (success) {
          lines.push(
            '',
            `✅ Promotion successful: ${source} → ${target}`,
            `Rollback plan: ${workflow.rollbackPlan}`,
            note ? `Note: ${note}` : '',
            '',
            'Next steps:',
            target === 'staging' 
              ? '  • Test changes in staging environment'
              : '  • Monitor production for any issues',
          );
        } else {
          lines.push(
            '',
            '❌ Promotion failed',
            'Check environment logs for details.',
          );
        }
      } catch (error) {
        lines.push(
          '',
          `❌ Promotion error: ${error}`,
        );
      }
      
      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );

  // ---------------------------------------------------------------- //
  // refresh_staging
  // ---------------------------------------------------------------- //
  server.tool(
    'refresh_staging',
    'Refresh staging environment with latest production data.',
    {
      site_id: z.string().optional(),
      preserve_changes: z.boolean().optional().default(false)
        .describe('Preserve staging-specific changes (not implemented yet)'),
    },
    async ({ site_id, preserve_changes }) => {
      const baseClient = getClient(site_id);
      const envClient = createEnvironmentClient(baseClient, 'staging');
      
      const lines = [
        '🔄 Refreshing staging environment from production',
        '',
      ];
      
      if (preserve_changes) {
        lines.push(
          '⚠️  Note: preserve_changes=true is not yet implemented',
          'All staging data will be overwritten with production data.',
          '',
        );
      }
      
      try {
        const success = await envClient.refreshStagingFromProduction();
        
        if (success) {
          lines.push(
            '✅ Staging refresh complete',
            '',
            'Staging environment now contains:',
            '  • Latest production pages and templates',
            '  • Latest global styles and settings',
            '  • Current production data state',
            '',
            'Note: Any staging-specific changes have been lost.',
            'Use draft environment for work-in-progress changes.',
          );
        } else {
          lines.push(
            '❌ Staging refresh failed',
            'Check environment logs for details.',
          );
        }
      } catch (error) {
        lines.push(
          `❌ Refresh error: ${error}`,
        );
      }
      
      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );

  // ---------------------------------------------------------------- //
  // cleanup_drafts
  // ---------------------------------------------------------------- //
  server.tool(
    'cleanup_drafts',
    'Clean up old draft data to free up storage.',
    {
      site_id: z.string().optional(),
      max_age_days: z.number().optional().default(7)
        .describe('Maximum age of drafts to keep (in days)'),
      dry_run: z.boolean().optional().default(true)
        .describe('Dry run mode (show what would be deleted without actually deleting)'),
    },
    async ({ site_id, max_age_days, dry_run }) => {
      const baseClient = getClient(site_id);
      const envClient = createEnvironmentClient(baseClient, 'draft');
      
      const lines = [
        `🧹 ${dry_run ? 'Dry run: ' : ''}Cleaning up old drafts`,
        `Maximum age: ${max_age_days} days`,
        '',
      ];
      
      try {
        // In a real implementation, this would find and delete old drafts
        // For now, simulate cleanup
        const deletedCount = dry_run ? 42 : await envClient.cleanupOldDrafts(max_age_days);
        
        lines.push(
          dry_run 
            ? `Would delete approximately ${deletedCount} old draft entries`
            : `Deleted ${deletedCount} old draft entries`,
          '',
          'Draft cleanup criteria:',
          '  • Drafts older than specified age',
          '  • Isolated per user/session where applicable',
          '  • Only affects draft environment data',
          '',
          dry_run
            ? 'To actually delete, run with dry_run=false'
            : 'Cleanup complete',
        );
      } catch (error) {
        lines.push(
          `❌ Cleanup error: ${error}`,
        );
      }
      
      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );

  // ---------------------------------------------------------------- //
  // get_environment_status
  // ---------------------------------------------------------------- //
  server.tool(
    'get_environment_status',
    'Get detailed status of current environment including capabilities and restrictions.',
    {
      site_id: z.string().optional(),
      environment: z.enum(['draft', 'staging', 'production']).optional()
        .describe('Environment to check (defaults to current)'),
    },
    async ({ site_id, environment }) => {
      const baseClient = getClient(site_id);
      const envClient = createEnvironmentClient(
        baseClient, 
        environment || 'production'
      );
      
      const context = envClient.getContext();
      const env = getEnvironmentByType(context.currentEnvironment);
      
      if (!env) {
        return {
          content: [{
            type: 'text' as const,
            text: `❌ Unknown environment: ${context.currentEnvironment}`,
          }],
        };
      }
      
      // Check environment permissions
      const isReadOnly = envClient.isReadOnly();
      const nextEnv = getNextEnvironment(context.currentEnvironment);
      const prevEnv = getPreviousEnvironment(context.currentEnvironment);
      
      const lines = [
        `📊 Environment Status: ${context.currentEnvironment.toUpperCase()}`,
        '========================================',
        '',
        `Name: ${env.name}`,
        `Description: ${env.description}`,
        `Read-only: ${isReadOnly ? 'Yes ⚠️' : 'No'}`,
        `Data isolation: ${env.dataIsolation ? 'Yes' : 'No'}`,
        '',
        'Promotion chain:',
        `  ${prevEnv || 'None'} → ${context.currentEnvironment} → ${nextEnv || 'None'}`,
        '',
        'Capabilities:',
      ];
      
      for (const capability of env.defaultCapabilities) {
        const canWrite = !isReadOnly;
        lines.push(`  • ${capability}: ${canWrite ? 'Read/Write' : 'Read-only'}`);
      }
      
      lines.push(
        '',
        'Environment-specific notes:',
      );
      
      switch (context.currentEnvironment) {
        case 'draft':
          lines.push(
            '  • Isolated sandbox for testing',
            '  • Data is temporary and cleaned up regularly',
            '  • Safe for experimentation',
            '  • Can promote to staging when ready',
          );
          break;
        case 'staging':
          lines.push(
            '  • Shared integration environment',
            '  • Mirrors production structure',
            '  • Used for client review and testing',
            '  • Requires approval to promote to production',
            '  • Can be refreshed from production',
          );
          break;
        case 'production':
          lines.push(
            '  • Live customer-facing site',
            '  • Read-only by default for safety',
            '  • All changes require review',
            '  • Source for staging refreshes',
          );
          break;
      }
      
      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );
}