import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient, SiteAssessment, AssessmentIssue } from '../client.js';

export function registerAssessmentTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {

  server.tool(
    'assess_site',
    'Run a comprehensive assessment of the WordPress/Elementor site. Returns brand completeness, Theme Builder template inventory, template library stats, active plugins, performance indicators, and a pre-computed issues list. Use this as the first step before any wizard or recommendation workflow.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const a: SiteAssessment = await client.assessSite();

      const lines: string[] = [];

      // Header
      lines.push(`Site Assessment — ${a.wordpress.site_name}`);
      lines.push(`URL: ${a.wordpress.admin_url.replace('/wp-admin/', '')}`);
      lines.push(`Assessed: ${a.assessed_at}`);
      lines.push('');

      // WordPress + Elementor
      lines.push('## Stack');
      lines.push(`  WordPress ${a.wordpress.version} · ${a.wordpress.language} · ${a.wordpress.timezone}`);
      lines.push(
        `  Elementor ${a.elementor.version ?? 'NOT ACTIVE'}${a.elementor.pro ? ` + Pro ${a.elementor.pro_version}` : ' (free)'}`,
      );
      lines.push(`  Active Kit ID: ${a.elementor.active_kit_id ?? 'none'}`);
      if (a.plugins.woocommerce) lines.push('  WooCommerce: active');
      if (a.plugins.multilingual) lines.push(`  Multilingual: ${(a.plugins.classified['multilingual'] ?? []).join(', ')}`);
      lines.push('');

      // Brand
      lines.push('## Brand');
      lines.push(`  Logo: ${a.brand.logo_set ? `set (ID: ${a.brand.logo_id})` : '⚠ NOT SET'}`);
      lines.push(`  Global colors: ${a.brand.global_colors_count || '⚠ none'}`);
      lines.push(`  Global typography: ${a.brand.global_typography_count || '⚠ none'}`);
      lines.push('');

      // Theme Builder
      lines.push('## Theme Builder');
      const tbOrder = ['header', 'footer', 'single', 'single-post', 'single-page', 'archive', 'search', 'error-404', 'popup'];
      for (const type of tbOrder) {
        const templates = a.theme_builder[type] ?? [];
        if (templates.length > 0) {
          lines.push(`  ${type}: ${templates.map((t) => `"${t.title}" [${t.id}] (${t.status})`).join(', ')}`);
        } else {
          lines.push(`  ${type}: — none`);
        }
      }
      lines.push('');

      // Template Library
      lines.push('## Template Library');
      lines.push(`  Total: ${a.template_library.total} (${a.template_library.published} published, ${a.template_library.draft} draft)`);
      lines.push(`  Uncategorized: ${a.template_library.uncategorized}`);
      const byType = Object.entries(a.template_library.by_type)
        .filter(([, n]) => n > 0)
        .map(([t, n]) => `${t}: ${n}`)
        .join(' · ');
      if (byType) lines.push(`  By type: ${byType}`);
      lines.push('');

      // Pages
      lines.push('## Elementor Pages');
      lines.push(`  Total: ${a.pages.elementor_total}`);
      const byPt = Object.entries(a.pages.by_post_type)
        .map(([pt, n]) => `${pt}: ${n}`)
        .join(' · ');
      if (byPt) lines.push(`  By type: ${byPt}`);
      lines.push('');

      // Performance
      lines.push('## Performance');
      lines.push(`  CSS method: ${a.performance.css_print_method}${a.performance.css_print_method === 'internal' ? ' ⚠' : ' ✓'}`);
      lines.push(`  Optimized DOM: ${a.performance.optimized_dom ? 'yes ✓' : 'no'}`);
      lines.push(`  FA4 shim: ${a.performance.load_fa4_shim ? 'yes ⚠' : 'no ✓'}`);
      lines.push('');

      // Plugins
      if (Object.keys(a.plugins.classified).length > 0) {
        lines.push('## Plugins (classified)');
        for (const [cat, slugs] of Object.entries(a.plugins.classified)) {
          lines.push(`  ${cat}: ${(slugs as string[]).join(', ')}`);
        }
        lines.push(`  Total active: ${a.plugins.active_count}`);
        lines.push('');
      }

      // Custom Post Types
      if (a.custom_post_types.length > 0) {
        lines.push('## Custom Post Types');
        for (const cpt of a.custom_post_types) {
          lines.push(`  ${cpt.name} (${cpt.label})${cpt.rest ? ' · REST' : ''}`);
        }
        lines.push('');
      }

      // Issues
      const { critical, warning, info } = a.issues_count;
      lines.push(
        `## Issues  [${critical} critical · ${warning} warnings · ${info} info]`,
      );
      if (a.issues.length === 0) {
        lines.push('  ✅ No issues detected.');
      } else {
        const order: AssessmentIssue['severity'][] = ['critical', 'warning', 'info'];
        for (const sev of order) {
          const sevIssues = a.issues.filter((i) => i.severity === sev);
          for (const issue of sevIssues) {
            const prefix = sev === 'critical' ? '🔴' : sev === 'warning' ? '⚠' : 'ℹ';
            lines.push(`  ${prefix} [${issue.code}] ${issue.message}`);
          }
        }
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    },
  );
}
