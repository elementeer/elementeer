import type {
  DesignColorToken,
  DesignSpacingToken,
  DesignTokenReport,
  DesignTypographyToken,
  DesignValueHint,
  GlobalStylesData,
  SiteAssessment,
} from './client.js';

type RawTypographyEntry = Record<string, unknown>;

function parseTypographySize(entry: RawTypographyEntry): number | null {
  const size = (entry.typography_font_size as { size?: number } | undefined)?.size;
  return typeof size === 'number' ? size : null;
}

function parseTypographyLineHeight(entry: RawTypographyEntry): number | null {
  const size = (entry.typography_line_height as { size?: number } | undefined)?.size;
  return typeof size === 'number' ? size : null;
}

function extractTypographyTokens(
  entries: unknown[],
  source: DesignTypographyToken['source'],
): DesignTypographyToken[] {
  return entries.map((entry: unknown, index: number) => {
    const raw = entry as RawTypographyEntry;
    const fallbackId = `${source}-${index + 1}`;

    return {
      id: typeof raw._id === 'string' ? raw._id : fallbackId,
      title: typeof raw.title === 'string' ? raw.title : fallbackId,
      fontFamily: typeof raw.typography_font_family === 'string'
        ? raw.typography_font_family
        : null,
      fontSize: parseTypographySize(raw),
      fontWeight: typeof raw.typography_font_weight === 'string'
        ? raw.typography_font_weight
        : null,
      lineHeight: parseTypographyLineHeight(raw),
      source,
    };
  });
}

function roundToFour(value: number): number {
  return Math.max(4, Math.round(value / 4) * 4);
}

function buildSpacingTokens(
  typography: DesignTypographyToken[],
): DesignSpacingToken[] {
  const sizes = typography
    .map((token: DesignTypographyToken) => token.fontSize)
    .filter((size: number | null): size is number => typeof size === 'number')
    .sort((left, right) => left - right);
  const base = sizes[0] ?? 16;

  return [
    {
      id: 'space-sm',
      label: 'Compact spacing',
      pixels: roundToFour(base * 0.5),
      source: 'heuristic',
      reason: 'Derived from the smallest global typography size for tighter UI gaps.',
    },
    {
      id: 'space-md',
      label: 'Base spacing',
      pixels: roundToFour(base),
      source: 'heuristic',
      reason: 'Derived from the smallest global typography size as the baseline rhythm.',
    },
    {
      id: 'space-lg',
      label: 'Section spacing',
      pixels: roundToFour(base * 1.5),
      source: 'heuristic',
      reason: 'Scaled from the typography baseline for larger vertical rhythm.',
    },
  ];
}

function buildRadiusHints(assessment: SiteAssessment): DesignValueHint[] {
  const cardRadius = assessment.plugins.woocommerce ? '16px' : '12px';

  return [
    {
      id: 'radius-control',
      label: 'Control radius',
      value: '6px',
      source: 'heuristic',
      reason: 'Conservative control radius that stays close to default Elementor form controls.',
    },
    {
      id: 'radius-card',
      label: 'Card radius',
      value: cardRadius,
      source: 'heuristic',
      reason: assessment.plugins.woocommerce
        ? 'Slightly larger radius to suit product cards and merchandising surfaces.'
        : 'Neutral starting point for cards, callouts, and content panels.',
    },
  ];
}

function buildShadowHints(assessment: SiteAssessment): DesignValueHint[] {
  const elevatedValue = assessment.plugins.woocommerce
    ? '0 18px 40px rgba(17, 24, 39, 0.14)'
    : '0 12px 32px rgba(17, 24, 39, 0.12)';

  return [
    {
      id: 'shadow-soft',
      label: 'Soft elevation',
      value: elevatedValue,
      source: 'heuristic',
      reason: assessment.plugins.woocommerce
        ? 'A slightly stronger shadow helps product cards separate from dense catalog grids.'
        : 'A conservative neutral shadow for cards, modals, and layered sections.',
    },
  ];
}

export function buildDesignTokenReport(
  styles: GlobalStylesData,
  assessment: SiteAssessment,
): DesignTokenReport {
  const colors: DesignColorToken[] = [
    ...styles.system_colors.map((entry) => ({
      id: entry._id,
      title: entry.title,
      value: entry.color,
      source: 'system-color' as const,
    })),
    ...styles.custom_colors.map((entry) => ({
      id: entry._id,
      title: entry.title,
      value: entry.color,
      source: 'custom-color' as const,
    })),
  ];
  const typography: DesignTypographyToken[] = [
    ...extractTypographyTokens(styles.system_typography, 'system-typography'),
    ...extractTypographyTokens(styles.custom_typography, 'custom-typography'),
  ];

  const notes: string[] = [];
  if (colors.length === 0) {
    notes.push('No global colors were detected, so color tokens are currently empty.');
  }
  if (typography.length === 0) {
    notes.push('No global typography entries were detected, so spacing hints fall back to a 16px baseline.');
  }
  notes.push('Spacing, radius, and shadow outputs are heuristic hints derived from site styles and assessment data, not rendered CSS inspection.');

  return {
    colors,
    typography,
    spacing: buildSpacingTokens(typography),
    radiusHints: buildRadiusHints(assessment),
    shadowHints: buildShadowHints(assessment),
    notes,
  };
}
