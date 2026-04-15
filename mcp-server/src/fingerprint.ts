import type {
  SiteAssessment,
  SiteFingerprint,
  SiteFingerprintSignal,
  ThemeBuilderTemplateSummary,
} from './client.js';

function roundConfidence(value: number): number {
  return Math.round(value * 100) / 100;
}

function countPublishedTemplates(
  themeBuilder: SiteAssessment['theme_builder'],
): number {
  return Object.values(themeBuilder).reduce((count, templates) => {
    return count + templates.filter(
      (template: ThemeBuilderTemplateSummary) => template.status === 'publish',
    ).length;
  }, 0);
}

export function buildSiteFingerprint(
  assessment: SiteAssessment,
): SiteFingerprint {
  const signals: SiteFingerprintSignal[] = [];
  const notes: string[] = [];

  const cms: SiteFingerprint['cms'] = assessment.wordpress.version
    ? 'wordpress'
    : 'unknown';
  const elementorDetected = Boolean(assessment.elementor.version);
  const publishedThemeBuilderCount = countPublishedTemplates(
    assessment.theme_builder,
  );
  const elementorPageCount = assessment.pages.elementor_total;

  let builder: SiteFingerprint['builder'] = 'unknown';
  if (!elementorDetected) {
    builder = 'wordpress-theme';
  } else if (elementorPageCount > 0 || publishedThemeBuilderCount > 0) {
    builder = 'elementor';
  } else {
    builder = 'mixed';
  }

  signals.push({
    key: 'cms_wordpress',
    label: 'WordPress detected',
    detected: cms === 'wordpress',
    confidence: cms === 'wordpress' ? 0.99 : 0.2,
    evidence: cms === 'wordpress'
      ? `WordPress version ${assessment.wordpress.version} reported by site assessment.`
      : 'No reliable WordPress version signal available.',
  });

  signals.push({
    key: 'elementor_active',
    label: 'Elementor active',
    detected: elementorDetected,
    confidence: elementorDetected ? 0.98 : 0.25,
    evidence: elementorDetected
      ? `Elementor version ${assessment.elementor.version} is active.`
      : 'Elementor version not detected in site assessment.',
  });

  signals.push({
    key: 'elementor_pro',
    label: 'Elementor Pro active',
    detected: assessment.elementor.pro,
    confidence: assessment.elementor.pro ? 0.9 : 0.35,
    evidence: assessment.elementor.pro
      ? `Elementor Pro ${assessment.elementor.pro_version ?? 'active'} detected.`
      : 'No Elementor Pro signal detected.',
  });

  signals.push({
    key: 'theme_builder_templates',
    label: 'Published Theme Builder templates',
    detected: publishedThemeBuilderCount > 0,
    confidence: publishedThemeBuilderCount > 0 ? 0.85 : 0.4,
    evidence: publishedThemeBuilderCount > 0
      ? `${publishedThemeBuilderCount} published Theme Builder template(s) found.`
      : 'No published Theme Builder templates found.',
  });

  signals.push({
    key: 'elementor_pages',
    label: 'Elementor-managed pages',
    detected: elementorPageCount > 0,
    confidence: elementorPageCount > 0 ? 0.85 : 0.4,
    evidence: elementorPageCount > 0
      ? `${elementorPageCount} Elementor page(s) detected.`
      : 'No Elementor-managed pages detected.',
  });

  signals.push({
    key: 'woocommerce',
    label: 'WooCommerce active',
    detected: assessment.plugins.woocommerce,
    confidence: assessment.plugins.woocommerce ? 0.9 : 0.3,
    evidence: assessment.plugins.woocommerce
      ? 'WooCommerce classified as active in site assessment.'
      : 'WooCommerce not detected.',
  });

  signals.push({
    key: 'multilingual',
    label: 'Multilingual plugin active',
    detected: assessment.plugins.multilingual,
    confidence: assessment.plugins.multilingual ? 0.85 : 0.3,
    evidence: assessment.plugins.multilingual
      ? 'Multilingual capability detected in active plugin classification.'
      : 'No multilingual plugin classified as active.',
  });

  if (elementorDetected && publishedThemeBuilderCount === 0) {
    notes.push(
      'Elementor is active, but no published Theme Builder templates were detected.',
    );
  }

  if (elementorDetected && elementorPageCount === 0) {
    notes.push(
      'Elementor is active, but no Elementor-managed pages were detected.',
    );
  }

  if (assessment.performance.css_print_method === 'internal') {
    notes.push(
      'Elementor CSS print method is internal, which suggests performance tuning opportunities.',
    );
  }

  const detectedSignals = signals.filter((signal) => signal.detected);
  const confidenceBase = detectedSignals.length > 0
    ? detectedSignals.reduce((sum, signal) => sum + signal.confidence, 0)
        / detectedSignals.length
    : 0.4;

  return {
    cms,
    builder,
    elementorDetected,
    elementorPro: assessment.elementor.pro,
    ecommerceDetected: assessment.plugins.woocommerce,
    multilingualDetected: assessment.plugins.multilingual,
    themeBuilderCoverage: publishedThemeBuilderCount,
    elementorPageCount,
    confidence: roundConfidence(confidenceBase),
    signals,
    notes,
  };
}
