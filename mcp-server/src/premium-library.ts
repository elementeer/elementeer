import type {
  CapabilityMatrix,
  PremiumLibraryAssetCollection,
  PremiumLibraryAssetDetail,
  PremiumLibraryAudience,
  PremiumLibraryAssetSummary,
  PremiumLibraryCurationLevel,
  PremiumLibraryCatalogReport,
  PremiumLibraryInspectionReport,
  PremiumLibraryUsagePlan,
  SiteAssessment,
  SiteContext,
} from '@elementify/shared';
import { buildLibraryBoundaryReport } from './library-providers.js';

type ElementorTemplateType = 'page' | 'section' | 'container' | 'widget';

interface PremiumLibraryAssetRuntimeDetail extends PremiumLibraryAssetDetail {
  templateType: ElementorTemplateType;
  elementorData: unknown[];
  defaultCategories: string[];
  defaultTags: string[];
}

const PREMIUM_LIBRARY_COLLECTION_LABELS: Record<PremiumLibraryAssetCollection, string> = {
  conversion: 'Conversion systems',
  'service-pages': 'Service pages',
  'trust-components': 'Trust and proof',
  'theme-builder': 'Theme Builder structure',
};

const PREMIUM_LIBRARY_CURATION_LABELS: Record<PremiumLibraryCurationLevel, string> = {
  signature: 'Signature',
  featured: 'Featured',
  specialist: 'Specialist',
};

const PREMIUM_LIBRARY_AUDIENCE_LABELS: Record<PremiumLibraryAudience, string> = {
  freelancer: 'freelancer',
  agency: 'agency',
  'site-owner': 'site owner',
};

