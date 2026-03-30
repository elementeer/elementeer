import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  ElementifyClient,
  SiteAssessment,
  SiteContext,
} from '../client.js';

// ------------------------------------------------------------------ //
// Types
// ------------------------------------------------------------------ //

export type RecommendationCategory =
  | 'brand'
  | 'structure'
  | 'library'
  | 'performance'
  | 'content'
  | 'seo'
  | 'woocommerce';

export interface Recommendation {
  id: string;
  priority: 1 | 2 | 3 | 4 | 5;           // 1 = highest
  category: RecommendationCategory;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  automated: boolean;                      // can AI do this without human input?
  tools: string[];                         // MCP tools to invoke
  blocked_by: string[];                    // recommendation IDs that must run first
}

// ------------------------------------------------------------------ //
// Rule engine
// ------------------------------------------------------------------ //

export function buildRecommendations(
  assessment: SiteAssessment,
  context: SiteContext,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const role = context.user_role;

  // Helper — only include if condition is true
  const add = (rec: Recommendation, condition: boolean) => {
    if (condition) recs.push(rec);
  };

  const hasThemeBuilder = (type: string) =>
    (assessment.theme_builder[type] ?? []).some((t) => t.status === 'publish');

  const hasAnyPosts = (assessment.pages.by_post_type['post'] ?? 0) > 0;

  // ---------------------------------------------------------------- //
  // BRAND
  // ---------------------------------------------------------------- //

  add(
    {
      id: 'set_logo',
      priority: 1,
      category: 'brand',
      title: 'Set site logo',
      description: 'No logo is set. Upload the logo to the media library, then provide the media_id to set_site_logo or wizard_brand_setup. This affects the header template and all pages.',
      impact: 'high',
      effort: 'low',
      automated: true,
      tools: ['set_site_logo'],
      blocked_by: [],
    },
    !assessment.brand.logo_set,
  );

  add(
    {
      id: 'define_global_colors',
      priority: 1,
      category: 'brand',
      title: 'Define global color palette',
      description: 'No global colors are defined in the Elementor Kit. A palette ensures design consistency across all pages and templates. Provide brand colors (hex values + names) and the AI can write them directly with set_global_colors.',
      impact: 'high',
      effort: 'medium',
      automated: true,
      tools: ['get_global_styles', 'set_global_colors'],
      blocked_by: [],
    },
    assessment.brand.global_colors_count === 0,
  );

  add(
    {
      id: 'define_global_typography',
      priority: 2,
      category: 'brand',
      title: 'Define global typography',
      description: 'No global typography is set in the Elementor Kit. Provide font names (Google Fonts or system fonts), sizes, and weights — the AI can write them directly with set_global_typography.',
      impact: 'high',
      effort: 'medium',
      automated: true,
      tools: ['get_global_styles', 'set_global_typography'],
      blocked_by: ['define_global_colors'],
    },
    assessment.brand.global_typography_count === 0,
  );

  // ---------------------------------------------------------------- //
  // STRUCTURE — Theme Builder
  // ---------------------------------------------------------------- //

  add(
    {
      id: 'create_header_template',
      priority: 1,
      category: 'structure',
      title: 'Create a Theme Builder header',
      description: 'No published header template exists. Without it, the site falls back to the active theme\'s default header. Create a header template in Elementor → Theme Builder → Header.',
      impact: 'high',
      effort: 'medium',
      automated: false,
      tools: [],
      blocked_by: ['set_logo', 'define_global_colors'],
    },
    !hasThemeBuilder('header'),
  );

  add(
    {
      id: 'create_footer_template',
      priority: 1,
      category: 'structure',
      title: 'Create a Theme Builder footer',
      description: 'No published footer template exists. Create a footer template in Elementor → Theme Builder → Footer.',
      impact: 'high',
      effort: 'medium',
      automated: false,
      tools: [],
      blocked_by: ['set_logo', 'define_global_colors'],
    },
    !hasThemeBuilder('footer'),
  );

  add(
    {
      id: 'create_single_post_template',
      priority: 3,
      category: 'structure',
      title: 'Create a single post template',
      description: `The site has ${assessment.pages.by_post_type['post']} post(s) but no single post Theme Builder template. Blog content is being rendered by the default theme layout.`,
      impact: 'medium',
      effort: 'medium',
      automated: false,
      tools: [],
      blocked_by: ['create_header_template', 'create_footer_template'],
    },
    hasAnyPosts && !hasThemeBuilder('single') && !hasThemeBuilder('single-post'),
  );

  add(
    {
      id: 'create_archive_template',
      priority: 4,
      category: 'structure',
      title: 'Create an archive template',
      description: 'No archive template is defined. Category, tag, and date archive pages fall back to the theme default.',
      impact: 'medium',
      effort: 'medium',
      automated: false,
      tools: [],
      blocked_by: ['create_header_template', 'create_footer_template'],
    },
    hasAnyPosts && !hasThemeBuilder('archive'),
  );

  add(
    {
      id: 'create_404_template',
      priority: 4,
      category: 'structure',
      title: 'Create a 404 template',
      description: 'No 404 error page template is set. A branded 404 page improves user experience and keeps visitors on the site.',
      impact: 'low',
      effort: 'low',
      automated: false,
      tools: [],
      blocked_by: ['create_header_template', 'create_footer_template'],
    },
    !hasThemeBuilder('error-404'),
  );

  // ---------------------------------------------------------------- //
  // LIBRARY — Template organization
  // ---------------------------------------------------------------- //

  const uncategorized = assessment.template_library.uncategorized;
  add(
    {
      id: 'categorize_templates',
      priority: 2,
      category: 'library',
      title: `Categorize ${uncategorized} uncategorized templates`,
      description: `${uncategorized} templates have no category. Run audit_library to get a proposed categorization, then apply it with set_category or bulk_rename. Well-organized libraries enable reliable composition workflows.`,
      impact: 'medium',
      effort: 'low',
      automated: true,
      tools: ['audit_library', 'set_category', 'set_tags'],
      blocked_by: [],
    },
    uncategorized > 5,
  );

  add(
    {
      id: 'tag_templates_by_type',
      priority: 3,
      category: 'library',
      title: 'Tag templates by purpose (SECTION_, COMP_, PAGE_)',
      description: 'Templates without naming conventions are hard for AI agents to reason about. Use bulk_rename to apply SECTION_, COMP_, or PAGE_ prefixes. This makes compose_page_from_templates much more reliable.',
      impact: 'medium',
      effort: 'medium',
      automated: true,
      tools: ['list_templates', 'audit_library', 'bulk_rename', 'set_tags'],
      blocked_by: ['categorize_templates'],
    },
    assessment.template_library.total > 10,
  );

  // ---------------------------------------------------------------- //
  // PERFORMANCE
  // ---------------------------------------------------------------- //

  add(
    {
      id: 'switch_css_to_external',
      priority: 3,
      category: 'performance',
      title: 'Switch CSS to external files',
      description: 'Elementor CSS is currently embedded inline ("internal"). External CSS files are cached by browsers and CDNs, improving load time on repeat visits. Change in Elementor → Settings → Advanced → CSS Print Method.',
      impact: 'medium',
      effort: 'low',
      automated: false,
      tools: [],
      blocked_by: [],
    },
    assessment.performance.css_print_method === 'internal',
  );

  add(
    {
      id: 'disable_fa4_shim',
      priority: 5,
      category: 'performance',
      title: 'Disable Font Awesome 4 compatibility shim',
      description: 'The FA4 shim loads an extra compatibility layer. If no widgets rely on FA4 icon names (fa-*), disable it in Elementor → Settings → Advanced.',
      impact: 'low',
      effort: 'low',
      automated: false,
      tools: [],
      blocked_by: [],
    },
    assessment.performance.load_fa4_shim,
  );

  // ---------------------------------------------------------------- //
  // CONTENT — Page coverage
  // ---------------------------------------------------------------- //

  add(
    {
      id: 'build_first_elementor_page',
      priority: 1,
      category: 'content',
      title: 'No Elementor pages found — build the first page',
      description: 'No pages are built with Elementor yet. Start by selecting a target page and using compose_page_from_templates or save_full_page_as_template to create the initial layout.',
      impact: 'high',
      effort: 'medium',
      automated: true,
      tools: ['list_elementor_pages', 'compose_page_from_templates', 'update_page_data'],
      blocked_by: ['define_global_colors', 'define_global_typography'],
    },
    assessment.pages.elementor_total === 0,
  );

  // ---------------------------------------------------------------- //
  // SEO
  // ---------------------------------------------------------------- //

  add(
    {
      id: 'install_seo_plugin',
      priority: 2,
      category: 'seo',
      title: 'No SEO plugin detected',
      description: 'No recognized SEO plugin (Rank Math, Yoast, AIOSEO) is active. An SEO plugin is essential for meta titles, descriptions, sitemaps, and structured data.',
      impact: 'high',
      effort: 'low',
      automated: false,
      tools: [],
      blocked_by: [],
    },
    !assessment.plugins.classified['seo'],
  );

  // ---------------------------------------------------------------- //
  // WOOCOMMERCE — only if active
  // ---------------------------------------------------------------- //

  const hasShopTemplate = (assessment.theme_builder['product'] ?? []).some((t) => t.status === 'publish')
    || (assessment.theme_builder['archive'] ?? []).some((t) => t.status === 'publish');

  add(
    {
      id: 'create_woocommerce_templates',
      priority: 2,
      category: 'woocommerce',
      title: 'Create WooCommerce Theme Builder templates',
      description: 'WooCommerce is active but no product or shop archive template is set in Theme Builder. Product pages will render with the default WooCommerce layout.',
      impact: 'high',
      effort: 'high',
      automated: false,
      tools: [],
      blocked_by: ['create_header_template', 'create_footer_template'],
    },
    assessment.plugins.woocommerce && !hasShopTemplate,
  );

  // ---------------------------------------------------------------- //
  // Context-specific filtering
  // ---------------------------------------------------------------- //

  // AI-agent mode: surface only automatable recommendations
  if (role === 'ai-agent') {
    return recs
      .filter((r) => r.automated)
      .sort((a, b) => a.priority - b.priority);
  }

  // Site-owner: hide deeply technical items
  if (role === 'site-owner') {
    return recs
      .filter((r) => r.category !== 'library' || r.priority <= 2)
      .sort((a, b) => a.priority - b.priority);
  }

  return recs.sort((a, b) => a.priority - b.priority);
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
    },
    async ({ site_id, ...ctx }) => {
      const client = getClient(site_id);
      const saved = await client.setSiteContext(ctx);
      const lines = [
        '✅ Site context saved.',
        '',
        `  User role:       ${saved.user_role ?? '—'}`,
        `  Site purpose:    ${saved.site_purpose ?? '—'}`,
        `  Target audience: ${saved.target_audience ?? '—'}`,
        `  Language:        ${saved.primary_language ?? '—'}`,
        `  Brand notes:     ${saved.brand_notes ? saved.brand_notes.slice(0, 80) + (saved.brand_notes.length > 80 ? '…' : '') : '—'}`,
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

      let recs = buildRecommendations(assessment, context);

      if (category) {
        recs = recs.filter((r) => r.category === category);
      }
      if (automated_only) {
        recs = recs.filter((r) => r.automated);
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
        `${recs.length} recommendation(s):`,
        '',
      ];

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

      // Build all recommendations to check if this one currently applies
      const allRecs = buildRecommendations(assessment, context);
      const rec = allRecs.find((r) => r.id === recommendation_id);

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
