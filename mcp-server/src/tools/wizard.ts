import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  ElementifyClient,
  GlobalColor,
  GlobalTypographyEntry,
} from '../client.js';
import { GOVERNANCE_LEVELS } from '../product-tiers.js';
import type { ElementifyTemplate } from '@elementify/shared';

export interface BrandSetupWizardInput {
  auto_execute?: boolean;
  logo_media_id?: number;
  homepage_page_id?: number;
  colors?: Array<{
    id?: string;
    title: string;
    color: string;
  }>;
  typography?: Array<{
    id?: string;
    title: string;
    font_family?: string;
    font_size?: number;
    font_weight?: string;
    line_height?: number;
    letter_spacing?: number;
    text_transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  }>;
  focus?: string[];
}

export interface CreatorModeInput {
  sections: string[];
  save_as_template?: {
    title: string;
    template_type?: 'page' | 'section' | 'container';
    status?: 'publish' | 'draft';
  };
  write_to_page?: {
    page_id: number;
  };
  dry_run?: boolean;
}

export interface WizardToolResult {
  text: string;
  isError?: boolean;
}

// ------------------------------------------------------------------ //
// Helpers
// ------------------------------------------------------------------ //

/**
 * Simple keyword-matching score between a template and a target section type.
 * Higher = better match.
 */
function sectionMatchScore(template: ElementifyTemplate, target: string): number {
  const haystack = `${template.title} ${(template.categories ?? []).join(' ')} ${(template.tags ?? []).join(' ')}`.toLowerCase();
  const keywords = target.toLowerCase().split(/[\s_-]+/);
  return keywords.reduce((score, kw) => score + (haystack.includes(kw) ? 1 : 0), 0);
}

/**
 * From a list of templates, pick the best match for a given section type.
 * Returns undefined if nothing scores above 0.
 */
function pickBestTemplate(
  templates: ElementifyTemplate[],
  sectionType: string,
): ElementifyTemplate | undefined {
  let best: ElementifyTemplate | undefined;
  let bestScore = 0;

  for (const t of templates) {
    const score = sectionMatchScore(t, sectionType);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  return best;
}

export async function runBrandSetupWizard(
  client: ElementifyClient,
  input: BrandSetupWizardInput,
): Promise<WizardToolResult> {
  const {
    auto_execute = false,
    logo_media_id,
    homepage_page_id,
    colors,
    typography,
    focus,
  } = input;

  const [assessment, currentStyles, siteSettings] = await Promise.all([
    client.assessSite(),
    client.getGlobalStyles(),
    client.getSiteSettings(),
  ]);

  const siteName = assessment.wordpress.site_name;
  const lines: string[] = [
    `Brand Setup Wizard — ${siteName}`,
    `Mode: ${auto_execute ? 'EXECUTE' : 'DRY RUN (pass auto_execute=true to apply)'}`,
    '',
    '## Current State',
    `  Logo:       ${assessment.brand.logo_set ? `set (ID: ${assessment.brand.logo_id})` : '⚠ not set'}`,
    `  Colors:     ${assessment.brand.global_colors_count} global color(s) defined`,
    `  Typography: ${assessment.brand.global_typography_count} global typography entry/entries`,
    `  Homepage:   ${siteSettings.homepage ? `${siteSettings.homepage.title} (ID: ${siteSettings.homepage.id})` : '⚠ not set'}`,
    '',
  ];

  if (focus && focus.length > 0) {
    lines.push('## Focus');
    lines.push(`  ${focus.join(', ')}`);
    lines.push('');
  }

  const steps: Array<{ label: string; fn: () => Promise<string> }> = [];

  if (logo_media_id) {
    steps.push({
      label: `Set logo → Media ID: ${logo_media_id}`,
      fn: async () => {
        const r = await client.setLogo(logo_media_id);
        return `✅ Logo set (${r.logo_url ?? 'ID: ' + r.logo_id})`;
      },
    });
  }
  if (homepage_page_id) {
    steps.push({
      label: `Set homepage → Page ID: ${homepage_page_id}`,
      fn: async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _r = await client.updateSiteSettings({ homepage: homepage_page_id });
        return `✅ Homepage set to page ID: ${homepage_page_id}`;
      },
    });
  }

  if (colors && colors.length > 0) {
    const replacing = currentStyles.system_colors.length > 0;
    steps.push({
      label: `Write ${colors.length} global color(s) → system slot${replacing ? ' (replaces existing)' : ''}`,
      fn: async () => {
        const r = await client.setGlobalColors(colors as GlobalColor[], 'system');
        return `✅ ${r.colors.length} color(s) written`;
      },
    });
  }

  if (typography && typography.length > 0) {
    const replacing = currentStyles.system_typography.length > 0;
    steps.push({
      label: `Write ${typography.length} typography entry/entries → system slot${replacing ? ' (replaces existing)' : ''}`,
      fn: async () => {
        const r = await client.setGlobalTypography(typography as GlobalTypographyEntry[], 'system');
        return `✅ ${r.typography.length} entry/entries written`;
      },
    });
  }

  if (steps.length === 0) {
    lines.push('## Nothing to do');
    lines.push('  Provide at least one of: logo_media_id, homepage_page_id, colors, typography.');
    lines.push('  Tip: run get_global_styles first to see current state.');
    return { text: lines.join('\n') };
  }

  lines.push('## Steps');
  steps.forEach((s, i) => lines.push(`  ${i + 1}. ${s.label}`));

  if (!auto_execute) {
    lines.push('');
    lines.push('Run with auto_execute=true to apply.');
    return { text: lines.join('\n') };
  }

  lines.push('');
  lines.push('## Results');
  for (const step of steps) {
    try {
      const result = await step.fn();
      lines.push(`  ${result}`);
    } catch (err) {
      lines.push(`  ❌ ${step.label} — ${(err as Error).message}`);
    }
  }

  lines.push('');
  lines.push('Brand setup complete. Elementor CSS cache was cleared after each write.');
  return { text: lines.join('\n') };
}

