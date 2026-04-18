import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  ElementifyClient,
  ProjectProfile,
} from '../client.js';

import { buildCapabilityMatrix } from '../destination.js';
import { buildSiteFingerprint } from '../fingerprint.js';


export type { Recommendation, RecommendationCategory } from '@elementify/shared';
export { buildRecommendationReport, buildRecommendations } from '../recommendations.js';

function normalizeProjectProfileInput(
  profile?: Partial<ProjectProfile> | null,
): ProjectProfile | undefined {
  if (!profile) {
    return undefined;
  }

  return {
    editing_mode: profile.editing_mode ?? 'draft-first',
    copy_density: profile.copy_density ?? 'balanced',
    layout_priority: profile.layout_priority ?? 'balanced',
    change_style: profile.change_style ?? 'adaptive',
    question_policy: profile.question_policy ?? 'ask-on-ambiguity',
    notes: profile.notes ?? null,
  };
}

// ------------------------------------------------------------------ //
// Tool registration
// ------------------------------------------------------------------ //

export function registerRecommendationTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {

  // ---------------------------------------------------------------- //
  // set_site_context
  // ---------------------------------------------------------------- //
  server.tool(
    'set_site_context',
    'Store context about who is using the site and what it is for. This context is used by get_recommendations to tailor its output. Call this once during onboarding or whenever the context changes.',
    {
      site_id:          z.string().optional(),
      user_role:        z.enum(['freelancer', 'agency', 'site-owner', 'ai-agent']).optional()
                         .describe('Who is operating this site'),
      site_purpose:     z.enum(['ecommerce', 'corporate', 'portfolio', 'blog', 'community', 'other']).optional()
                         .describe('Primary purpose of the site'),
      brand_notes:      z.string().optional()
                         .describe('Brand guidelines, color descriptions, tone of voice, etc.'),
      target_audience:  z.string().optional()
                         .describe('Who the site is for (e.g. "B2B enterprise", "creative professionals")'),
      primary_language: z.string().optional()
                         .describe('Primary content language, e.g. "en", "de"'),
      project_profile: z.object({
        editing_mode: z.enum(['direct-edit', 'draft-first', 'approval-first']).optional(),
        copy_density: z.enum(['compact', 'balanced', 'complete']).optional(),
        layout_priority: z.enum(['preserve-existing-layout', 'preserve-copy-completeness', 'balanced']).optional(),
        change_style: z.enum(['minimal', 'adaptive', 'transformative']).optional(),
        question_policy: z.enum(['ask-on-ambiguity', 'choose-conservative-default', 'prefer-complete-content']).optional(),
        notes: z.string().nullable().optional(),
      }).optional().describe('Optional Elementify project profile that shapes editing posture, copy density, and approval behavior.'),
    },
    async ({ site_id, project_profile, ...ctx }) => {
      const client = getClient(site_id);
      const saved = await client.setSiteContext({
        ...ctx,
        ...(project_profile ? { project_profile: normalizeProjectProfileInput(project_profile) } : {}),
      });
      const lines = [
        '✅ Site context saved.',
        '',
        `  User role:       ${saved.user_role ?? '—'}`,
        `  Site purpose:    ${saved.site_purpose ?? '—'}`,
        `  Target audience: ${saved.target_audience ?? '—'}`,
        `  Language:        ${saved.primary_language ?? '—'}`,
        `  Brand notes:     ${saved.brand_notes ? saved.brand_notes.slice(0, 80) + (saved.brand_notes.length > 80 ? '…' : '') : '—'}`,
        `  Project profile: ${saved.project_profile ? `${saved.project_profile.editing_mode}, ${saved.project_profile.copy_density}, ${saved.project_profile.layout_priority}` : '—'}`,
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ---------------------------------------------------------------- //
  // get_site_context
  // ---------------------------------------------------------------- //
  server.tool(
    'get_site_context',
    'Retrieve the stored site context (user role, site purpose, brand notes). Returns null fields if context has not been set yet.',
    { site_id: z.string().optional() },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const ctx = await client.getSiteContext();
      if (!ctx.set_at) {
        return {
          content: [{ type: 'text', text: 'No site context set yet. Use set_site_context to configure.' }],
        };
      }
      const lines = [
        `Site context (set ${ctx.set_at}):`,
        `  User role:       ${ctx.user_role ?? '—'}`,
        `  Site purpose:    ${ctx.site_purpose ?? '—'}`,
        `  Target audience: ${ctx.target_audience ?? '—'}`,
        `  Language:        ${ctx.primary_language ?? '—'}`,
        `  Brand notes:     ${ctx.brand_notes ?? '—'}`,
        `  Project profile: ${ctx.project_profile ? `${ctx.project_profile.editing_mode}, ${ctx.project_profile.copy_density}, ${ctx.project_profile.layout_priority}` : '—'}`,
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ---------------------------------------------------------------- //
  // get_recommendations
  // ---------------------------------------------------------------- //
  server.tool(
    'get_recommendations',
    'Run the assessment and recommendation engine. Returns a prioritized, context-aware list of next steps for the site — filtered by user role, site purpose, and current state. Each recommendation includes the MCP tools needed to execute it and any dependencies. Use this as the entry point for any wizard workflow.',
    {
      site_id:     z.string().optional(),
      category:    z.enum(['brand', 'structure', 'library', 'performance', 'content', 'seo', 'woocommerce']).optional()
                    .describe('Filter to a single category (omit for all)'),
      max_results: z.number().int().min(1).max(20).optional().default(10)
                    .describe('Maximum number of recommendations to return'),
      automated_only: z.boolean().optional().default(false)
                       .describe('Return only recommendations the AI can execute without human input'),
    },
    async ({ site_id, category, max_results, automated_only }) => {
      const client = getClient(site_id);

      const [assessment, context] = await Promise.all([
        client.assessSite(),
        client.getSiteContext(),
      ]);
      const fingerprint = buildSiteFingerprint(assessment);
      const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);
      const report = buildRecommendationReport({
        assessment,
        context,
        fingerprint,
        capabilityMatrix,
      });

      let recs = report.recommendations;

      if (category) {
        recs = recs.filter((r: Recommendation) => r.category === category);
      }
      if (automated_only) {
        recs = recs.filter((r: Recommendation) => r.automated);
      }
      recs = recs.slice(0, max_results ?? 10);

      if (recs.length === 0) {
        return {
          content: [{ type: 'text', text: 'No recommendations match the current filters. The site may already be well-configured in this area.' }],
        };
      }

      const lines: string[] = [
        `Recommendations for ${assessment.wordpress.site_name}`,
        `Context: role=${context.user_role ?? 'unknown'} · purpose=${context.site_purpose ?? 'unknown'}`,
        `Destination: ${report.destination.label}`,
        `Compatibility: ${report.compatibilitySummary}`,
        `${recs.length} recommendation(s):`,
        '',
      ];

      if (report.capabilityWarnings.length > 0) {
        lines.push('Warnings:');
        lines.push(
          ...report.capabilityWarnings.map((warning: string) => `  - ${warning}`),
        );
        lines.push('');
      }

      for (const rec of recs) {
        const autoFlag = rec.automated ? ' [auto]' : ' [needs input]';
        lines.push(`## ${rec.priority}. [${rec.id}] ${rec.title}${autoFlag}`);
        lines.push(`   Category: ${rec.category} · Impact: ${rec.impact} · Effort: ${rec.effort}`);
        lines.push(`   ${rec.description}`);
        if (rec.tools.length > 0) {
          lines.push(`   Tools: ${rec.tools.join(', ')}`);
        }
        if (rec.blocked_by.length > 0) {
          lines.push(`   Depends on: ${rec.blocked_by.join(', ')}`);
        }
        lines.push('');
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ---------------------------------------------------------------- //
  // explain_recommendation
  // ---------------------------------------------------------------- //
  server.tool(
    'explain_recommendation',
    'Get a detailed, step-by-step guide for a specific recommendation from get_recommendations. Returns the full problem description, root cause, exact tool calls to execute, expected output, and validation steps. Use this as the entry point for guided wizard flows.',
    {
      site_id:           z.string().optional(),
      recommendation_id: z.string().describe('The id field from a recommendation, e.g. "set_logo", "define_global_colors", "categorize_templates"'),
    },
    async ({ site_id, recommendation_id }) => {
      const client = getClient(site_id);

      // Run assessment + context to provide current-state context in the guide
      const [assessment, context] = await Promise.all([
        client.assessSite(),
        client.getSiteContext(),
      ]);
      const fingerprint = buildSiteFingerprint(assessment);
      const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);

      // Build all recommendations to check if this one currently applies
      const allRecs = buildRecommendationReport({
        assessment,
        context,
        fingerprint,
        capabilityMatrix,
      }).recommendations;
      const rec = allRecs.find((r: Recommendation) => r.id === recommendation_id);

      const guides: Record<string, string> = {
        set_logo: `## Set Site Logo

**Problem**: No logo is set. The site falls back to text-only branding in the header.

**Impact**: High — the logo appears in the header template on every page. Without it, the site looks unfinished and untrustworthy.

**Steps**:
1. Upload your logo to the WordPress media library (if not already there):
   - Go to WordPress Admin → Media → Add New, or
   - Use \`sideload_stock_image\` if you have a URL

2. Get the media attachment ID (shown after upload, or from the URL bar in Media Library)

3. Set the logo:
\`\`\`
set_site_logo({ media_id: <your_attachment_id> })
\`\`\`

4. Or use the wizard for a full brand setup in one step:
\`\`\`
wizard_brand_setup({ auto_execute: true, logo_media_id: <id>, colors: [...] })
\`\`\`

**Validation**: Run \`assess_site\` — brand.logo_set should be true.
**Notes**: Works with Astra, GeneratePress, Hello Elementor, and all major themes.`,

        define_global_colors: `## Define Global Color Palette

**Problem**: No global colors are defined in the Elementor Kit. Every element uses its own color, making consistency impossible to maintain.

**Impact**: High — a global palette lets you rebrand the entire site by changing 4 values. Without it, a color change requires editing hundreds of elements.

**Current state**: ${assessment.brand.global_colors_count} color(s) defined (Kit ID: ${assessment.elementor.active_kit_id ?? 'none'})

**Recommended system palette** (Primary / Secondary / Text / Accent):
- Primary: your main brand color (headers, buttons, links)
- Secondary: background / surface color
- Text: body text color
- Accent: highlight / CTA color

**Steps**:
\`\`\`
set_global_colors({
  colors: [
    { id: "primary",   title: "Primary",   color: "#1A56DB" },
    { id: "secondary", title: "Secondary", color: "#F3F4F6" },
    { id: "text",      title: "Text",      color: "#111827" },
    { id: "accent",    title: "Accent",    color: "#6EC1E4" }
  ],
  slot: "system"
})
\`\`\`

Replace the hex values with your brand colors. Or use \`wizard_brand_setup\` to set colors + typography + logo together.

**Validation**: Run \`get_global_styles\` — system_colors should list 4 entries.`,

        define_global_typography: `## Define Global Typography

**Problem**: No global typography is set. Font families and sizes vary per element, making the site look inconsistent.

**Impact**: High — global typography means changing one setting updates all headings or body text across the entire site.

**Current state**: ${assessment.brand.global_typography_count} typography entry/entries defined

**Recommended system typography** (Primary / Secondary / Text / Accent):
- Primary: main body/paragraph font
- Secondary: subheadings, captions
- Text: UI labels, small text
- Accent: pull quotes, featured text

**Steps**:
\`\`\`
set_global_typography({
  typography: [
    { id: "primary",   title: "Primary",   font_family: "Inter",            font_size: 16, font_weight: "400", line_height: 1.6 },
    { id: "secondary", title: "Secondary", font_family: "Inter",            font_size: 14, font_weight: "400", line_height: 1.5 },
    { id: "text",      title: "Text",      font_family: "Inter",            font_size: 16, font_weight: "600" },
    { id: "accent",    title: "Accent",    font_family: "Playfair Display", font_size: 20, font_weight: "700" }
  ]
})
\`\`\`

**Note**: Font names must be exact Google Fonts names. Check fonts.google.com if unsure.
**Validation**: Run \`get_global_styles\` — system_typography should list the entries.`,

        create_header_template: `## Create a Theme Builder Header

**Problem**: No published header template exists. The site uses the active theme's default header.

**Impact**: High — the header appears on every page. Without an Elementor header template, the design is limited by the theme.

**Current state**: ${(assessment.theme_builder['header'] ?? []).length} header template(s) found

**Option A — compose from library sections**:
\`\`\`
wizard_theme_builder({
  type: "header",
  title: "Main Header",
  sections: ["header", "nav", "navigation", "logo"],
  conditions: "all"
})
\`\`\`

**Option B — copy from an existing template**:
\`\`\`
wizard_theme_builder({
  type: "header",
  title: "Main Header",
  source_template_id: <template_id>,
  conditions: "all"
})
\`\`\`

**Option C — create blank, edit in Elementor**:
\`\`\`
wizard_theme_builder({ type: "header", title: "Main Header", conditions: "all" })
\`\`\`

Then open the template in Elementor → Theme Builder → Header.

**Dependencies**: Set logo and global colors first for best results.
**Validation**: Run \`assess_site\` — theme_builder.header should list a published template.`,

        create_footer_template: `## Create a Theme Builder Footer

**Problem**: No published footer template exists. Uses theme default footer.

**Impact**: High — footer appears on every page; typically contains copyright, navigation, and contact info.

**Steps**:
\`\`\`
wizard_theme_builder({
  type: "footer",
  title: "Main Footer",
  sections: ["footer", "contact", "copyright", "social"],
  conditions: "all"
})
\`\`\`

Or create blank:
\`\`\`
wizard_theme_builder({ type: "footer", title: "Main Footer", conditions: "all" })
\`\`\`

**Validation**: Run \`assess_site\` — theme_builder.footer should list a published template.`,

        categorize_templates: `## Categorize Templates

**Problem**: ${assessment.template_library.uncategorized} template(s) have no category. This makes \`creator_mode\` less effective (it matches sections by title/tag/category).

**Impact**: Medium — well-organized libraries enable reliable AI-driven composition.

**Steps**:
1. Get a full picture of what's uncategorized:
\`\`\`
audit_library({})
\`\`\`

2. Apply categories to a template:
\`\`\`
set_category({ id: <template_id>, category: "hero" })
set_tags({ id: <template_id>, tags: ["section", "above-fold"] })
\`\`\`

3. For bulk rename with naming conventions:
\`\`\`
bulk_rename({ pattern: "Hero*", prefix: "SECTION_" })
\`\`\`

**Naming convention**: SECTION_ (full-width rows), COMP_ (components/cards), PAGE_ (full page layouts)
**Validation**: Run \`audit_library\` — uncategorized count should decrease.`,

        switch_css_to_external: `## Switch CSS Print Method to External

**Problem**: Elementor CSS is embedded inline in every page (internal embedding). This prevents browser and CDN caching.

**Impact**: Medium — on repeat visits, external CSS files load from browser cache. Internal embedding re-sends all CSS with every page load.

**Steps**:
1. In WordPress Admin: Elementor → Settings → Advanced → CSS Print Method → External File
2. Save changes, then clear any cache plugins (LiteSpeed Cache, W3TC, etc.)

**Cannot be automated** — this setting is in the Elementor admin UI. Elementor Pro users can also set it via the Elementor CLI.

**Validation**: View page source after clearing cache — you should see a \`<link rel="stylesheet">\` instead of a \`<style>\` block.`,

        install_seo_plugin: `## Install an SEO Plugin

**Problem**: No recognized SEO plugin is active. Meta titles, descriptions, sitemaps, and structured data are not managed.

**Impact**: High — without SEO metadata, Google shows random page content as the description, reducing click-through rates.

**Active plugins**: ${JSON.stringify(assessment.plugins.classified)}

**Recommended**: Rank Math SEO (free tier is comprehensive, integrates with Elementor)

**Steps**:
1. WordPress Admin → Plugins → Add New → search "Rank Math SEO"
2. Install and activate
3. Run the Rank Math setup wizard

**Cannot be automated** — plugin installation requires WP admin credentials.
**Validation**: Run \`assess_site\` — plugins.classified.seo should be non-empty.`,

        build_first_elementor_page: `## Build the First Elementor Page

**Problem**: No pages are built with Elementor yet. The site is not using the page builder at all.

**Impact**: High — without Elementor pages, all other Elementify features are underutilized.

**Steps**:
1. Check what pages exist (may not be Elementor pages yet):
\`\`\`
list_elementor_pages({})
\`\`\`

2. Use Creator Mode to build a page from your template library:
\`\`\`
creator_mode({
  sections: ["hero", "about", "features", "cta"],
  write_to_page: { page_id: <homepage_id> }
})
\`\`\`

3. Or compose from specific templates:
\`\`\`
compose_page_from_templates({
  sources: [{ template_id: 1 }, { template_id: 2 }],
  write_to_page: { page_id: <page_id> }
})
\`\`\`

**Prerequisite**: Set global colors and typography first for consistent styling.
**Validation**: Run \`list_elementor_pages\` — should show pages with elementor_edit_mode = builder.`,

        create_woocommerce_templates: `## Create WooCommerce Theme Builder Templates

**Problem**: WooCommerce is active but no product or shop archive template is in Theme Builder. Product pages use the default WooCommerce layout.

**Impact**: High — the default WC product layout is generic and often clashes with the site design.

**Steps**:
1. Create a single product template:
\`\`\`
wizard_theme_builder({
  type: "single",
  title: "Product — Single",
  sections: ["product", "details", "gallery"],
  conditions: "singular"
})
\`\`\`

2. Create a shop archive template:
\`\`\`
wizard_theme_builder({
  type: "archive",
  title: "Shop Archive",
  sections: ["products", "grid", "filter"],
  conditions: "archive"
})
\`\`\`

**Note**: Requires Elementor Pro for full WooCommerce widget support.
**Validation**: Run \`assess_site\` — theme_builder should show single and archive entries.`,

        unlock_theme_builder_capability: `## Unlock Theme Builder Workflows

**Problem**: The current destination profile does not reliably support Theme Builder workflows yet.

**Impact**: High — without Theme Builder capability, header, footer, archive, single, and WooCommerce templates cannot be rolled out confidently.

**Steps**:
1. Run \`get_destination_capabilities\` to confirm the current destination profile and limitations
2. If Elementor Free is active, upgrade to Elementor Pro or install the required assisted workflow plugins
3. Re-run \`assess_site\` and \`get_recommendations\`
4. Only then create header, footer, archive, single, or WooCommerce templates

**Validation**: \`get_destination_capabilities\` should report Theme Builder capability as available, and the compatibility summary should improve.`,
      };

      const guide = guides[recommendation_id];

      if (!guide) {
        const knownIds = Object.keys(guides);
        return {
          content: [{
            type: 'text',
            text: [
              `No detailed guide available for recommendation "${recommendation_id}".`,
              '',
              `Known recommendation IDs: ${knownIds.join(', ')}`,
              '',
              rec
                ? `This recommendation is currently active: ${rec.title}`
                : `"${recommendation_id}" is not currently in your recommendation list — run get_recommendations to see active recommendations.`,
            ].join('\n'),
          }],
        };
      }

      const relevanceNote = rec
        ? `> **Status**: This recommendation is currently active for ${assessment.wordpress.site_name}.\n\n`
        : `> **Status**: This recommendation is not currently triggered — your site may already satisfy this condition.\n\n`;

      return {
        content: [{
          type: 'text',
          text: relevanceNote + guide,
        }],
      };
    },
  );
}
