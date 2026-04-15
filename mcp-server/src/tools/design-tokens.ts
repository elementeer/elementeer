import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  DesignColorToken,
  DesignSpacingToken,
  DesignTokenReport,
  DesignTypographyToken,
  DesignValueHint,
  ElementifyClient,
} from '../client.js';
import { buildDesignTokenReport } from '../design-tokens.js';

export function registerDesignTokenTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  server.tool(
    'extract_design_tokens',
    'Extract a heuristic design-token report from Elementor global styles plus current site assessment. Returns color and typography tokens from the active Elementor Kit and derives spacing, radius, and shadow hints conservatively.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const [styles, assessment] = await Promise.all([
        client.getGlobalStyles(),
        client.assessSite(),
      ]);
      const report = buildDesignTokenReport(styles, assessment);

      const lines: string[] = [
        `Design Token Report — ${assessment.wordpress.site_name}`,
        '',
        `Colors: ${report.colors.length}`,
        `Typography: ${report.typography.length}`,
        `Spacing hints: ${report.spacing.length}`,
        '',
        '## Colors',
      ];

      if (report.colors.length === 0) {
        lines.push('  (none detected)');
      } else {
        lines.push(
          ...report.colors.map(
            (token: DesignColorToken) => `  [${token.id}] ${token.title}: ${token.value} (${token.source})`,
          ),
        );
      }

      lines.push('');
      lines.push('## Typography');
      if (report.typography.length === 0) {
        lines.push('  (none detected)');
      } else {
        lines.push(
          ...report.typography.map((token: DesignTypographyToken) => {
            const details = [
              token.fontFamily ?? 'unknown font',
              token.fontWeight ?? 'unknown weight',
              token.fontSize ? `${token.fontSize}px` : 'unknown size',
            ].join(' · ');
            return `  [${token.id}] ${token.title}: ${details} (${token.source})`;
          }),
        );
      }

      lines.push('');
      lines.push('## Spacing Hints');
      lines.push(
        ...report.spacing.map(
          (token: DesignSpacingToken) => `  [${token.id}] ${token.label}: ${token.pixels}px — ${token.reason}`,
        ),
      );

      lines.push('');
      lines.push('## Radius Hints');
      lines.push(
        ...report.radiusHints.map(
          (hint: DesignValueHint) => `  [${hint.id}] ${hint.label}: ${hint.value} — ${hint.reason}`,
        ),
      );

      lines.push('');
      lines.push('## Shadow Hints');
      lines.push(
        ...report.shadowHints.map(
          (hint: DesignValueHint) => `  [${hint.id}] ${hint.label}: ${hint.value} — ${hint.reason}`,
        ),
      );

      lines.push('');
      lines.push('## Notes');
      lines.push(...report.notes.map((note: DesignTokenReport['notes'][number]) => `  - ${note}`));

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}
