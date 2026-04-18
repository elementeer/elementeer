/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { Capability, CapabilityId, CapabilityMatrix } from '../client.js';
import {
  findRegistryEntriesForCapability,
  type ResearchRegistryEntry,
} from './registry.js';

export type ResearchResolutionMode =
  | 'native-elementor'
  | 'plugin-assisted'
  | 'fallback';

export interface CapabilityResolutionOption {
  mode: ResearchResolutionMode;
  label: string;
  capabilityId: CapabilityId;
  pluginId: string | null;
  widgetFamilies: string[];
  rationale: string[];
}

export interface CapabilityResolution {
  capabilityId: CapabilityId;
  currentState: 'available' | 'limited' | 'missing';
  selected: CapabilityResolutionOption;
  alternatives: CapabilityResolutionOption[];
  explain: string[];
}

function buildNativeOption(capability: Capability): CapabilityResolutionOption {
  const labelMap: Record<CapabilityId, string> = {
    'global-styles': 'Elementor Kit global styles',
    'page-composition': 'Elementify page composition on Elementor data',
    'theme-builder': 'Elementor Theme Builder',
    'woocommerce-templates': 'Elementor WooCommerce templates',
    'multilingual-workflows': 'Current multilingual plugin workflow',
    'change-review': 'Elementify change review queue',
  };

  return {
    mode: 'native-elementor',
    label: labelMap[capability.id],
    capabilityId: capability.id,
    pluginId: null,
    widgetFamilies: [],
    rationale: [...capability.notes],
  };
}

function buildPluginOption(
  capabilityId: CapabilityId,
  entry: ResearchRegistryEntry,
): CapabilityResolutionOption {
  return {
    mode: 'plugin-assisted',
    label: `${entry.name} (${entry.vendor})`,
    capabilityId,
    pluginId: entry.pluginId,
    widgetFamilies: [...entry.widgetFamilies],
    rationale: [...entry.compatibilityNotes],
  };
}

function buildFallbackOption(capability: Capability): CapabilityResolutionOption {
  const fallbackMap: Record<CapabilityId, string> = {
    'global-styles': 'Use local style conventions and postpone kit-wide automation.',
    'page-composition': 'Compose fewer pages and validate each write manually.',
    'theme-builder': 'Rely on the active theme shell and page-level composition until Theme Builder is available.',
    'woocommerce-templates': 'Keep WooCommerce on the default theme templates until a supported template path is available.',
    'multilingual-workflows': 'Keep multilingual content scoped and validate translations manually.',
    'change-review': 'Use documented human review outside the queue when the queue is unavailable.',
  };

  return {
    mode: 'fallback',
    label: 'Conservative fallback',
    capabilityId: capability.id,
    pluginId: null,
    widgetFamilies: [],
    rationale: [fallbackMap[capability.id], ...capability.notes],
  };
}

function inferCurrentState(capability: Capability): CapabilityResolution['currentState'] {
  if (capability.available && capability.source !== 'unknown') {
    return capability.source === 'plugin-assisted' ? 'limited' : 'available';
  }

  return 'missing';
}

function selectResolution(
  capability: Capability,
  pluginOptions: CapabilityResolutionOption[],
  fallbackOption: CapabilityResolutionOption,
): CapabilityResolutionOption {
  if (capability.available && capability.source !== 'plugin-assisted') {
    return buildNativeOption(capability);
  }

  if (capability.available && capability.source === 'plugin-assisted' && pluginOptions.length > 0) {
    return pluginOptions[0]!;
  }

  if (pluginOptions.length > 0) {
    return pluginOptions[0]!;
  }

  return fallbackOption;
}

export function resolveCapabilityImplementations(
  capabilityMatrix: CapabilityMatrix,
): CapabilityResolution[] {
  return capabilityMatrix.capabilities.map((capability: Capability) => {
    const pluginEntries = findRegistryEntriesForCapability(capability.id);
    const pluginOptions = pluginEntries.map((entry: ResearchRegistryEntry) =>
      buildPluginOption(capability.id, entry),
    );
    const fallbackOption = buildFallbackOption(capability);
    const selected = selectResolution(capability, pluginOptions, fallbackOption);
    const nativeOption = buildNativeOption(capability);
    const alternatives = [
      nativeOption,
      ...pluginOptions,
      fallbackOption,
    ].filter((option: CapabilityResolutionOption, index: number, all) =>
      all.findIndex((candidate) =>
        candidate.mode === option.mode
        && candidate.pluginId === option.pluginId
        && candidate.capabilityId === option.capabilityId,
      ) === index
        && !(option.mode === selected.mode && option.pluginId === selected.pluginId),
    );

    return {
      capabilityId: capability.id,
      currentState: inferCurrentState(capability),
      selected,
      alternatives,
      explain: [
        `Destination summary: ${capabilityMatrix.compatibilitySummary}`,
        ...capability.notes,
        ...capabilityMatrix.warnings,
      ],
    };
  });
}
