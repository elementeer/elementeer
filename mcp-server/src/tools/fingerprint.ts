import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { buildSiteFingerprint } from '../fingerprint.js';

export function registerFingerprintTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  server.tool(
    'get_site_fingerprint',
    'Derive a deterministic site fingerprint from the existing site assessment. Summarizes CMS, builder posture, Elementor and plugin hints, evidence signals, and overall confidence without using scraping or LLMs.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const assessment = await client.assessSite();
      const fingerprint = buildSiteFingerprint(assessment);

      const lines: string[] = [
        `Site Fingerprint — ${assessment.wordpress.site_name}`,
        '',
        '## Summary',
        `  CMS: ${fingerprint.cms}`,
        `  Builder: ${fingerprint.builder}`,
        `  Elementor detected: ${fingerprint.elementorDetected ? 'yes' : 'no'}`,
        `  Elementor Pro: ${fingerprint.elementorPro ? 'yes' : 'no'}`,
        `  WooCommerce: ${fingerprint.ecommerceDetected ? 'yes' : 'no'}`,
        `  Multilingual: ${fingerprint.multilingualDetected ? 'yes' : 'no'}`,
        `  Theme Builder coverage: ${fingerprint.themeBuilderCoverage}`,
        `  Elementor pages: ${fingerprint.elementorPageCount}`,
        `  Confidence: ${fingerprint.confidence}`,
        '',
        '## Signals',
      ];

      for (const signal of fingerprint.signals) {
        lines.push(
          `  - ${signal.label}: ${signal.detected ? 'detected' : 'not detected'} (${signal.confidence})`,
        );
        lines.push(`    Evidence: ${signal.evidence}`);
      }

      if (fingerprint.notes.length > 0) {
        lines.push('');
        lines.push('## Notes');
        for (const note of fingerprint.notes) {
          lines.push(`  - ${note}`);
        }
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}
