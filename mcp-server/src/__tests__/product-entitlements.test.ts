import { describe, expect, it } from 'vitest';
import {
  getProductTierProfile,
  PRODUCT_TIER_PROFILES,
} from '../product-entitlements.js';

describe('product tier profiles', () => {
  it('defines a profile for each current tier', () => {
    expect(PRODUCT_TIER_PROFILES.map((profile) => profile.tier)).toEqual([
      'free',
      'advanced',
      'studio_future',
    ]);
  });

  it('keeps free mirror-safe and advanced private', () => {
    expect(getProductTierProfile('free').visibility).toBe('public');
    expect(getProductTierProfile('advanced').visibility).toBe('private');
    expect(getProductTierProfile('free').entitlements).not.toContain('premium-library');
    expect(getProductTierProfile('advanced').entitlements).toContain('premium-library');
  });

  it('reserves orchestration and cloud entitlements for studio_future', () => {
    expect(getProductTierProfile('studio_future').entitlements).toContain('studio-orchestration');
    expect(getProductTierProfile('studio_future').entitlements).toContain('cloud-library');
    expect(getProductTierProfile('free').entitlements).not.toContain('cloud-library');
  });
});
