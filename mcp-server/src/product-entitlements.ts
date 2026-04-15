export type ProductTier = 'free' | 'advanced' | 'studio_future';

export type ProductVisibility = 'public' | 'private' | 'future';

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

export interface ProductTierProfile {
  tier: ProductTier;
  label: string;
  visibility: ProductVisibility;
  entitlements: ProductEntitlement[];
  notes?: string[];
}

export const PRODUCT_TIER_PROFILES: ProductTierProfile[] = [
  {
    tier: 'free',
    label: 'Free',
    visibility: 'public',
    entitlements: [
      'site-intelligence',
      'local-library',
      'simple-assembly',
      'brand-setup',
    ],
    notes: [
      'Public and mirror-safe.',
      'Uses the local Elementor Library as the primary target system.',
    ],
  },
  {
    tier: 'advanced',
    label: 'Advanced',
    visibility: 'private',
    entitlements: [
      'site-intelligence',
      'local-library',
      'simple-assembly',
      'brand-setup',
      'advanced-creation',
      'theme-builder-workflows',
      'governed-changes',
      'premium-library',
      'brand-adaptation',
      'ai-critique',
    ],
    notes: [
      'Private Forgejo surface on top of the Free core.',
      'Premium library is local-site operational and not a cloud library.',
    ],
  },
  {
    tier: 'studio_future',
    label: 'Studio Future',
    visibility: 'future',
    entitlements: [
      'site-intelligence',
      'local-library',
      'simple-assembly',
      'brand-setup',
      'advanced-creation',
      'theme-builder-workflows',
      'governed-changes',
      'premium-library',
      'brand-adaptation',
      'ai-critique',
      'studio-orchestration',
      'cloud-library',
    ],
    notes: [
      'Reserved for future orchestration, cloud library, and cross-site delivery.',
      'Not part of the current public or paid packaging surface.',
    ],
  },
];

const TIER_PROFILE_MAP = new Map(
  PRODUCT_TIER_PROFILES.map((profile) => [profile.tier, profile]),
);

export function getProductTierProfile(tier: ProductTierProfile['tier']): ProductTierProfile {
  const profile = TIER_PROFILE_MAP.get(tier);
  if (!profile) {
    throw new Error(`Unknown product tier profile: ${tier}`);
  }
  return profile;
}
