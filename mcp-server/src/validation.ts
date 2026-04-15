import type { ImportReport } from './client.js';

interface ElementorNode {
  id?: string;
  elType?: string;
  widgetType?: string;
  elements?: ElementorNode[];
}

function walkElements(
  elements: ElementorNode[],
): { widgetCount: number; ids: string[]; nodesWithoutType: number } {
  let widgetCount = 0;
  let nodesWithoutType = 0;
  const ids: string[] = [];

  const visit = (node: ElementorNode): void => {
    if (typeof node.id === 'string' && node.id.length > 0) {
      ids.push(node.id);
    }

    if (!node.elType && !node.widgetType) {
      nodesWithoutType += 1;
    }

    if (node.widgetType) {
      widgetCount += 1;
    }

    const children = Array.isArray(node.elements) ? node.elements : [];
    for (const child of children) {
      visit(child);
    }
  };

  for (const element of elements) {
    visit(element);
  }

  return { widgetCount, ids, nodesWithoutType };
}

function buildImportSmokeTestPlan(
  report: Pick<ImportReport, 'sourceType' | 'sourceRef' | 'validationResult' | 'warnings'>,
): ImportReport['smokeTestPlan'] {
  const readiness: ImportReport['smokeTestPlan']['readiness'] = report.validationResult === 'fail'
    ? 'blocked'
    : report.validationResult === 'warn'
      ? 'needs-environment'
      : 'ready-for-manual-smoke';

  const checklist = report.validationResult === 'fail'
    ? [
      'Do not write this payload into a live page or template yet.',
      'Resolve the structural validation failures and rerun validate_elementor_write.',
    ]
    : [
      `Apply ${report.sourceRef} into a disposable local Elementor target first.`,
      'Open the result in Elementor and confirm the editor loads without structural recovery warnings.',
      'Preview the frontend and confirm section order, widgets, and obvious responsive behavior.',
    ];

  if (report.validationResult === 'warn') {
    checklist.splice(
      1,
      0,
      `Review validation warnings before the smoke run: ${report.warnings.join(' ')}`,
    );
  }

  return {
    readiness,
    environmentTargets: [
      'local WordPress + Elementor Free baseline',
      'optional secondary Elementor Pro environment when advanced Theme Builder or WooCommerce features are involved',
    ],
    preparedHooks: [
      'validate_elementor_write',
      report.sourceType === 'page' ? 'update_page_data' : report.sourceType === 'template' ? 'update_template_data' : 'manual write path',
    ],
    checklist,
  };
}

export function buildImportReport(params: {
  sourceType: ImportReport['sourceType'];
  sourceRef: string;
  title: string | null;
  elementorData: unknown;
}): ImportReport {
  const warnings: string[] = [];
  const structuralNotes: string[] = [];
  const nextStepHints: string[] = [];

  if (!Array.isArray(params.elementorData)) {
    const failedWarnings = ['Elementor data is not an array.'];
    return {
      sourceType: params.sourceType,
      sourceRef: params.sourceRef,
      templateMetadata: {
        title: params.title,
        topLevelCount: 0,
        widgetCount: 0,
      },
      validationResult: 'fail',
      warnings: failedWarnings,
      structuralNotes: ['Top-level payload failed the basic Elementor array check.'],
      nextStepHints: ['Re-export or re-read the Elementor data before attempting a write operation.'],
      automatedCoverage: 'structural-only',
      smokeTestPlan: buildImportSmokeTestPlan({
        sourceType: params.sourceType,
        sourceRef: params.sourceRef,
        validationResult: 'fail',
        warnings: failedWarnings,
      }),
    };
  }

  const topLevelElements = params.elementorData as ElementorNode[];
  const { widgetCount, ids, nodesWithoutType } = walkElements(topLevelElements);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const topLevelWithoutId = topLevelElements.filter(
    (element) => typeof element.id !== 'string' || element.id.length === 0,
  ).length;

  structuralNotes.push(
    `Top-level Elementor array detected with ${topLevelElements.length} element(s).`,
  );
  structuralNotes.push(`Nested widget count detected: ${widgetCount}.`);

  if (topLevelElements.length === 0) {
    warnings.push('Elementor data is empty.');
  }

  if (topLevelWithoutId > 0) {
    warnings.push(
      `${topLevelWithoutId} top-level element(s) are missing a stable id.`,
    );
  }

  if (nodesWithoutType > 0) {
    warnings.push(
      `${nodesWithoutType} element node(s) are missing elType/widgetType hints.`,
    );
  }

  if (duplicateIds.length > 0) {
    warnings.push(
      `Duplicate element ids detected: ${[...new Set(duplicateIds)].join(', ')}.`,
    );
  }

  const validationResult: ImportReport['validationResult'] = topLevelElements.length === 0
    ? 'fail'
    : warnings.length > 0
      ? 'warn'
      : 'pass';

  if (validationResult === 'pass') {
    nextStepHints.push(
      'Structure looks safe for a write-path smoke test through the existing page/template tools.',
    );
  } else {
    nextStepHints.push(
      'Review the warnings before applying this payload to a live page or template.',
    );
  }

  nextStepHints.push(
    'This report is structural only and does not guarantee visual correctness inside Elementor.',
  );

  const partialReport = {
    sourceType: params.sourceType,
    sourceRef: params.sourceRef,
    validationResult,
    warnings,
  };

  return {
    sourceType: params.sourceType,
    sourceRef: params.sourceRef,
    templateMetadata: {
      title: params.title,
      topLevelCount: topLevelElements.length,
      widgetCount,
    },
    validationResult,
    warnings,
    structuralNotes,
    nextStepHints,
    automatedCoverage: 'structural-only',
    smokeTestPlan: buildImportSmokeTestPlan(partialReport),
  };
}
