import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

/**
 * Shared registration pattern for module wizards.
 * 
 * Each wizard is registered as an MCP tool that calls the corresponding
 * PHP endpoint and returns a standardized result:
 * {status, gaps, recommendations, suggested_tools, suggested_plugins}
 */

export interface WizardRegistrationOptions {
  /** Wizard identifier (e.g., 'acf', 'forms', 'comments') */
  id: string;
  /** Human-readable label for the wizard */
  label: string;
  /** Brief description shown in tool help */
  description: string;
  /** Required capability to run this wizard */
  requiredCapability: string;
  /** Governance level (L0-L3) for this wizard's execution */
  governanceLevel?: 'L0' | 'L1' | 'L2' | 'L3';
}

/**
 * Standardized wizard result structure.
 */
export interface WizardResult {
  status: 'active' | 'inactive' | 'missing' | 'needs_configuration';
  gaps: Array<{
    id: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
    data?: Record<string, unknown>;
  }>;
  recommendations: Array<{
    id: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
    gap_id?: string;
  }>;
  suggested_tools: Array<{
    tool: string;
    purpose: string;
    governance_level?: 'L0' | 'L1' | 'L2' | 'L3';
  }>;
  suggested_plugins: Array<{
    slug: string;
    name: string;
    reason: string;
    required_capability?: string;
  }>;
}

/**
 * Register a single module wizard as an MCP tool.
 */
export function registerModuleWizard(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
  options: WizardRegistrationOptions,
): void {
  const { id, label, description, requiredCapability, governanceLevel = 'L0' } = options;

  server.tool(
    `wizard_${id}`,
    `${label} wizard — ${description}`,
    {
      site_id: z.string().optional(),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        
        const result = await client.getWizard(id);

        return {
          content: [{
            type: 'text',
            text: [
              `# ${label} Wizard`,
              `**Status**: ${result.status}`,
              '',
              '## Gaps',
              ...result.gaps.map(gap => `- ${gap.severity.toUpperCase()}: ${gap.description}`),
              '',
              '## Recommendations',
              ...result.recommendations.map(rec => `- ${rec.priority.toUpperCase()}: ${rec.title} — ${rec.description}`),
              '',
              result.suggested_tools.length > 0 ? [
                '## Suggested MCP Tools',
                ...result.suggested_tools.map(tool => `- \`${tool.tool}\`: ${tool.purpose}` + (tool.governance_level ? ` (${tool.governance_level})` : '')),
                ''
              ].join('\n') : '',
              result.suggested_plugins.length > 0 ? [
                '## Suggested Plugins',
                ...result.suggested_plugins.map(plugin => `- **${plugin.name}** (${plugin.slug}): ${plugin.reason}`),
                ''
              ].join('\n') : '',
            ].filter(line => line !== '').join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error running wizard: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}

/**
 * Register all module wizards (to be called from tools/index.ts).
 */
export function registerModuleWizards(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // These will be populated in Phase 3.3
  const wizardDefinitions: WizardRegistrationOptions[] = [
    {
      id: 'acf',
      label: 'ACF',
      description: 'Detect ACF/Meta Box → assess field coverage → recommend field groups',
      requiredCapability: 'plugin-stack-context:read',
    },
    {
      id: 'forms',
      label: 'Forms',
      description: 'Detect form plugins → assess submission rate → recommend anti-spam',
      requiredCapability: 'plugin-stack-context:read',
    },
    {
      id: 'comments',
      label: 'Comments',
      description: 'Assess volume → moderation backlog → recommend plugin or disabling',
      requiredCapability: 'plugin-stack-context:read',
    },
    {
      id: 'multi',
      label: 'Multilingual',
      description: 'Detect WPML/Polylang → translation coverage → language pair recommendation',
      requiredCapability: 'plugin-stack-context:read',
    },
    {
      id: 'plugin',
      label: 'Plugin Stack',
      description: 'Detect conflicts/redundancies → outdated plugins → optimal stack',
      requiredCapability: 'plugin-stack-context:read',
    },
    {
      id: 'export',
      label: 'Import/Export',
      description: 'Assess exportable content → format recommendation → batch strategy',
      requiredCapability: 'plugin-stack-context:read',
    },
    {
      id: 'health',
      label: 'Site Health',
      description: 'PHP version → memory → DB bloat → cache → hosting recommendation',
      requiredCapability: 'plugin-stack-context:read',
    },
    {
      id: 'ally',
      label: 'Accessibility',
      description: 'Recommend built‑in scanner vs Ally based on site needs',
      requiredCapability: 'plugin-stack-context:read',
    },
    {
      id: 'lms',
      label: 'LMS',
      description: 'Plugin recommendation, course structure advice, Elementor integration',
      requiredCapability: 'plugin-stack-context:read',
    },
    {
      id: 'charity',
      label: 'Charity',
      description: 'Fundraising setup, donation form optimization, payment gateway tips',
      requiredCapability: 'plugin-stack-context:read',
    },
  ];

  for (const def of wizardDefinitions) {
    registerModuleWizard(server, getClient, def);
  }
}