/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Capability,
  CapabilityMatrix,
  Recommendation,
  RecommendationEngineInput,
  RecommendationEngineReport,
  SiteAssessment,
  SiteContext,
  ThemeBuilderTemplateSummary,
} from './client.js';
import { buildCapabilityMatrix } from './destination.js';
import { buildSiteFingerprint } from './fingerprint.js';

function hasCapability(
  capabilityMatrix: CapabilityMatrix,
  capabilityId: Capability['id'],
): boolean {
  return capabilityMatrix.capabilities.some(
    (capability: Capability) => capability.id === capabilityId && capability.available,
  );
}

function hasPublishedThemeBuilderTemplate(
  assessment: SiteAssessment,
  type: string,
): boolean {
  return (assessment.theme_builder[type] ?? []).some(
    (template: ThemeBuilderTemplateSummary) => template.status === 'publish',
  );
}

function buildThemeBuilderUnlockDescription(
  input: RecommendationEngineInput,
): string {
  const { capabilityMatrix, fingerprint } = input;

  if (!fingerprint.elementorDetected) {
    return `${capabilityMatrix.compatibilitySummary} Elementor was not reliably detected, so Theme Builder workflows should wait until an Elementor-compatible destination is confirmed. Start by validating the destination profile and enabling Elementor before creating header, footer, archive, or single templates.`;
  }

  if (!fingerprint.elementorPro) {
    return `${capabilityMatrix.compatibilitySummary} Elementor Free is active, but Theme Builder workflows usually require Elementor Pro or an equivalent assisted setup. Upgrade the destination before creating header, footer, archive, single, or WooCommerce templates.`;
  }

  return `${capabilityMatrix.compatibilitySummary} Theme Builder capability is not reliably available yet. Confirm the destination profile and supporting plugins before creating advanced templates.`;
}

function applyRoleFilters(
  recommendations: Recommendation[],
  context: SiteContext,
): Recommendation[] {
  const role = context.user_role;

  if (role === 'ai-agent') {
    return recommendations
      .filter((recommendation: Recommendation) => recommendation.automated)
      .sort((left, right) => left.priority - right.priority);
  }

  if (role === 'site-owner') {
    return recommendations
      .filter((recommendation: Recommendation) => recommendation.category !== 'library' || recommendation.priority <= 2)
      .sort((left, right) => left.priority - right.priority);
  }

  return recommendations.sort((left, right) => left.priority - right.priority);
}

