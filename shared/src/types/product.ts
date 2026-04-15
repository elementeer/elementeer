export type ProductTier = 'free' | 'advanced' | 'studio_future';

export type ProductVisibility = 'public' | 'private' | 'future';

export type ProductSurfaceKind =
  | 'tool'
  | 'workflow'
  | 'provider'
  | 'asset'
  | 'contract';

export type ProductEntitlement =
  | 'site-intelligence'
  | 'local-library'
  | 'simple-assembly'
  | 'brand-setup'
  | 'advanced-creation'
  | 'theme-builder-workflows'
  | 'governed-changes'
  | 'premium-library'
  | 'brand-adaptation'
  | 'ai-critique'
  | 'studio-orchestration'
  | 'cloud-library';

export interface ProductSurfaceAssignment {
  id: string;
  label: string;
  tier: ProductTier;
  visibility: ProductVisibility;
  kind: ProductSurfaceKind;
  rationale: string;
  dependsOn?: string[];
  notes?: string[];
}

export interface ProductTierProfile {
  tier: ProductTier;
  label: string;
  visibility: ProductVisibility;
  entitlements: ProductEntitlement[];
  notes?: string[];
}

export interface TierBoundaryCase {
  id: string;
  decision: string;
  rationale: string;
  affectedSurfaces: string[];
}
