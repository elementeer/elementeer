import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient, GlobalColor, GlobalTypographyEntry } from '../client.js';
import { GOVERNANCE_LEVELS } from '../product-tiers.js';

const colorSchema = z.object({
  id:    z.string().optional().describe('Stable ID for this color slot (e.g. "primary", "brand-blue"). Auto-generated from title if omitted.'),
  title: z.string().describe('Human-readable color name (e.g. "Primary", "Brand Blue")'),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex color: #RGB or #RRGGBB'),
});

const typographySchema = z.object({
  id:             z.string().optional().describe('Stable ID (e.g. "primary", "heading-h1"). Auto-generated from title if omitted.'),
  title:          z.string().describe('Human-readable label (e.g. "Primary", "Heading H1")'),
  font_family:    z.string().optional().describe('Google Font or system font name, e.g. "Inter", "Georgia"'),
  font_size:      z.number().int().min(8).max(200).optional().describe('Font size in px'),
  font_weight:    z.string().optional().describe('CSS font weight: "400", "500", "600", "700", "800"'),
  line_height:    z.number().min(0.5).max(5).optional().describe('Line height as em multiplier, e.g. 1.6'),
  letter_spacing: z.number().optional().describe('Letter spacing in px, e.g. 0.5'),
  text_transform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
});