export const PREMIUM_LIBRARY_CATALOG: PremiumLibraryAssetDetail[] = [
  {
    id: 'premium-hero-conversion-stack',
    title: 'Premium Hero Conversion Stack',
    type: 'page-starter',
    collection: 'conversion',
    curationLevel: 'signature',
    audience: ['agency', 'site-owner'],
    summary: 'A conversion-focused hero and intro stack for premium landing-page starts.',
    intendedUse: 'Use when the current site needs a sharper first-screen conversion starting point.',
    tags: ['hero', 'cta', 'lead-generation', 'landing-page'],
    curationSignals: ['Editorial hero pick', 'Conversion-led composition', 'Best for launch pages'],
    useCases: ['hero rollout', 'landing page refresh', 'lead capture start'],
    description:
      'A curated premium starter that combines strong hero structure, concise proof, and a clear call to action for current-site assembly.',
    localImportNotes: [
      'Import into the local Elementor Library before adapting it to the current brand.',
      'Works best when paired with the site’s active global colors and typography.',
    ],
    prerequisites: [
      'Brand setup should be current before rollout.',
      'Destination capabilities should be checked before using the asset as a structural starting point.',
    ],
    guardrails: [
      'Treat this as a curated premium starter, not cloud storage.',
      'Keep the imported asset anchored to the local Elementor Library.',
    ],
  },
  {
    id: 'premium-service-section-stack',
    title: 'Premium Service Section Stack',
    type: 'section-starter',
    collection: 'service-pages',
    curationLevel: 'featured',
    audience: ['freelancer', 'agency'],
    summary: 'A layered section pattern for service explanations, benefits, and proof.',
    intendedUse: 'Use to accelerate service pages and landing-page section assembly.',
    tags: ['services', 'proof', 'benefits', 'section'],
    curationSignals: ['Service-page foundation', 'Reusable section system', 'Editorially balanced'],
    useCases: ['service page assembly', 'feature explanation', 'proof-led sectioning'],
    description:
      'A reusable premium section starter that makes it easier to assemble service-led layouts without starting from a blank canvas.',
    localImportNotes: [
      'Import into the local Elementor Library and use it alongside existing site sections.',
      'Adapt spacing and hierarchy after import to match the current site’s global styling.',
    ],
    prerequisites: [
      'Global colors and typography should be available.',
    ],
    guardrails: [
      'Do not imply cross-site reuse or shared workspace storage.',
      'Use local template IDs after import for composition flows.',
    ],
  },
  {
    id: 'premium-proof-component-rail',
    title: 'Premium Proof Component Rail',
    type: 'component',
    collection: 'trust-components',
    curationLevel: 'specialist',
    audience: ['agency', 'site-owner'],
    summary: 'A compact proof and trust component for high-confidence page sections.',
    intendedUse: 'Use to enrich current-site pages with concise trust and proof signals.',
    tags: ['proof', 'trust', 'testimonial', 'component'],
    curationSignals: ['Trust-building accent', 'Compact support module', 'High-confidence add-on'],
    useCases: ['testimonial rail', 'proof strip', 'credibility block'],
    description:
      'A small premium component starter for trust bars, proof strips, and compact persuasive modules.',
    localImportNotes: [
      'Best used after importing into the local Elementor Library.',
      'Works well as a reusable component in Advanced creator flows.',
    ],
    prerequisites: [
      'The site should already have a stable brand tone.',
    ],
    guardrails: [
      'Keep it local-site operational.',
      'Do not treat it as a remote library artifact.',
    ],
  },
  {
    id: 'premium-theme-foundation-header',
    title: 'Premium Theme Foundation Header',
    type: 'theme-block',
    collection: 'theme-builder',
    curationLevel: 'signature',
    audience: ['agency', 'site-owner'],
    summary: 'A structured header foundation for Advanced theme-building workflows.',
    intendedUse: 'Use when the destination can support Theme Builder-style structural delivery.',
    tags: ['header', 'theme-builder', 'structure', 'navigation'],
    curationSignals: ['Theme Builder ready', 'Site-wide structural starter', 'Premium header baseline'],
    useCases: ['header rollout', 'site-wide rebuild', 'navigation foundation'],
    description:
      'A premium structural block that serves as a starting point for header delivery on the current site.',
    localImportNotes: [
      'Import locally, then adapt the header structure to the current WordPress site.',
      'Use only when destination capabilities support Theme Builder workflows.',
    ],
    prerequisites: [
      'Theme Builder support must be available on the destination.',
      'Brand setup should be stable before applying structural changes.',
    ],
    guardrails: [
      'This is a site-local structural starter, not a Studio cloud artifact.',
      'Do not surface it in Free workflows.',
    ],
  },
  {
    id: 'premium-faq-objection-stack',
    title: 'Premium FAQ Objection Stack',
    type: 'section-starter',
    collection: 'trust-components',
    curationLevel: 'featured',
    audience: ['freelancer', 'agency', 'site-owner'],
    summary: 'A conversion-friendly FAQ and objection-handling stack for premium service pages.',
    intendedUse: 'Use to reduce friction and answer high-intent objections on current-site pages.',
    tags: ['faq', 'objection-handling', 'trust', 'conversion'],
    curationSignals: ['Objection-handling system', 'Supportive conversion layer', 'Editorial FAQ structure'],
    useCases: ['FAQ block', 'objection handling', 'conversion support'],
    description:
      'A premium section starter that packages key objections, answers, and supporting proof into a conversion-friendly FAQ structure.',
    localImportNotes: [
      'Import locally and adapt the questions to the current audience and offer.',
      'Pair with service or pricing sections to handle buyer concerns earlier in the flow.',
    ],
    prerequisites: [
      'Brand language should already be aligned to the target audience.',
      'Use this after the main offer structure has been established.',
    ],
    guardrails: [
      'Keep the asset local to the current site.',
      'Do not present the FAQ pack as a cloud-synced content library item.',
    ],
  },
  {
    id: 'premium-footer-credibility-stack',
    title: 'Premium Footer Credibility Stack',
    type: 'theme-block',
    collection: 'theme-builder',
    curationLevel: 'featured',
    audience: ['agency', 'site-owner'],
    summary: 'A premium footer and credibility system for site-wide trust and navigation.',
    intendedUse: 'Use to give the site a stronger global footer, trust markers, and final navigation layer.',
    tags: ['footer', 'trust', 'navigation', 'theme-builder'],
    curationSignals: ['Site-wide trust layer', 'Navigation anchor', 'Global footer set'],
    useCases: ['footer rollout', 'trust reinforcement', 'global navigation'],
    description:
      'A premium structural block for stronger footer delivery, supporting credibility, contact pathways, and recurring navigation on the current site.',
    localImportNotes: [
      'Import into the local Elementor Library before adapting the footer content.',
      'Use once the site needs a stronger global trust and navigation finish.',
    ],
    prerequisites: [
      'Theme Builder support should be available on the destination.',
      'Confirm the footer content and trust elements before rollout.',
    ],
    guardrails: [
      'Stay local-site operational.',
      'Do not frame this as a remote template that can sync across sites.',
    ],
  },
];

