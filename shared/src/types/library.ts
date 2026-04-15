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

export type PremiumLibraryAssetType =
  | 'page-starter'
  | 'section-starter'
  | 'component'
  | 'theme-block';

export type PremiumLibraryAssetCollection =
  | 'conversion'
  | 'service-pages'
  | 'trust-components'
  | 'theme-builder';

export type PremiumLibraryCurationLevel =
  | 'signature'
  | 'featured'
  | 'specialist';

export type PremiumLibraryAudience =
  | 'freelancer'
  | 'agency'
  | 'site-owner';

export interface PremiumLibraryAssetSummary {
  id: string;
  title: string;
  type: PremiumLibraryAssetType;
  collection: PremiumLibraryAssetCollection;
  curationLevel: PremiumLibraryCurationLevel;
  audience: PremiumLibraryAudience[];
  summary: string;
  intendedUse: string;
  tags: string[];
  curationSignals: string[];
  useCases: string[];
}

export interface PremiumLibraryAssetDetail extends PremiumLibraryAssetSummary {
  description: string;
  localImportNotes: string[];
  prerequisites: string[];
  guardrails: string[];
}

export interface PremiumLibraryCatalogReport {
  provider: 'elementify-premium';
  availability: LibraryProviderAvailability;
  assetCount: number;
  assets: PremiumLibraryAssetSummary[];
  notes: string[];
}

export interface PremiumLibraryInspectionReport {
  provider: 'elementify-premium';
  availability: LibraryProviderAvailability;
  asset: PremiumLibraryAssetDetail;
  importMode: 'manual-import';
  recommendedWorkflow: string[];
  notes: string[];
}

export interface PremiumLibraryUsagePlan {
  assetId?: string;
  assetTitle?: string;
  targetType: PremiumLibraryAssetType;
  activeProvider: LibraryProviderKind;
  premiumProviderAvailable: boolean;
  importMode: 'manual-import';
  recommendedWorkflow: string[];
  prerequisites: string[];
  guardrails: string[];
  notes: string[];
}
