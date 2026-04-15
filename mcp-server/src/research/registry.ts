import type { CapabilityId } from '../client.js';

export interface ResearchPartnerMetadata {
  partnerProgram: string | null;
  landingUrl: string | null;
  notes: string | null;
}

export interface ResearchRegistryEntry {
  pluginId: string;
  name: string;
  vendor: string;
  versionRange: string;
  widgetFamilies: string[];
  capabilitiesProvided: CapabilityId[];
  compatibilityNotes: string[];
  partnerMetadata: ResearchPartnerMetadata;
}

export const RESEARCH_REGISTRY_SEED: ResearchRegistryEntry[] = [
  {
    pluginId: 'header-footer-elementor',
    name: 'Header Footer & Blocks for Elementor',
    vendor: 'Brainstorm Force',
    versionRange: '>= 1.6',
    widgetFamilies: ['header', 'footer', 'blocks'],
    capabilitiesProvided: ['theme-builder'],
    compatibilityNotes: [
      'Useful when Elementor Free is active and the goal is limited header/footer control.',
      'Does not cover the full Elementor Pro Theme Builder surface.',
    ],
    partnerMetadata: {
      partnerProgram: null,
      landingUrl: null,
      notes: 'Placeholder only — no commercial relationship encoded.',
    },
  },
  {
    pluginId: 'shopengine',
    name: 'ShopEngine',
    vendor: 'Wpmet',
    versionRange: '>= 2.0',
    widgetFamilies: ['product', 'shop', 'cart', 'checkout'],
    capabilitiesProvided: ['woocommerce-templates'],
    compatibilityNotes: [
      'Targets WooCommerce-specific template surfaces.',
      'Should be evaluated against the current Elementor and WooCommerce versions before rollout.',
    ],
    partnerMetadata: {
      partnerProgram: null,
      landingUrl: null,
      notes: 'Placeholder only — commercial metadata intentionally omitted.',
    },
  },
  {
    pluginId: 'wpml',
    name: 'WPML',
    vendor: 'OnTheGoSystems',
    versionRange: '>= 4.6',
    widgetFamilies: ['language-switcher', 'translated-content'],
    capabilitiesProvided: ['multilingual-workflows'],
    compatibilityNotes: [
      'Widely used for multilingual WordPress workflows.',
      'Requires careful mapping of templates, strings, and translated content governance.',
    ],
    partnerMetadata: {
      partnerProgram: null,
      landingUrl: null,
      notes: 'Placeholder only — no affiliate linkage encoded.',
    },
  },
  {
    pluginId: 'jetengine',
    name: 'JetEngine',
    vendor: 'Crocoblock',
    versionRange: '>= 3.3',
    widgetFamilies: ['dynamic-listing', 'custom-content', 'dynamic-fields'],
    capabilitiesProvided: ['page-composition', 'theme-builder'],
    compatibilityNotes: [
      'Can extend listing and dynamic content workflows beyond the core template library.',
      'Introduces additional modeling complexity and should stay in the research track until validated.',
    ],
    partnerMetadata: {
      partnerProgram: null,
      landingUrl: null,
      notes: 'Placeholder only — partnership status intentionally unresolved.',
    },
  },
];

export function listResearchRegistryEntries(): ResearchRegistryEntry[] {
  return RESEARCH_REGISTRY_SEED.map((entry) => ({
    ...entry,
    widgetFamilies: [...entry.widgetFamilies],
    capabilitiesProvided: [...entry.capabilitiesProvided],
    compatibilityNotes: [...entry.compatibilityNotes],
    partnerMetadata: { ...entry.partnerMetadata },
  }));
}

export function getRegistryEntry(pluginId: string): ResearchRegistryEntry | null {
  const entry = RESEARCH_REGISTRY_SEED.find(
    (candidate: ResearchRegistryEntry) => candidate.pluginId === pluginId,
  );

  return entry
    ? {
      ...entry,
      widgetFamilies: [...entry.widgetFamilies],
      capabilitiesProvided: [...entry.capabilitiesProvided],
      compatibilityNotes: [...entry.compatibilityNotes],
      partnerMetadata: { ...entry.partnerMetadata },
    }
    : null;
}

export function findRegistryEntriesForCapability(
  capabilityId: CapabilityId,
): ResearchRegistryEntry[] {
  return listResearchRegistryEntries().filter((entry: ResearchRegistryEntry) =>
    entry.capabilitiesProvided.includes(capabilityId),
  );
}
