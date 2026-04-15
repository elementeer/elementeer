import axios from 'axios';
import { z } from 'zod';
import type {
  ImportReport,
  OutputCritique,
  RecommendationEngineReport,
} from './client.js';

const outputCritiqueSchema = z.object({
  verdict: z.enum(['solid', 'caution', 'blocked']),
  summary: z.string().min(1),
  concerns: z.array(z.string().min(1)),
  repairSteps: z.array(z.string().min(1)),
  validationBasis: z.array(z.string().min(1)),
});

interface OutputCritiqueSnapshot {
  sourceRef: string;
  validationResult: ImportReport['validationResult'];
  warningCount: number;
  warnings: string[];
  compatibilitySummary: string;
  capabilityWarnings: string[];
}

export interface OutputCritiqueAiProvider {
  critique(
    snapshot: OutputCritiqueSnapshot,
    fallback: OutputCritique,
  ): Promise<OutputCritique>;
}

function buildSnapshot(
  report: ImportReport,
  recommendationReport: RecommendationEngineReport,
): OutputCritiqueSnapshot {
  return {
    sourceRef: report.sourceRef,
    validationResult: report.validationResult,
    warningCount: report.warnings.length,
    warnings: [...report.warnings],
    compatibilitySummary: recommendationReport.compatibilitySummary,
    capabilityWarnings: [...recommendationReport.capabilityWarnings],
  };
}

export function buildDeterministicOutputCritique(params: {
  report: ImportReport;
  recommendationReport: RecommendationEngineReport;
}): OutputCritique {
  const { report, recommendationReport } = params;
  const concerns = [
    ...report.warnings,
    ...recommendationReport.capabilityWarnings,
  ];
  const repairSteps: string[] = [];

  if (report.validationResult === 'fail') {
    repairSteps.push('Fix the structural validation failures before attempting any live write or import smoke test.');
  } else if (report.validationResult === 'warn') {
    repairSteps.push('Resolve or consciously accept the structural warnings before applying the payload to a live page or template.');
  } else {
    repairSteps.push('Run the prepared smoke-test checklist in a disposable environment before promoting the payload.');
  }

  if (recommendationReport.capabilityWarnings.length > 0) {
    repairSteps.push('Re-check destination capability warnings before relying on Theme Builder, WooCommerce, or other advanced Elementor surfaces.');
  }

  const verdict: OutputCritique['verdict'] = report.validationResult === 'fail'
    ? 'blocked'
    : concerns.length > 0
      ? 'caution'
      : 'solid';

  return {
    verdict,
    summary: verdict === 'blocked'
      ? 'The output is structurally blocked and should not move into a write or import step yet.'
      : verdict === 'caution'
        ? 'The output is structurally usable, but capability or validation warnings should be addressed before rollout.'
        : 'The output is structurally clean and ready for a manual smoke-test pass.',
    concerns,
    repairSteps,
    validationBasis: [
      `Structural validation: ${report.validationResult}`,
      `Compatibility summary: ${recommendationReport.compatibilitySummary}`,
    ],
  };
}

export function createOpenAiOutputCritiqueProvider(
  apiKey: string,
  model = 'gpt-4o-mini',
): OutputCritiqueAiProvider {
  return {
    async critique(
      snapshot: OutputCritiqueSnapshot,
      fallback: OutputCritique,
    ): Promise<OutputCritique> {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You are a bounded Elementor output critique assistant. Improve the fallback critique using only the supplied snapshot. Return JSON only and do not invent capabilities or site facts.',
            },
            {
              role: 'user',
              content: JSON.stringify({ snapshot, fallback }),
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 45_000,
        },
      );

      const raw = (response.data as { choices?: Array<{ message?: { content?: string } }> })
        .choices?.[0]?.message?.content;

      return outputCritiqueSchema.parse(JSON.parse(raw ?? '{}'));
    },
  };
}

export async function critiqueElementorOutput(params: {
  report: ImportReport;
  recommendationReport: RecommendationEngineReport;
  preferAi: boolean;
  provider?: OutputCritiqueAiProvider;
}): Promise<{ mode: 'deterministic' | 'ai-assisted' | 'ai-fallback'; notes: string[]; critique: OutputCritique }> {
  const fallback = buildDeterministicOutputCritique(params);

  if (!params.preferAi || !params.provider) {
    return {
      mode: 'deterministic',
      notes: ['AI critique is disabled or unavailable, so the deterministic critique was used.'],
      critique: fallback,
    };
  }

  try {
    const critique = await params.provider.critique(
      buildSnapshot(params.report, params.recommendationReport),
      fallback,
    );
    return {
      mode: 'ai-assisted',
      notes: ['AI critique is enabled; the output-critique payload was validated before use.'],
      critique,
    };
  } catch (error) {
    return {
      mode: 'ai-fallback',
      notes: [`AI output critique failed and fell back to deterministic mode: ${(error as Error).message}`],
      critique: fallback,
    };
  }
}

export { outputCritiqueSchema };
