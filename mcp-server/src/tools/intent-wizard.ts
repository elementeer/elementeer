import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient, IntentWizardInput, IntentWizardRoute, StackReadinessSignals } from '../client.js';
import { deriveStackReadinessSignals, routeIntentWizard } from '../intent-wizard.js';

function normalizeList(values?: string[]): string[] {
  return values?.map((value) => value.trim()).filter(Boolean) ?? [];
}

function buildRouteText(route: IntentWizardRoute): string {
  return [
    `Intent Route — ${route.scenarioLabel}`,
    '',
    `Tier: ${route.recommendedTier}`,
    `Wizard: ${route.recommendedWizard}`,
    `Stack profile: ${route.recommendedStackProfile.label} (${route.recommendedStackProfile.id})`,
    `Skill profile: ${route.recommendedSkillProfile.label} (${route.recommendedSkillProfile.id})`,
    `Addon profile: ${route.recommendedAddonProfile.label} (${route.recommendedAddonProfile.id})`,
    `Guidance mode: ${route.guidanceMode}`,
    '',
    '## Rationale',
    ...route.rationale.map((line: string) => `- ${line}`),
    '',
    '## Baseline Stack',
    ...route.recommendedStackProfile.baselineStack.map((item: string) => `- ${item}`),
    '',
    `Addon rationale: ${route.recommendedStackProfile.addonRationale}`,
    route.recommendedStackProfile.upgradePath.length > 0 ? '' : undefined,
    route.recommendedStackProfile.upgradePath.length > 0 ? '## Upgrade Path' : undefined,
    ...route.recommendedStackProfile.upgradePath.map((item: string) => `- ${item}`),
    '',
    '## Suggested Tools',
    ...route.suggestedTools.map((tool: string) => `- ${tool}`),
    '',
    '## Guardrails',
    ...route.guardrails.map((guardrail: string) => `- ${guardrail}`),
    '',
    `Next decision: ${route.nextDecision}`,
  ].filter(Boolean).join('\n');
}

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
): Promise<IntentWizardInput> {
  const [siteInfo, assessment] = client
    ? await Promise.all([client.getSiteInfo(), client.assessSite()])
    : [null, null];

  return {
    origin: raw.origin,
    intent: raw.intent,
    depth: raw.depth,
    userPosture: raw.userPosture,
    preservationPriorities: normalizeList(raw.preservationPriorities),
    constraints: normalizeList(raw.constraints),
    stackReadiness: deriveStackReadinessSignals(siteInfo, assessment, raw.stackReadinessOverrides),
  };
}

export function registerIntentWizardTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  server.tool(
    'route_intent_wizard',
    'Route a user situation through the scenario-first Elementify front door. This is the main runtime entry for intent, scenario, tier, stack profile, skill profile, and addon profile guidance.',
    {
      site_id: z.string().optional().describe('Optional configured site ID for using live site signals'),
      origin: z.enum([
        'idea_only',
        'brand_without_site',
        'wordpress_without_elementor',
        'partial_stack',
        'existing_elementor_site',
        'unclear_needs_diagnosis',
      ]),
      intent: z.enum([
        'bootstrap',
        'clean_up',
        'refresh',
        'optimization',
        'extension',
        'reduction',
        'relaunch',
        'migration',
      ]),
      depth: z.enum(['light', 'moderate', 'deep']),
      user_posture: z.enum(['guided', 'assisted', 'technical']),
      preservation_priorities: z.array(z.string()).optional().describe('What must stay intact'),
      constraints: z.array(z.string()).optional().describe('Operational constraints such as free_only or must_avoid_theme_change'),
      wordpress_present: z.boolean().optional(),
      elementor_installed: z.boolean().optional(),
      elementor_pro_installed: z.boolean().optional(),
      hello_theme_installed: z.boolean().nullable().optional(),
      current_theme: z.string().nullable().optional(),
      known_addons: z.array(z.string()).optional(),
    },
    async ({
      site_id,
      origin,
      intent,
      depth,
      user_posture,
      preservation_priorities,
      constraints,
      wordpress_present,
      elementor_installed,
      elementor_pro_installed,
      hello_theme_installed,
      current_theme,
      known_addons,
    }) => {
      const client = site_id ? getClient(site_id) : null;
      const input = await buildRuntimeInput(client, {
        origin: origin as IntentWizardInput['origin'],
        intent: intent as IntentWizardInput['intent'],
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

      const route = routeIntentWizard(input);

      return {
        content: [{ type: 'text', text: buildRouteText(route) }],
      };
    },
  );

  server.tool(
    'plan_stack_bootstrap',
    'Bootstrap-focused front door for users who have only an idea, a brand, WordPress without Elementor, or a partial stack. Returns the conservative next stack, skill, and addon route.',
    {
      site_id: z.string().optional().describe('Optional configured site ID for using live site signals'),
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
      const input = await buildRuntimeInput(client, {
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

      const route = routeIntentWizard(input);
      const checklist = [
        `Confirm baseline stack: ${route.recommendedStackProfile.baselineStack.join(' -> ')}`,
        `Start with wizard: ${route.recommendedWizard}`,
        `Use posture profile: ${route.recommendedSkillProfile.label}`,
        route.recommendedAddonProfile.id === 'none'
          ? 'Do not add an addon profile yet.'
          : `Consider addon profile: ${route.recommendedAddonProfile.label}`,
        route.nextDecision,
      ];

      return {
        content: [{
          type: 'text',
          text: [
            buildRouteText(route),
            '',
            '## Bootstrap Checklist',
            ...checklist.map((item: string) => `- ${item}`),
          ].join('\n'),
        }],
      };
    },
  );
}