export async function runCreatorMode(
  client: ElementifyClient,
  input: CreatorModeInput,
): Promise<WizardToolResult> {
  const {
    sections,
    save_as_template,
    write_to_page,
    dry_run = false,
  } = input;

  if (!save_as_template && !write_to_page) {
    return {
      text: 'Specify at least one of save_as_template or write_to_page.',
      isError: true,
    };
  }

  const libraryResult = await client.listTemplates({ status: 'publish', per_page: 100 });
  const allTemplates: ElementifyTemplate[] = libraryResult.templates;

  const lines: string[] = [
    `Creator Mode — ${sections.length} section(s) requested`,
    '',
    '## Template Selection',
  ];

  const selectedSources: Array<{ template_id: number; label: string }> = [];
  const unmatched: string[] = [];

  for (const sectionType of sections) {
    const match = pickBestTemplate(allTemplates, sectionType);
    if (match) {
      lines.push(`  "${sectionType}" → [${match.id}] "${match.title}"`);
      selectedSources.push({ template_id: match.id, label: sectionType });
    } else {
      lines.push(`  "${sectionType}" → ⚠ no match found in library`);
      unmatched.push(sectionType);
    }
  }

  if (selectedSources.length === 0) {
    lines.push('');
    lines.push('No templates matched any requested section type. Build some templates first:');
    lines.push('  1. Use list_elementor_pages to find existing pages');
    lines.push('  2. Use save_page_section_as_template to extract sections');
    lines.push('  3. Name templates clearly (e.g. "SECTION_Hero", "COMP_Pricing_Table")');
    return { text: lines.join('\n') };
  }

  if (unmatched.length > 0) {
    lines.push('');
    lines.push(`⚠ ${unmatched.length} section(s) had no library match and will be skipped: ${unmatched.join(', ')}`);
  }

  if (dry_run) {
    lines.push('');
    lines.push(`Dry run complete. ${selectedSources.length} template(s) selected.`);
    lines.push('Pass dry_run=false to compose and write.');
    return { text: lines.join('\n') };
  }

  lines.push('');
  lines.push('## Composing Layout');

  const composed: unknown[] = [];
  for (const src of selectedSources) {
    const data = await client.getTemplateData(src.template_id);
    const elements = data.elementor_data as unknown[];
    if (Array.isArray(elements) && elements.length > 0) {
      composed.push(...elements);
      lines.push(`  ✅ "${src.label}" — ${elements.length} element(s) from template ${src.template_id}`);
    } else {
      lines.push(`  ⚠ "${src.label}" — template ${src.template_id} has no Elementor data, skipped`);
    }
  }

  if (composed.length === 0) {
    lines.push('');
    lines.push('No data could be composed — all matched templates were empty.');
    return { text: lines.join('\n') };
  }

  lines.push(`  Total: ${composed.length} top-level element(s)`);
  lines.push('');
  lines.push('## Output');

  if (save_as_template) {
    const created = await client.createTemplate({
      title:  save_as_template.title,
      type:   save_as_template.template_type ?? 'page',
      status: save_as_template.status ?? 'draft',
    });
    await client.updateTemplateData(created.id, composed);
    lines.push(`  ✅ Template: "${save_as_template.title}" (ID: ${created.id}, status: ${save_as_template.status ?? 'draft'})`);
    lines.push(`     Shortcode: [elementor-template id="${created.id}"]`);
  }

  if (write_to_page) {
    await client.updatePageData(write_to_page.page_id, composed);
    lines.push(`  ✅ Page ${write_to_page.page_id} updated. Elementor cache cleared.`);
  }

  return { text: lines.join('\n') };
}