export function registerGlobalStylesTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {

  // ------------------------------------------------------------------ //
  // get_global_styles
  // ------------------------------------------------------------------ //
  server.tool(
    'get_global_styles',
    'Read the current Global Colors and Global Typography from the active Elementor Kit. Returns both system slots (Primary, Secondary, Text, Accent) and any custom additions. Use this before set_global_colors or set_global_typography to understand the current state.',
    {
      site_id: z.string().optional(),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const data = await client.getGlobalStyles();

      const lines: string[] = [
        `Global Styles — Kit ID: ${data.kit_id}`,
        '',
        '## System Colors',
      ];

      if (data.system_colors.length === 0) {
        lines.push('  (none defined)');
      } else {
        for (const c of data.system_colors) {
          lines.push(`  [${c._id}] ${c.title}: ${c.color}`);
        }
      }

      lines.push('');
      lines.push('## Custom Colors');
      if (data.custom_colors.length === 0) {
        lines.push('  (none defined)');
      } else {
        for (const c of data.custom_colors) {
          lines.push(`  [${c._id}] ${c.title}: ${c.color}`);
        }
      }

      lines.push('');
      lines.push(`## System Typography  (${(data.system_typography as unknown[]).length} entries)`);
      for (const t of data.system_typography as Array<Record<string, unknown>>) {
        const ff = (t['typography_font_family'] as string | undefined) ?? '—';
        const fw = (t['typography_font_weight'] as string | undefined) ?? '';
        const fs = (t['typography_font_size'] as { size?: number } | undefined)?.size;
        lines.push(`  [${t['_id']}] ${t['title']}: ${ff}${fw ? ' ' + fw : ''}${fs ? ' ' + fs + 'px' : ''}`);
      }

      lines.push('');
      lines.push(`## Custom Typography  (${(data.custom_typography as unknown[]).length} entries)`);

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ------------------------------------------------------------------ //
  // set_global_colors
  // ------------------------------------------------------------------ //
  server.tool(
    'set_global_colors',
    'Write a color palette to the active Elementor Kit. Replaces the target slot entirely. Use slot="system" (default) to set the four main brand colors (Primary, Secondary, Text, Accent), or slot="custom" to manage additional palette entries. After writing, Elementor\'s CSS cache is cleared automatically.',
    {
      site_id: z.string().optional(),
      colors:  z.array(colorSchema).min(1).max(20)
                 .describe('Color entries. Recommended system slot titles: Primary, Secondary, Text, Accent.'),
      slot:    z.enum(['system', 'custom']).optional().default('system')
                 .describe('"system" = main brand palette (Primary/Secondary/Text/Accent), "custom" = additional colors'),
      note:    z.string().optional()
                 .describe('Optional note for queued changes (auto-queued for L2 governance)'),
      consent: z.boolean().optional()
                 .describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async ({ site_id, colors, slot, note, consent }) => {
      const client = getClient(site_id);
      const toolName = 'set_global_colors';
      const level = GOVERNANCE_LEVELS[toolName] || 'L0';
      
      // L3 requires explicit consent
      if (level === 'L3' && consent !== true) {
        return {
          content: [{
            type: 'text',
            text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
          }],
        };
      }
      
      // L2 always queues regardless of write_mode
      if (level === 'L2' || level === 'L3') {
        const change = await client.createChange({
          operation: toolName,
          params: { colors, slot },
          note: note || `Auto-queued by governance level ${level}`,
        });

        const lines = [
          `🟡 Change queued for review (governance level ${level})`,
          `   ID: ${change.id}`,
          `   Operation: ${toolName}`,
          note ? `   Note: ${note}` : '',
          '',
          'Next steps:',
          '  1. review_change(change_id, "approve") — approve it',
          '  2. apply_change(change_id)             — execute it on the site',
          '  Or: review_change(change_id, "reject") to discard.',
          '',
          'Use list_change_queue to see all pending changes.',
        ].filter(Boolean);

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
      
      // L0/L1: Execute directly
      const result = await client.setGlobalColors(colors as GlobalColor[], slot ?? 'system');

      const lines = [
        `✅ ${result.colors.length} color(s) written to ${result.slot} — Kit ID: ${result.kit_id}`,
        '',
        ...(result.colors as Array<{ _id: string; title: string; color: string }>).map((c) => `  [${c._id}] ${c.title}: ${c.color}`),
        '',
        'Elementor CSS cache cleared. Changes are live.',
      ];

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ------------------------------------------------------------------ //
  // set_global_typography
  // ------------------------------------------------------------------ //
  server.tool(
    'set_global_typography',
    'Write typography definitions to the active Elementor Kit. Replaces the target slot entirely. Use slot="system" (default) to set the main typographic roles (Primary, Secondary, Text, Accent), or slot="custom" for additional entries. Accepts font_family (Google Font or system font), font_size (px), font_weight, line_height (em), letter_spacing (px), text_transform.',
    {
      site_id:    z.string().optional(),
      typography: z.array(typographySchema).min(1).max(20)
                   .describe('Typography entries. Recommended system titles: Primary, Secondary, Text, Accent.'),
      slot:       z.enum(['system', 'custom']).optional().default('system'),
      note:       z.string().optional()
                   .describe('Optional note for queued changes (auto-queued for L2 governance)'),
      consent:    z.boolean().optional()
                   .describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async ({ site_id, typography, slot, note, consent }) => {
      const client = getClient(site_id);
      const toolName = 'set_global_typography';
      const level = GOVERNANCE_LEVELS[toolName] || 'L0';
      
      // L3 requires explicit consent
      if (level === 'L3' && consent !== true) {
        return {
          content: [{
            type: 'text',
            text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
          }],
        };
      }
      
      // L2 always queues regardless of write_mode
      if (level === 'L2' || level === 'L3') {
        const change = await client.createChange({
          operation: toolName,
          params: { typography, slot },
          note: note || `Auto-queued by governance level ${level}`,
        });

        const lines = [
          `🟡 Change queued for review (governance level ${level})`,
          `   ID: ${change.id}`,
          `   Operation: ${toolName}`,
          note ? `   Note: ${note}` : '',
          '',
          'Next steps:',
          '  1. review_change(change_id, "approve") — approve it',
          '  2. apply_change(change_id)             — execute it on the site',
          '  Or: review_change(change_id, "reject") to discard.',
          '',
          'Use list_change_queue to see all pending changes.',
        ].filter(Boolean);

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
      
      // L0/L1: Execute directly
      const result = await client.setGlobalTypography(typography as GlobalTypographyEntry[], slot ?? 'system');
      const written = result.typography as Array<Record<string, unknown>>;

      const lines = [
        `✅ ${written.length} typography entry/entries written to ${result.slot} — Kit ID: ${result.kit_id}`,
        '',
      ];

      for (const t of written) {
        const ff  = (t['typography_font_family'] as string | undefined) ?? '—';
        const fw  = (t['typography_font_weight'] as string | undefined) ?? '';
        const fs  = (t['typography_font_size'] as { size?: number } | undefined)?.size;
        const lh  = (t['typography_line_height'] as { size?: number } | undefined)?.size;
        lines.push(
          `  [${t['_id']}] ${t['title']}: ${ff}${fw ? ' ' + fw : ''}${fs ? ' · ' + fs + 'px' : ''}${lh ? ' · lh ' + lh : ''}`,
        );
      }

      lines.push('', 'Elementor CSS cache cleared. Changes are live.');
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );
}