const PREMIUM_LIBRARY_RUNTIME_DETAILS: Record<string, PremiumLibraryAssetRuntimeDetail> = {
  'premium-hero-conversion-stack': {
    ...PREMIUM_LIBRARY_CATALOG[0],
    templateType: 'page',
    elementorData: [
      {
        id: 'premium-hero-conversion-stack-root',
        elType: 'container',
        isInner: false,
        settings: {
          content_width: 'boxed',
          min_height: { unit: 'px', size: 560, sizes: [] },
          padding: { unit: 'px', top: '96', right: '48', bottom: '96', left: '48', isLinked: false },
        },
        elements: [
          {
            id: 'premium-hero-heading',
            elType: 'widget',
            widgetType: 'heading',
            settings: {
              title: 'Turn more of your Elementor traffic into qualified leads.',
              size: 'xxl',
            },
            elements: [],
          },
          {
            id: 'premium-hero-text',
            elType: 'widget',
            widgetType: 'text-editor',
            settings: {
              editor: '<p>Start from a stronger premium structure, then adapt it to your current site and brand.</p>',
            },
            elements: [],
          },
          {
            id: 'premium-hero-button',
            elType: 'widget',
            widgetType: 'button',
            settings: {
              text: 'Book a strategy call',
              link: { url: '#contact', is_external: '', nofollow: '' },
            },
            elements: [],
          },
        ],
      },
    ],
    defaultCategories: ['elementify-premium', 'hero'],
    defaultTags: ['premium', 'hero', 'starter'],
  },
  'premium-service-section-stack': {
    ...PREMIUM_LIBRARY_CATALOG[1],
    templateType: 'section',
    elementorData: [
      {
        id: 'premium-service-section-stack-root',
        elType: 'section',
        settings: {
          structure: '30',
          gap: 'extended',
        },
        elements: [
          {
            id: 'premium-service-column-left',
            elType: 'column',
            settings: {},
            elements: [
              {
                id: 'premium-service-heading',
                elType: 'widget',
                widgetType: 'heading',
                settings: {
                  title: 'Services built around clarity, momentum, and measurable outcomes.',
                  size: 'xl',
                },
                elements: [],
              },
              {
                id: 'premium-service-copy',
                elType: 'widget',
                widgetType: 'text-editor',
                settings: {
                  editor: '<p>Use this premium section starter to explain the offer, show proof, and move the reader into action.</p>',
                },
                elements: [],
              },
            ],
          },
          {
            id: 'premium-service-column-right',
            elType: 'column',
            settings: {},
            elements: [
              {
                id: 'premium-service-list',
                elType: 'widget',
                widgetType: 'icon-list',
                settings: {
                  icon_list: [
                    { text: 'Clear service breakdown', selected_icon: { value: 'fas fa-check', library: 'fa-solid' } },
                    { text: 'Proof and trust placement', selected_icon: { value: 'fas fa-check', library: 'fa-solid' } },
                    { text: 'Stronger CTA framing', selected_icon: { value: 'fas fa-check', library: 'fa-solid' } },
                  ],
                },
                elements: [],
              },
            ],
          },
        ],
      },
    ],
    defaultCategories: ['elementify-premium', 'services'],
    defaultTags: ['premium', 'services', 'section'],
  },
  'premium-proof-component-rail': {
    ...PREMIUM_LIBRARY_CATALOG[2],
    templateType: 'container',
    elementorData: [
      {
        id: 'premium-proof-component-rail-root',
        elType: 'container',
        isInner: false,
        settings: {
          flex_direction: 'row',
          justify_content: 'space-between',
          gap: { unit: 'px', size: 24, sizes: [] },
          padding: { unit: 'px', top: '24', right: '24', bottom: '24', left: '24', isLinked: false },
        },
        elements: [
          {
            id: 'premium-proof-stat',
            elType: 'widget',
            widgetType: 'counter',
            settings: {
              starting_number: 0,
              ending_number: 127,
              prefix: '',
              suffix: '+',
              title: 'Projects launched',
            },
            elements: [],
          },
          {
            id: 'premium-proof-quote',
            elType: 'widget',
            widgetType: 'text-editor',
            settings: {
              editor: '<p>"Exactly the kind of trust-building block we needed to speed up page assembly."</p>',
            },
            elements: [],
          },
        ],
      },
    ],
    defaultCategories: ['elementify-premium', 'proof'],
    defaultTags: ['premium', 'proof', 'component'],
  },
  'premium-theme-foundation-header': {
    ...PREMIUM_LIBRARY_CATALOG[3],
    templateType: 'section',
    elementorData: [
      {
        id: 'premium-theme-foundation-header-root',
        elType: 'section',
        settings: {
          structure: '20',
          content_width: 'boxed',
        },
        elements: [
          {
            id: 'premium-header-left',
            elType: 'column',
            settings: {},
            elements: [
              {
                id: 'premium-header-logo',
                elType: 'widget',
                widgetType: 'image',
                settings: {
                  image: { url: '', id: '' },
                  caption: '',
                },
                elements: [],
              },
            ],
          },
          {
            id: 'premium-header-right',
            elType: 'column',
            settings: {},
            elements: [
              {
                id: 'premium-header-nav',
                elType: 'widget',
                widgetType: 'nav-menu',
                settings: {
                  layout: 'horizontal',
                },
                elements: [],
              },
            ],
          },
        ],
      },
    ],
    defaultCategories: ['elementify-premium', 'theme-builder'],
    defaultTags: ['premium', 'header', 'theme-builder'],
  },
  'premium-faq-objection-stack': {
    ...PREMIUM_LIBRARY_CATALOG[4],
    templateType: 'section',
    elementorData: [
      {
        id: 'premium-faq-objection-stack-root',
        elType: 'section',
        settings: {
          structure: '30',
          content_width: 'boxed',
        },
        elements: [
          {
            id: 'premium-faq-column-left',
            elType: 'column',
            settings: {},
            elements: [
              {
                id: 'premium-faq-heading',
                elType: 'widget',
                widgetType: 'heading',
                settings: {
                  title: 'Questions your buyers always ask before they commit.',
                  size: 'xl',
                },
                elements: [],
              },
              {
                id: 'premium-faq-copy',
                elType: 'widget',
                widgetType: 'text-editor',
                settings: {
                  editor: '<p>Use this premium FAQ stack to address objections and reduce hesitation on the current site.</p>',
                },
                elements: [],
              },
            ],
          },
          {
            id: 'premium-faq-column-right',
            elType: 'column',
            settings: {},
            elements: [
              {
                id: 'premium-faq-toggle',
                elType: 'widget',
                widgetType: 'accordion',
                settings: {
                  accordion: [
                    { title: 'How fast can we get started?', content: 'This premium stack is designed to accelerate the first conversion-ready page assembly.' },
                    { title: 'Will this fit our brand?', content: 'The asset should be adapted to the current site brand before rollout.' },
                    { title: 'Can we reuse it elsewhere?', content: 'It remains a local Elementor Library asset for the current site.' },
                  ],
                },
                elements: [],
              },
            ],
          },
        ],
      },
    ],
    defaultCategories: ['elementify-premium', 'trust-components'],
    defaultTags: ['premium', 'faq', 'trust'],
  },
  'premium-footer-credibility-stack': {
    ...PREMIUM_LIBRARY_CATALOG[5],
    templateType: 'section',
    elementorData: [
      {
        id: 'premium-footer-credibility-stack-root',
        elType: 'section',
        settings: {
          structure: '20',
          content_width: 'boxed',
        },
        elements: [
          {
            id: 'premium-footer-left',
            elType: 'column',
            settings: {},
            elements: [
              {
                id: 'premium-footer-heading',
                elType: 'widget',
                widgetType: 'heading',
                settings: {
                  title: 'A stronger footer for credibility and repeat navigation.',
                  size: 'lg',
                },
                elements: [],
              },
              {
                id: 'premium-footer-copy',
                elType: 'widget',
                widgetType: 'text-editor',
                settings: {
                  editor: '<p>Use this premium footer stack to reinforce trust, contact paths, and the final site-wide navigation layer.</p>',
                },
                elements: [],
              },
            ],
          },
          {
            id: 'premium-footer-right',
            elType: 'column',
            settings: {},
            elements: [
              {
                id: 'premium-footer-nav',
                elType: 'widget',
                widgetType: 'nav-menu',
                settings: {
                  layout: 'vertical',
                },
                elements: [],
              },
              {
                id: 'premium-footer-badges',
                elType: 'widget',
                widgetType: 'icon-list',
                settings: {
                  icon_list: [
                    { text: 'Local import only', selected_icon: { value: 'fas fa-lock', library: 'fa-solid' } },
                    { text: 'Advanced premium layer', selected_icon: { value: 'fas fa-bolt', library: 'fa-solid' } },
                    { text: 'Theme Builder ready', selected_icon: { value: 'fas fa-layer-group', library: 'fa-solid' } },
                  ],
                },
                elements: [],
              },
            ],
          },
        ],
      },
    ],
    defaultCategories: ['elementify-premium', 'theme-builder'],
    defaultTags: ['premium', 'footer', 'theme-builder'],
  },
};