// ------------------------------------------------------------------ //
// Tool registration
// ------------------------------------------------------------------ //

interface RegisterWizardToolOptions {
  includeFree?: boolean;
  includeAdvanced?: boolean;
}

export function registerWizardTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
  options: RegisterWizardToolOptions = {},
): void {
  const includeFree = options.includeFree ?? true;
  const includeAdvanced = options.includeAdvanced ?? true;

  // ---------------------------------------------------------------- //
  // set_site_logo
  // ---------------------------------------------------------------- //
  if (includeFree) {
    server.tool(
    'set_site_logo',
    'Set the site logo to an existing WordPress media attachment. The logo is written to the WP custom_logo theme-mod (used by all major themes and Elementor) and to Elementor\'s own site_logo option. Requires the media attachment to already exist — use list_media or upload_media first if needed.',
    {
      site_id:  z.string().optional(),
      media_id: z.number().int().positive().describe('ID of the image attachment in the WordPress media library'),
      note: z.string().optional()
           .describe('Optional note for queued changes (auto-queued for L2 governance)'),
      consent: z.boolean().optional()
           .describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async ({ site_id, media_id, note, consent }) => {
      const client = getClient(site_id);
      const toolName = 'set_site_logo';
      const level = GOVERNANCE_LEVELS[toolName] || 'L0';
      
      // L3 requires explicit consent
      if (level === 'L3' && consent !== true) {
        return {
          content: [{
            type: 'text',
            text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
          }],
        };
      }
      
      // L2 always queues regardless of write_mode
      if (level === 'L2' || level === 'L3') {
        const change = await client.createChange({
          operation: toolName,
          params: { media_id },
          note: note || `Auto-queued by governance level ${level}`,
        });

        const lines = [
          `🟡 Change queued for review (governance level ${level})`,
          `   ID: ${change.id}`,
          `   Operation: ${toolName}`,
          note ? `   Note: ${note}` : '',
          '',
          'Next steps:',
          '  1. review_change(change_id, "approve") — approve it',
          '  2. apply_change(change_id)             — execute it on the site',
          '  Or: review_change(change_id, "reject") to discard.',
          '',
          'Use list_change_queue to see all pending changes.',
        ].filter(Boolean);

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
      
      // L0/L1: Execute directly
      const result = await client.setLogo(media_id);
      return {
        content: [{
          type: 'text',
          text: [
            `✅ Logo set — Media ID: ${result.logo_id}`,
            result.logo_url ? `   URL: ${result.logo_url}` : '',
            '   Elementor CSS cache cleared.',
          ].filter(Boolean).join('\n'),
        }],
      };
    },
  );

  // ---------------------------------------------------------------- //
  // wizard_brand_setup
  // ---------------------------------------------------------------- //
    server.tool(
    'wizard_brand_setup',
    'Run the Brand Setup Wizard. Assesses the current brand state, then — based on what you provide — writes colors, typography, and/or logo in one coordinated step. Returns a full before/after report. Pass auto_execute=true to apply everything immediately; omit it (or set false) to get a dry-run plan first.\n\nThis is the entry point for the automated brand setup workflow. It replaces the need to manually configure Elementor → Site Settings → Global Colors/Typography.',
    {
      site_id:      z.string().optional(),
      auto_execute: z.boolean().optional().default(false)
                     .describe('If true, immediately apply all provided brand data. If false, return a plan only.'),
      focus: z.array(z.string()).optional()
              .describe('Optional guidance focus only. Used to keep the dry-run context aligned with routed recommendations.'),
      logo_media_id: z.number().int().positive().optional()
                      .describe('Media attachment ID to set as site logo'),
      homepage_page_id: z.number().int().positive().optional()
                         .describe('Page ID to set as homepage (optional)'),
      colors: z.array(z.object({
        id:    z.string().optional(),
        title: z.string(),
        color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
      })).optional().describe('Global color palette. Recommended: Primary, Secondary, Text, Accent.'),
      typography: z.array(z.object({
        id:             z.string().optional(),
        title:          z.string(),
        font_family:    z.string().optional(),
        font_size:      z.number().int().min(8).max(200).optional(),
        font_weight:    z.string().optional(),
        line_height:    z.number().min(0.5).max(5).optional(),
        letter_spacing: z.number().optional(),
        text_transform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
      })).optional().describe('Global typography definitions.'),
    },
    async ({ site_id, auto_execute, focus, logo_media_id, homepage_page_id, colors, typography }) => {
      const client = getClient(site_id);
      const result = await runBrandSetupWizard(client, {
        auto_execute,
        focus,
        logo_media_id,
        homepage_page_id,
        colors,
        typography,
      });
      return { content: [{ type: 'text', text: result.text }] };
    },
  );

  // ---------------------------------------------------------------- //
  // creator_mode
  // ---------------------------------------------------------------- //
    server.tool(
    'creator_mode',
    'Compose a new page or set of sections by intelligently selecting templates from your library that match the requested section types. For each requested section, the best-matching template is selected using title/tag/category scoring. The composed layout is then saved as a new template and/or written directly to a target page.\n\nThis is the "build from brief" workflow: provide a list of section types (e.g. ["hero", "features", "pricing", "cta"]) and Elementify assembles a coherent layout from your own template library — respecting global colors, typography, and brand context already configured.',
    {
      site_id: z.string().optional(),
      sections: z.array(z.string()).min(1).max(20)
                  .describe('Ordered list of section types to include, e.g. ["hero", "about", "features", "pricing", "testimonials", "cta", "contact"]. Each entry is matched against your template library by title, tags, and categories.'),
      save_as_template: z.object({
        title:         z.string(),
        template_type: z.enum(['page', 'section', 'container']).optional().default('page'),
        status:        z.enum(['publish', 'draft']).optional().default('draft'),
      }).optional().describe('Save the composed layout as a new library template'),
      write_to_page: z.object({
        page_id: z.number().int().describe('Target page ID. Must be an Elementor page (requires pages:write).'),
      }).optional().describe('Write the composed layout directly to this page'),
      dry_run: z.boolean().optional().default(false)
                .describe('If true, show the matching plan without executing. Useful to review template selection before writing.'),
    },
    async ({ site_id, sections, save_as_template, write_to_page, dry_run }) => {
      if (!save_as_template && !write_to_page) {
        return {
          content: [{ type: 'text', text: 'Specify at least one of save_as_template or write_to_page.' }],
          isError: true,
        };
      }

      const client = getClient(site_id);
      const result = await runCreatorMode(client, {
        sections,
        save_as_template,
        write_to_page,
        dry_run,
      });
      return {
        content: [{ type: 'text', text: result.text }],
        isError: result.isError,
      };
    },
  );
  }

  // ---------------------------------------------------------------- //
  // wizard_theme_builder
  // ---------------------------------------------------------------- //
  if (includeAdvanced) {
    server.tool(
    'wizard_theme_builder',
    'Create an Elementor Theme Builder template (header, footer, single post, archive, 404, etc.) with display conditions. You can supply content via source_template_id (copy from existing template), sections (compose from library like creator_mode), or leave empty to create a blank template to fill later. Conditions default to "all" (show everywhere).',
    {
      site_id:            z.string().optional(),
      type:               z.enum(['header','footer','single','single-post','single-page','archive','search','error-404','popup'])
                           .describe('Theme Builder template type'),
      title:              z.string().describe('Template title, e.g. "Main Header", "Blog Footer"'),
      conditions:         z.enum(['all','front_page','singular','archive','posts']).optional().default('all')
                           .describe('Where this template is displayed'),
      status:             z.enum(['publish','draft']).optional().default('publish'),
      source_template_id: z.number().int().optional()
                           .describe('Copy Elementor data from this existing library template'),
      sections:           z.array(z.string()).optional()
                           .describe('Compose content by matching these section types from library (like creator_mode)'),
      dry_run:            z.boolean().optional().default(false),
    },
    async ({ site_id, type, title, conditions, status, source_template_id, sections, dry_run }) => {
      const client = getClient(site_id);

      const lines: string[] = [
        `Theme Builder Wizard — ${type}: "${title}"`,
        `Conditions: ${conditions ?? 'all'} · Status: ${status ?? 'publish'}`,
        '',
      ];

      // Determine content source
      let elementorData: unknown[] | undefined;
      let contentSource = 'blank';

      if (source_template_id) {
        contentSource = `template ${source_template_id}`;
        lines.push(`## Content Source: template ${source_template_id}`);
        if (!dry_run) {
          const tplData = await client.getTemplateData(source_template_id);
          elementorData = tplData.elementor_data as unknown[];
          lines.push(`  ${elementorData.length} element(s) loaded`);
        } else {
          lines.push('  (dry run — data not fetched)');
        }
      } else if (sections && sections.length > 0) {
        contentSource = `composed from: ${sections.join(', ')}`;
        lines.push(`## Content Source: compose [${sections.join(', ')}]`);

        if (!dry_run) {
          const libraryResult = await client.listTemplates({ status: 'publish', per_page: 100 });
          const allTemplates: ElementifyTemplate[] = libraryResult.templates;
          elementorData = [];

          for (const sectionType of sections) {
            const match = pickBestTemplate(allTemplates, sectionType);
            if (match) {
              const data = await client.getTemplateData(match.id);
              const elements = data.elementor_data as unknown[];
              elementorData.push(...elements);
              lines.push(`  "${sectionType}" → [${match.id}] "${match.title}" (${elements.length} elements)`);
            } else {
              lines.push(`  "${sectionType}" → ⚠ no match`);
            }
          }
        } else {
          for (const s of sections) lines.push(`  "${s}" → (dry run — not matched)`);
        }
      } else {
        lines.push('## Content: blank template (fill in Elementor editor)');
      }

      if (dry_run) {
        lines.push('');
        lines.push(`Dry run complete. Pass dry_run=false to create the "${type}" template.`);
        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }

      lines.push('');
      lines.push('## Creating template...');

      const created = await client.createThemeBuilderTemplate({
        title,
        type: type as string,
        elementor_data: elementorData,
        conditions: conditions ?? 'all',
        status: status ?? 'publish',
      });

      lines.push(`✅ Template created — ID: ${created.id}`);
      lines.push(`   Type: ${created.type} · Status: ${created.status}`);
      lines.push(`   Conditions: ${JSON.stringify(created.conditions)}`);
      lines.push(`   Content: ${contentSource}`);
      lines.push('');
      lines.push('Elementor CSS cache cleared. The template is now active.');

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );
  }
}

export function registerFreeWizardTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  registerWizardTools(server, getClient, { includeFree: true, includeAdvanced: false });
}

export function registerAdvancedWizardTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  registerWizardTools(server, getClient, { includeFree: false, includeAdvanced: true });
}
