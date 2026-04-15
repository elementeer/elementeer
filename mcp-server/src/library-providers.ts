import { getProductTierProfile } from './product-entitlements.js';

export type LibraryProviderKind =
  | 'local-elementor'
  | 'elementify-premium'
  | 'elementify-cloud';

export type LibraryProviderScope =
  | 'site'
  | 'catalog'
  | 'workspace';

export type LibraryProviderAvailability =
  | 'active'
  | 'gated'
  | 'planned';

export type LibraryStorageModel =
  | 'wordpress-local'
  | 'curated-catalog'
  | 'cloud-sync';

export type LibrarySyncMode =
  | 'none'
  | 'manual-import'
  | 'cloud-sync';

export interface LibraryProviderDescriptor {
  kind: LibraryProviderKind;
  label: string;
  scope: LibraryProviderScope;
  availability: LibraryProviderAvailability;
  storageModel: LibraryStorageModel;
  syncMode: LibrarySyncMode;
  targetSystem: string;
  notes: string[];
}

export interface LibraryBoundaryReport {
  tier: 'free' | 'advanced' | 'studio_future';
  defaultProvider: LibraryProviderKind;
  providers: LibraryProviderDescriptor[];
  usageRules: string[];
}

export function getLocalElementorLibraryProvider(): LibraryProviderDescriptor {
  return {
    kind: 'local-elementor',
    label: 'Local Elementor Library',
    scope: 'site',
    availability: 'active',
    storageModel: 'wordpress-local',
    syncMode: 'none',
    targetSystem: 'elementor_library on the current WordPress site',
    notes: [
      'Primary target system for current Free and Advanced workflows.',
      'Elementify should strengthen this local system rather than replace it.',
    ],
  };
}

export function getElementifyPremiumLibraryProvider(
  tier: LibraryBoundaryReport['tier'],
): LibraryProviderDescriptor {
  return {
    kind: 'elementify-premium',
    label: 'Elementify Premium Library',
    scope: 'catalog',
    availability: tier === 'advanced' ? 'active' : 'gated',
    storageModel: 'curated-catalog',
    syncMode: 'manual-import',
    targetSystem: 'Imports into or operates alongside the local Elementor Library',
    notes: [
      'Curated premium templates and reusable structures.',
      'This is not cloud storage and does not imply cross-site sync.',
      tier === 'advanced'
        ? 'Visible in Advanced as the first Elementify Library experience.'
        : 'Not available in Free and not exposed in the public mirror.',
    ],
  };
}

export function getElementifyCloudLibraryProvider(): LibraryProviderDescriptor {
  return {
    kind: 'elementify-cloud',
    label: 'Elementify Cloud Library',
    scope: 'workspace',
    availability: 'planned',
    storageModel: 'cloud-sync',
    syncMode: 'cloud-sync',
    targetSystem: 'Future cross-site Elementify workspace and delivery layer',
    notes: [
      'Reserved for later Studio cloud-library and cross-site reuse workflows.',
      'Not part of the current Free or Advanced runtime surface.',
    ],
  };
}

export function buildLibraryBoundaryReport(
  tier: LibraryBoundaryReport['tier'],
): LibraryBoundaryReport {
  const profile = getProductTierProfile(tier);

  return {
    tier,
    defaultProvider: 'local-elementor',
    providers: [
      getLocalElementorLibraryProvider(),
      getElementifyPremiumLibraryProvider(tier),
      getElementifyCloudLibraryProvider(),
    ],
    usageRules: [
      'The local Elementor Library remains the default operational target system.',
      tier === 'advanced'
        ? 'Premium library assets may be used, but only through local-site operational flows.'
        : 'Premium library access is not part of the active public product surface.',
      'Cloud library semantics remain deferred until Studio is explicitly introduced.',
      `Current tier entitlements: ${profile.entitlements.join(', ')}`,
    ],
  };
}