function getPremiumProviderAvailability(): 'active' | 'gated' {
  const report = buildLibraryBoundaryReport('advanced');
  const premiumProvider = report.providers.find((provider) => provider.kind === 'elementify-premium');
  return premiumProvider?.availability === 'active' ? 'active' : 'gated';
}

function labelCollection(collection: PremiumLibraryAssetCollection): string {
  return PREMIUM_LIBRARY_COLLECTION_LABELS[collection];
}

function labelCurationLevel(level: PremiumLibraryCurationLevel): string {
  return PREMIUM_LIBRARY_CURATION_LABELS[level];
}

function labelAudiences(audience: PremiumLibraryAudience[]): string {
  return audience.map((entry) => PREMIUM_LIBRARY_AUDIENCE_LABELS[entry]).join(', ');
}

function formatSignals(signals: string[]): string {
  return signals.join(', ');
}

function formatUseCases(useCases: string[]): string {
  return useCases.join(', ');
}



function summarizeAsset(asset: PremiumLibraryAssetDetail): PremiumLibraryAssetSummary {
  return {
    id: asset.id,
    title: asset.title,
    type: asset.type,
    collection: asset.collection,
    curationLevel: asset.curationLevel,
    audience: asset.audience,
    summary: asset.summary,
    intendedUse: asset.intendedUse,
    tags: asset.tags,
    curationSignals: asset.curationSignals,
    useCases: asset.useCases,
  };
}