export function buildRecommendationReport(
  input: RecommendationEngineInput,
): RecommendationEngineReport {
  const { assessment, context, capabilityMatrix } = input;
  const recommendations: Recommendation[] = [];
  const hasThemeBuilderCapability = hasCapability(capabilityMatrix, 'theme-builder');
  const hasWooCommerceTemplateCapability = hasCapability(
    capabilityMatrix,
    'woocommerce-templates',
  );
  const hasAnyPosts = (assessment.pages.by_post_type.post ?? 0) > 0;
  const hasShopTemplate = hasPublishedThemeBuilderTemplate(assessment, 'product')
    || hasPublishedThemeBuilderTemplate(assessment, 'archive');
  const missingThemeBuilderSurfaces = [
    !hasPublishedThemeBuilderTemplate(assessment, 'header'),
    !hasPublishedThemeBuilderTemplate(assessment, 'footer'),
    hasAnyPosts
      && !hasPublishedThemeBuilderTemplate(assessment, 'single')
      && !hasPublishedThemeBuilderTemplate(assessment, 'single-post'),
    hasAnyPosts && !hasPublishedThemeBuilderTemplate(assessment, 'archive'),
    !hasPublishedThemeBuilderTemplate(assessment, 'error-404'),
    assessment.plugins.woocommerce && !hasShopTemplate,
  ].some(Boolean);

  const add = (recommendation: Recommendation, condition: boolean): void => {
    if (condition) {
      recommendations.push(recommendation);
    }
  };

  if (!hasThemeBuilderCapability && missingThemeBuilderSurfaces) {
    add(
      {
        id: 'unlock_theme_builder_capability',
        priority: 1,
        category: 'structure',
        title: 'Unlock Theme Builder workflows',
        description: buildThemeBuilderUnlockDescription(input),
        impact: 'high',
        effort: 'medium',
        automated: false,
        tools: ['get_destination_capabilities', 'assess_site'],
        blocked_by: [],
      },
      true,
    );
  }

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
    hasThemeBuilderCapability && !hasPublishedThemeBuilderTemplate(assessment, 'header'),
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
    hasThemeBuilderCapability && !hasPublishedThemeBuilderTemplate(assessment, 'footer'),
  );

  add(
    {
      id: 'create_single_post_template',
      priority: 3,
      category: 'structure',
      title: 'Create a single post template',
      description: `The site has ${assessment.pages.by_post_type.post ?? 0} post(s) but no single post Theme Builder template. Blog content is being rendered by the default theme layout.`,
      impact: 'medium',
      effort: 'medium',
      automated: false,
      tools: [],
      blocked_by: ['create_header_template', 'create_footer_template'],
    },
    hasThemeBuilderCapability
      && hasAnyPosts
      && !hasPublishedThemeBuilderTemplate(assessment, 'single')
      && !hasPublishedThemeBuilderTemplate(assessment, 'single-post'),
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
    hasThemeBuilderCapability
      && hasAnyPosts
      && !hasPublishedThemeBuilderTemplate(assessment, 'archive'),
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
    hasThemeBuilderCapability && !hasPublishedThemeBuilderTemplate(assessment, 'error-404'),
  );

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

  add(
    {
      id: 'clear_elementor_cache',
      priority: 4,
      category: 'performance',
      title: 'Clear Elementor CSS cache',
      description: 'Clearing the Elementor CSS cache can resolve styling issues and ensure fresh styles are generated. Use flush_elementor_cache.',
      impact: 'low',
      effort: 'low',
      automated: true,
      tools: ['flush_elementor_cache'],
      blocked_by: [],
    },
    assessment.elementor.version !== undefined && assessment.performance.css_print_method === 'internal',
  );

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
    !(assessment.plugins.classified.seo ?? []).length,
  );

  add(
    {
      id: 'optimize_seo_meta',
      priority: 3,
      category: 'seo',
      title: 'Optimize SEO meta for key pages',
      description: 'An SEO plugin is active. Use get_seo_meta to review titles and descriptions, then update_seo_meta to improve them.',
      impact: 'medium',
      effort: 'medium',
      automated: true,
      tools: ['get_seo_meta', 'update_seo_meta'],
      blocked_by: [],
    },
    (assessment.plugins.classified.seo ?? []).length > 0,
  );

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
    assessment.plugins.woocommerce
      && hasWooCommerceTemplateCapability
      && !hasShopTemplate,
  );

  // Add booking recommendations if present
  if ((assessment as any).booking_recommendations) {
    for (const rec of (assessment as any).booking_recommendations) {
      recommendations.push(rec);
    }
  }

  return {
    destination: capabilityMatrix.destination,
    compatibilitySummary: capabilityMatrix.compatibilitySummary,
    capabilityWarnings: [
      ...capabilityMatrix.warnings,
      ...(input.validationWarnings ?? []),
    ],
    recommendations: applyRoleFilters(recommendations, context),
  };
}

export function buildRecommendations(
  assessment: SiteAssessment,
  context: SiteContext,
): Recommendation[] {
  const fingerprint = buildSiteFingerprint(assessment);
  const capabilityMatrix = buildCapabilityMatrix(assessment, fingerprint);

  return buildRecommendationReport({
    assessment,
    context,
    fingerprint,
    capabilityMatrix,
  }).recommendations;
}
