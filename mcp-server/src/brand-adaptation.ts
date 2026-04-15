import type {
  BrandAdaptationPlan,
  DesignTokenReport,
  SiteAssessment,
  SiteContext,
} from './client.js';

function summarizeBrandTarget(
  assessment: SiteAssessment,
  context: SiteContext,
  brandBrief?: string,
): string {
  if (brandBrief && brandBrief.trim().length > 0) {
    return brandBrief.trim();
  }

  if (context.brand_notes && context.brand_notes.trim().length > 0) {
    return context.brand_notes.trim();
  }

  return `Align ${assessment.wordpress.site_name} with a clearer and more consistent Elementor brand system before broad layout changes.`;
}

export function buildBrandAdaptationPlan(params: {
  assessment: SiteAssessment;
  context: SiteContext;
  tokenReport: DesignTokenReport;
  brandBrief?: string;
}): BrandAdaptationPlan {
  const { assessment, context, tokenReport, brandBrief } = params;
  const primaryColor = tokenReport.colors[0];
  const primaryTypography = tokenReport.typography[0];
  const baseSpacing = tokenReport.spacing.find((token) => token.id === 'space-md') ?? tokenReport.spacing[0];

  const tokenAnchors = [
    primaryColor
      ? `${primaryColor.title} ${primaryColor.value}`
      : 'No primary color token is defined yet',
    primaryTypography
      ? `${primaryTypography.title} ${primaryTypography.fontFamily ?? 'Unknown font'} ${primaryTypography.fontSize ?? '?'}px`
      : 'No primary typography token is defined yet',
    baseSpacing
      ? `${baseSpacing.label} ${baseSpacing.pixels}px`
      : 'No spacing baseline is defined yet',
  ];

  const suggestedActions: string[] = [];
  if (assessment.brand.global_colors_count === 0) {
    suggestedActions.push('Define the global Elementor color palette before editing hero, CTA, or card-heavy layouts.');
  } else {
    suggestedActions.push('Review the current global color slots and tighten them against the target brand brief before changing section styling.');
  }

  if (assessment.brand.global_typography_count === 0) {
    suggestedActions.push('Define global typography roles before adjusting page-level headings and body styles.');
  } else {
    suggestedActions.push('Normalize heading/body font roles in the Elementor Kit before duplicating templates or pages.');
  }

  suggestedActions.push('Use extract_design_tokens to compare the current kit anchors against the desired brand direction before broader adaptation work.');

  if (context.site_purpose === 'ecommerce') {
    suggestedActions.push('Adapt product-card colors, spacing, and elevation conservatively so WooCommerce surfaces stay readable and conversion-oriented.');
  }

  return {
    targetBrandSummary: summarizeBrandTarget(assessment, context, brandBrief),
    tokenAnchors,
    suggestedActions,
    guardrails: [
      'Do not overwrite live templates before validating the updated global colors and typography on a disposable page or template.',
      'Keep brand adaptation anchored in Elementor Kit globals before pushing one-off widget overrides.',
      'Treat spacing, radius, and shadow hints as heuristics until a visual validation pass confirms them.',
    ],
  };
}