function findAsset(assetId: string): PremiumLibraryAssetDetail {
  const asset = PREMIUM_LIBRARY_RUNTIME_DETAILS[assetId];
  if (!asset) {
    throw new Error(`Unknown premium library asset: ${assetId}`);
  }

  return asset;
}

function findAssetForTargetType(targetType: PremiumLibraryUsagePlan['targetType']): PremiumLibraryAssetDetail {
  const matchingAsset = Object.values(PREMIUM_LIBRARY_RUNTIME_DETAILS).find((asset) => asset.type === targetType);
  if (!matchingAsset) {
    throw new Error(`No premium library asset is available for target type: ${targetType}`);
  }

  return matchingAsset;
}

function findRuntimeAsset(assetId: string): PremiumLibraryAssetRuntimeDetail {
  const asset = PREMIUM_LIBRARY_RUNTIME_DETAILS[assetId];
  if (!asset) {
    throw new Error(`Unknown premium library asset: ${assetId}`);
  }

  return asset;
}

function defaultTemplateTitle(asset: PremiumLibraryAssetRuntimeDetail): string {
  return `${asset.title} — Local Import`;
}

export function buildPremiumLibraryImportInput(params: {
  assetId: string;
  title?: string;
  status?: 'draft' | 'publish';
  categories?: string[];
  tags?: string[];
}): {
  title: string;
  type: ElementorTemplateType;
  status: 'draft' | 'publish';
  elementor_data: unknown[];
  categories: string[];
  tags: string[];
  source: {
    kind: 'elementify-premium';
    asset_id: string;
    asset_title: string;
    reference: string;
  };
} {
  const asset = findRuntimeAsset(params.assetId);

  return {
    title: params.title ?? defaultTemplateTitle(asset),
    type: asset.templateType,
    status: params.status ?? 'draft',
    elementor_data: asset.elementorData,
    categories: params.categories ?? asset.defaultCategories,
    tags: params.tags ?? asset.defaultTags,
    source: {
      kind: 'elementify-premium',
      asset_id: asset.id,
      asset_title: asset.title,
      reference: `premium-catalog:${asset.id}`,
    },
  };
}

