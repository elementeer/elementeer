import { describe, expect, it } from 'vitest';
import {
  buildLibraryBoundaryReport,
  getElementifyCloudLibraryProvider,
  getElementifyPremiumLibraryProvider,
  getLocalElementorLibraryProvider,
} from '../library-providers.js';

describe('library providers', () => {
  it('keeps the local Elementor library as the default active provider', () => {
    const provider = getLocalElementorLibraryProvider();

    expect(provider.kind).toBe('local-elementor');
    expect(provider.availability).toBe('active');
    expect(provider.storageModel).toBe('wordpress-local');
  });

  it('treats premium library as active only for Advanced', () => {
    expect(getElementifyPremiumLibraryProvider('free').availability).toBe('gated');
    expect(getElementifyPremiumLibraryProvider('advanced').availability).toBe('active');
    expect(getElementifyPremiumLibraryProvider('advanced').syncMode).toBe('manual-import');
  });

  it('keeps cloud library planned and deferred', () => {
    const provider = getElementifyCloudLibraryProvider();

    expect(provider.kind).toBe('elementify-cloud');
    expect(provider.availability).toBe('planned');
    expect(provider.syncMode).toBe('cloud-sync');
  });

  it('builds a tier-specific boundary report', () => {
    const freeReport = buildLibraryBoundaryReport('free');
    const advancedReport = buildLibraryBoundaryReport('advanced');

    expect(freeReport.defaultProvider).toBe('local-elementor');
    expect(freeReport.providers[1]!.availability).toBe('gated');
    expect(advancedReport.providers[1]!.availability).toBe('active');
    expect(advancedReport.providers[2]!.availability).toBe('planned');
    expect(advancedReport.usageRules[0]).toContain('local Elementor Library');
  });
});
