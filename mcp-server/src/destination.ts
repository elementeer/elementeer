import type {
  Capability,
  CapabilityMatrix,
  DestinationProfile,
  SiteAssessment,
  SiteFingerprint,
} from './client.js';

function hasPluginAssistance(assessment: SiteAssessment): boolean {
  return Object.keys(assessment.plugins.classified).length > 0;
}

export function buildDestinationProfile(
  assessment: SiteAssessment,
  fingerprint: SiteFingerprint,
): DestinationProfile {
  const activePluginCategories = Object.keys(assessment.plugins.classified);
  const notes = [...fingerprint.notes];

  let kind: DestinationProfile['kind'] = 'unknown';
  if (!fingerprint.elementorDetected) {
    kind = 'unknown';
  } else if (fingerprint.elementorPro) {
    kind = 'elementor-pro';
  } else if (hasPluginAssistance(assessment)) {
    kind = 'plugin-assisted-elementor';
  } else {
    kind = 'elementor-free';
  }

  const labelMap: Record<DestinationProfile['kind'], string> = {
    unknown: 'Unknown destination',
    'elementor-free': 'Elementor Free',
    'elementor-pro': 'Elementor Pro',
    'plugin-assisted-elementor': 'Plugin-assisted Elementor',
  };

  if (activePluginCategories.length > 0) {
    notes.push(
      `Active plugin categories: ${activePluginCategories.join(', ')}.`,
    );
  }

  return {
    kind,
    label: labelMap[kind],
    elementorDetected: fingerprint.elementorDetected,
    elementorPro: fingerprint.elementorPro,
    activePluginCategories,
    notes,
  };
}

export function buildCapabilityMatrix(
  assessment: SiteAssessment,
  fingerprint: SiteFingerprint,
): CapabilityMatrix {
  const destination = buildDestinationProfile(assessment, fingerprint);
  const capabilities: Capability[] = [
    {
      id: 'global-styles',
      available: fingerprint.elementorDetected,
      source: fingerprint.elementorDetected ? 'elementor-free' : 'unknown',
      notes: fingerprint.elementorDetected
        ? ['Global Elementor Kit styles can be read and updated.']
        : ['Elementor is not detected.'],
    },
    {
      id: 'page-composition',
      available: fingerprint.elementorDetected,
      source: fingerprint.elementorDetected ? 'core' : 'unknown',
      notes: fingerprint.elementorDetected
        ? ['Elementify composition workflows can target Elementor page data.']
        : ['Page composition requires Elementor-managed content.'],
    },
    {
      id: 'theme-builder',
      available: fingerprint.elementorPro || fingerprint.themeBuilderCoverage > 0,
      source: fingerprint.elementorPro
        ? 'elementor-pro'
        : fingerprint.themeBuilderCoverage > 0
          ? 'plugin-assisted'
          : 'unknown',
      notes: fingerprint.elementorPro
        ? ['Elementor Pro is active.']
        : fingerprint.themeBuilderCoverage > 0
          ? ['Theme Builder templates already exist, but Pro was not directly detected.']
          : ['No reliable Theme Builder capability signal detected.'],
    },
    {
      id: 'woocommerce-templates',
      available: assessment.plugins.woocommerce && fingerprint.elementorPro,
      source: assessment.plugins.woocommerce && fingerprint.elementorPro
        ? 'elementor-pro'
        : assessment.plugins.woocommerce
          ? 'plugin-assisted'
          : 'unknown',
      notes: assessment.plugins.woocommerce
        ? fingerprint.elementorPro
          ? ['WooCommerce and Elementor Pro are both active.']
          : ['WooCommerce is active, but advanced template workflows likely need Elementor Pro.']
        : ['WooCommerce is not active.'],
    },
    {
      id: 'multilingual-workflows',
      available: assessment.plugins.multilingual,
      source: assessment.plugins.multilingual ? 'plugin-assisted' : 'unknown',
      notes: assessment.plugins.multilingual
        ? ['A multilingual plugin is active.']
        : ['No multilingual plugin detected.'],
    },
    {
      id: 'change-review',
      available: true,
      source: 'core',
      notes: ['The Elementify change review queue is available independently of the destination profile.'],
    },
  ];

  const availableCount = capabilities.filter((capability) => capability.available)
    .length;
  const warnings: string[] = [];

  if (!fingerprint.elementorDetected) {
    warnings.push('Elementor was not detected, so destination-specific Elementor workflows are not reliable.');
  }

  if (!fingerprint.elementorPro) {
    warnings.push('Elementor Pro is not detected, so some advanced Theme Builder workflows may be limited.');
  }

  if (assessment.plugins.woocommerce && !fingerprint.elementorPro) {
    warnings.push('WooCommerce is active, but WooCommerce template workflows may need Elementor Pro.');
  }

  const compatibilitySummary = availableCount >= 5
    ? 'Destination supports most current Elementify workflows with minimal fallback.'
    : availableCount >= 3
      ? 'Destination supports the core Elementor workflows, with some advanced capabilities limited.'
      : 'Destination support is partial and should be handled conservatively.';

  return {
    destination,
    capabilities,
    compatibilitySummary,
    warnings,
  };
}