export function listPremiumLibraryAssets(params: {
  targetType?: PremiumLibraryUsagePlan['targetType'];
  assessment: SiteAssessment;
  context: SiteContext;
  capabilityMatrix: CapabilityMatrix;
}): PremiumLibraryCatalogReport {
  const availability = getPremiumProviderAvailability();
  const assets = params.targetType
    ? PREMIUM_LIBRARY_CATALOG.filter((asset) => asset.type === params.targetType)
    : PREMIUM_LIBRARY_CATALOG;
  const groupedCollections = Array.from(new Set(assets.map((asset) => asset.collection)))
    .map((collection) => labelCollection(collection))
    .join(', ');
  const curationMix = Array.from(new Set(assets.map((asset) => asset.curationLevel)))
    .map((level) => labelCurationLevel(level))
    .join(', ');

  const notes = [
    availability === 'active'
      ? 'Premium library is available in Advanced as a curated catalog that resolves back into the local site context.'
      : 'Premium library is currently gated.',
    `Default provider remains ${buildLibraryBoundaryReport('advanced').defaultProvider}.`,
    `Compatibility summary: ${params.capabilityMatrix.compatibilitySummary}`,
    `Catalog collections: ${groupedCollections}`,
    `Curation mix: ${curationMix}`,
  ];

  if (params.context.user_role === 'agency') {
    notes.push('Agency operators still import premium assets locally before reuse.');
  }

  if (params.assessment.brand.global_colors_count === 0 || params.assessment.brand.global_typography_count === 0) {
    notes.push('Run brand setup before relying on premium catalog assets.');
  }

  return {
    provider: 'elementify-premium',
    availability,
    assetCount: assets.length,
    assets: assets.map(summarizeAsset),
    notes,
  };
}

export function inspectPremiumLibraryAsset(params: {
  assetId: string;
  assessment: SiteAssessment;
  context: SiteContext;
  capabilityMatrix: CapabilityMatrix;
}): PremiumLibraryInspectionReport {
  const availability = getPremiumProviderAvailability();
  const asset = findAsset(params.assetId);
  const recommendedWorkflow = [
    `Review the ${asset.title} details from the curated Elementify Premium Library.`,
    'Import the asset into the local Elementor Library on the current site.',
    'Adapt the imported structure to the current brand and destination capabilities before rollout.',
  ];

  if (asset.type === 'theme-block') {
    recommendedWorkflow.push('Only use this asset when Theme Builder support is available on the destination.');
  }

  const notes = [
    `Collection: ${labelCollection(asset.collection)}`,
    `Curation level: ${labelCurationLevel(asset.curationLevel)}`,
    `Audience: ${labelAudiences(asset.audience)}`,
    `Signals: ${formatSignals(asset.curationSignals)}`,
    `Use cases: ${formatUseCases(asset.useCases)}`,
    `Compatibility summary: ${params.capabilityMatrix.compatibilitySummary}`,
    availability === 'active'
      ? 'Premium library inspection is active in Advanced.'
      : 'Premium library inspection is gated until Advanced is active.',
  ];

  if (params.context.user_role === 'agency') {
    notes.push('Agency usage remains site-local; there is no cross-site workspace behavior here.');
  }

  if (params.assessment.brand.global_colors_count === 0 || params.assessment.brand.global_typography_count === 0) {
    notes.push('Brand setup is incomplete, so import planning should remain validation-led.');
  }

  return {
    provider: 'elementify-premium',
    availability,
    asset,
    importMode: 'manual-import',
    recommendedWorkflow,
    notes,
  };
}

