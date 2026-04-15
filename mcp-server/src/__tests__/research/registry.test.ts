import { describe, expect, it } from 'vitest';
import {
  RESEARCH_REGISTRY_SEED,
  findRegistryEntriesForCapability,
  getRegistryEntry,
  listResearchRegistryEntries,
} from '../../research/registry.js';

describe('research registry seed', () => {
  it('contains representative plugin entries', () => {
    expect(RESEARCH_REGISTRY_SEED.length).toBeGreaterThanOrEqual(4);
    expect(RESEARCH_REGISTRY_SEED.some((entry) => entry.pluginId === 'header-footer-elementor')).toBe(true);
    expect(RESEARCH_REGISTRY_SEED.some((entry) => entry.pluginId === 'shopengine')).toBe(true);
    expect(RESEARCH_REGISTRY_SEED.some((entry) => entry.pluginId === 'wpml')).toBe(true);
  });

  it('returns cloned registry entries', () => {
    const entries = listResearchRegistryEntries();
    entries[0]!.widgetFamilies.push('mutated');

    expect(RESEARCH_REGISTRY_SEED[0]!.widgetFamilies).not.toContain('mutated');
  });

  it('finds entries by capability', () => {
    const entries = findRegistryEntriesForCapability('multilingual-workflows');

    expect(entries).toHaveLength(1);
    expect(entries[0]!.pluginId).toBe('wpml');
  });

  it('gets a single entry by id', () => {
    const entry = getRegistryEntry('jetengine');

    expect(entry?.vendor).toBe('Crocoblock');
  });
});
