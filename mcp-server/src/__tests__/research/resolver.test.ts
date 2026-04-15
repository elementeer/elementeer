import { describe, expect, it } from 'vitest';
import type { CapabilityMatrix, DestinationProfile } from '../../client.js';
import { resolveCapabilityImplementations } from '../../research/resolver.js';

function makeMatrix(overrides: Partial<CapabilityMatrix> = {}): CapabilityMatrix {
  const destination: DestinationProfile = {
    kind: 'elementor-free',
    label: 'Elementor Free',
    elementorDetected: true,
    elementorPro: false,
    activePluginCategories: [],
    notes: [],
  };

  return {
    destination,
    capabilities: [
      {
        id: 'theme-builder',
        available: false,
        source: 'unknown',
        notes: ['No reliable Theme Builder capability signal detected.'],
      },
      {
        id: 'multilingual-workflows',
        available: false,
        source: 'unknown',
        notes: ['No multilingual plugin detected.'],
      },
      {
        id: 'global-styles',
        available: true,
        source: 'elementor-free',
        notes: ['Global Elementor Kit styles can be read and updated.'],
      },
    ],
    compatibilitySummary: 'Destination supports the core Elementor workflows, with some advanced capabilities limited.',
    warnings: ['Elementor Pro is not detected, so some advanced Theme Builder workflows may be limited.'],
    ...overrides,
  };
}

describe('resolveCapabilityImplementations', () => {
  it('prefers plugin-assisted options when capability is missing but registry entries exist', () => {
    const resolutions = resolveCapabilityImplementations(makeMatrix());
    const themeBuilder = resolutions.find((resolution) => resolution.capabilityId === 'theme-builder');

    expect(themeBuilder?.selected.mode).toBe('plugin-assisted');
    expect(themeBuilder?.selected.pluginId).toBe('header-footer-elementor');
  });

  it('keeps native-elementor selected when capability is already available', () => {
    const resolutions = resolveCapabilityImplementations(makeMatrix());
    const globalStyles = resolutions.find((resolution) => resolution.capabilityId === 'global-styles');

    expect(globalStyles?.selected.mode).toBe('native-elementor');
    expect(globalStyles?.selected.pluginId).toBeNull();
  });

  it('includes conservative fallback alternatives', () => {
    const resolutions = resolveCapabilityImplementations(makeMatrix());
    const multilingual = resolutions.find((resolution) => resolution.capabilityId === 'multilingual-workflows');

    expect(multilingual?.alternatives.some((option) => option.mode === 'fallback')).toBe(true);
    expect(multilingual?.explain[0]).toContain('Destination summary');
  });
});