export function buildPremiumLibraryUsagePlan(params: {
  assetId?: string;
  targetType: PremiumLibraryUsagePlan['targetType'];
  assessment: SiteAssessment;
  context: SiteContext;
  capabilityMatrix: CapabilityMatrix;
}): PremiumLibraryUsagePlan {
  const report = buildLibraryBoundaryReport('advanced');
  const premiumProvider = report.providers.find((provider) => provider.kind === 'elementify-premium');
  const themeBuilderCapability = params.capabilityMatrix.capabilities.find(
    (capability) => capability.id === 'theme-builder',
  );
  const asset = params.assetId
    ? findAsset(params.assetId)
    : findAssetForTargetType(params.targetType);
  const resolvedTargetType = params.assetId ? asset.type : params.targetType;

  const recommendedWorkflow = [
    `Select the curated premium asset ${asset.title} from the Elementify Library.`,
    'Import it into or stage it alongside the local Elementor Library.',
    'Adapt the imported structure to the current site context, brand setup, and destination capabilities before rollout.',
  ];

  if (resolvedTargetType === 'theme-block') {
    recommendedWorkflow.push('Use the imported premium block as a starting point for Theme Builder delivery on the current site.');
  } else if (resolvedTargetType === 'page-starter') {
    recommendedWorkflow.push('Use the imported premium starter as the basis for a current-site page assembly flow.');
  }

  const prerequisites = [
    'Keep site context and brand notes up to date before using premium assets.',
    'Validate destination capabilities before relying on premium structures that assume stronger workflow support.',
  ];

  if (params.assessment.brand.global_colors_count === 0 || params.assessment.brand.global_typography_count === 0) {
    prerequisites.push('Run brand setup before heavy premium-library usage so imported assets can be aligned to the current site.');
  }

  if (resolvedTargetType === 'theme-block' && !themeBuilderCapability?.available) {
    prerequisites.push('Theme Builder capability is not currently available, so theme-block usage should stay in planning mode until the destination is upgraded.');
  }

  const guardrails = [
    'Treat the premium library as a curated catalog, not as cloud storage.',
    'Keep imported premium assets anchored to the local Elementor Library and current-site workflows.',
    'Do not imply cross-site sync, shared workspace storage, or Studio delivery semantics.',
  ];

  if (params.context.user_role === 'agency') {
    guardrails.push('Even for agency operators, premium-library usage remains site-local until Studio is introduced.');
  }

  const notes = [
    `Collection: ${labelCollection(asset.collection)}`,
    `Curation level: ${labelCurationLevel(asset.curationLevel)}`,
    `Audience: ${labelAudiences(asset.audience)}`,
    `Signals: ${formatSignals(asset.curationSignals)}`,
    `Use cases: ${formatUseCases(asset.useCases)}`,
    premiumProvider?.availability === 'active'
      ? 'Premium library is available in Advanced and resolves back into the current local site context.'
      : 'Premium library is currently gated and should not be surfaced in the active workflow.',
    `Default provider remains ${report.defaultProvider}.`,
    `Compatibility summary: ${params.capabilityMatrix.compatibilitySummary}`,
    `Selected asset: ${asset.title}`,
  ];

  if (params.assetId && params.targetType !== asset.type) {
    notes.push('The selected asset overrides the requested target type.');
  }

  return {
    assetId: asset.id,
    assetTitle: asset.title,
    targetType: resolvedTargetType,
    activeProvider: report.defaultProvider,
    premiumProviderAvailable: premiumProvider?.availability === 'active',
    importMode: 'manual-import',
    recommendedWorkflow,
    prerequisites,
    guardrails,
    notes,
  };
}
