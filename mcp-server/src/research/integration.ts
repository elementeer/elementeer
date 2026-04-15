import type { CapabilityResolution } from './resolver.js';
import { resolveCapabilityImplementations } from './resolver.js';
import type { CapabilityMatrix } from '../client.js';

export interface ResearchResolutionPreview {
  summary: string;
  resolutions: CapabilityResolution[];
}

export function buildResearchResolutionPreview(
  capabilityMatrix: CapabilityMatrix,
): ResearchResolutionPreview {
  const relevant = resolveCapabilityImplementations(capabilityMatrix).filter(
    (resolution: CapabilityResolution) => resolution.currentState !== 'available',
  );

  return {
    summary: relevant.length > 0
      ? 'Experimental research preview for capabilities that are currently limited or missing.'
      : 'No research preview is needed because all tracked capabilities are already available.',
    resolutions: relevant,
  };
}
