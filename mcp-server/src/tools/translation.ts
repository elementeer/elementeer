import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { getIntegrations } from '../config.js';

export function registerTranslationFreeTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // analyze_translation_coverage
  // ------------------------------------------------------------------ //
  server.tool(
    'analyze_translation_coverage',
    'Analyze translation coverage across posts and pages. Scans multilingual plugin (WPML/Polylang) and generates a coverage matrix (page_id × language → translated | missing | outdated).',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      post_types: z.array(z.string()).optional().default(['post', 'page']).describe('Post types to include in analysis'),
      include_summary: z.boolean().default(true).describe('Include summary statistics in output'),
    },
    async ({ site_id, post_types, include_summary }) => {
      try {
        const client = getClient(site_id);
        const coverage = await client.getTranslationCoverage();

        const lines: string[] = [];

      // Header
      lines.push('# Translation Coverage Analysis');
      lines.push('');

      // Multilingual plugin status
      if (coverage.multilingual_plugin) {
        lines.push(`**Multilingual plugin**: ${coverage.multilingual_plugin}`);
      } else {
        lines.push('**Multilingual plugin**: None detected (single‑language site)');
      }

      // Configured languages
      lines.push(`**Configured languages**: ${coverage.configured_languages.join(', ') || '(none)'}`);
      lines.push('');

      // Summary
      if (include_summary) {
        const { total_posts, total_translated, total_missing, total_outdated, coverage_percent } = coverage.summary;
        lines.push('## Summary');
        lines.push(`- **Total posts analyzed**: ${total_posts}`);
        lines.push(`- **Translated posts**: ${total_translated}`);
        lines.push(`- **Missing translations**: ${total_missing}`);
        lines.push(`- **Outdated translations**: ${total_outdated}`);
        lines.push(`- **Coverage**: ${coverage_percent.toFixed(1)}%`);
        lines.push('');
      }

      // Coverage matrix (condensed)
      if (coverage.coverage_matrix.length > 0) {
        lines.push('## Coverage Matrix (first 20 items)');
        lines.push('| Post ID | Title | Language | Status | Translations |');
        lines.push('|---------|-------|----------|--------|--------------|');

        const matrix = coverage.coverage_matrix.slice(0, 20);
        for (const item of matrix) {
          const translationStatus = item.translations.map(t => 
            `${t.language}: ${t.status}${t.post_id ? ` (#${t.post_id})` : ''}`
          ).join(', ');
          
          lines.push(`| ${item.post_id} | ${item.post_title.substring(0, 30)}${item.post_title.length > 30 ? '…' : ''} | ${item.post_language} | ${item.translations.find(t => t.language === item.post_language)?.status || 'unknown'} | ${translationStatus} |`);
        }

        if (coverage.coverage_matrix.length > 20) {
          lines.push(`| … ${coverage.coverage_matrix.length - 20} more rows … |`);
        }
        lines.push('');
      }

      // Recommendations based on gaps
      if (coverage.summary.total_missing > 0 || coverage.summary.total_outdated > 0) {
        lines.push('## Recommendations');
        if (coverage.summary.total_missing > 0) {
          lines.push(`- **Missing translations**: ${coverage.summary.total_missing} posts lack translations. Use your multilingual plugin interface to translate them.`);
        }
        if (coverage.summary.total_outdated > 0) {
          lines.push(`- **Outdated translations**: ${coverage.summary.total_outdated} translations are outdated (source post modified after translation). Review and update them.`);
        }
        if (!coverage.multilingual_plugin) {
          lines.push('- **Install multilingual plugin**: Consider WPML (premium), Polylang (free), or TranslatePress for multilingual support.');
        }
        lines.push('');
      }

      lines.push(`*Analysis generated at ${new Date().toISOString().replace('T', ' ').substring(0, 19)}*`);

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error analyzing translation coverage: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}

export function registerTranslationAdvancedTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // batch_translate_strings (LANG-004)
  // ------------------------------------------------------------------ //
  server.tool(
    'batch_translate_strings',
    'AI-powered batch translation of WPML/Polylang string translations. Uses OpenAI (or other AI provider) to translate missing strings with context-awareness. L2 governance: auto-queues changes.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      target_language: z.string().describe('Target language code (e.g., "es", "fr")'),
      source_language: z.string().optional().describe('Source language code (defaults to site default)'),
      provider: z.enum(['openai', 'deepl', 'google']).optional().default('openai').describe('Translation provider'),
      preview: z.boolean().default(true).describe('Preview mode (true = return translations without applying)'),
      max_strings: z.number().optional().default(50).describe('Maximum number of strings to translate in this batch'),
    },
    async ({ site_id, target_language, source_language, provider, preview, max_strings }) => {
      try {
        const client = getClient(site_id);
        const integrations = getIntegrations();

        // For now, placeholder implementation
        const untranslated = await client.getUntranslatedStrings(target_language);
        
        const lines: string[] = [
          '# Batch String Translation (Preview)',
          `**Target language**: ${target_language}`,
          `**Provider**: ${provider}`,
          `**Preview mode**: ${preview ? 'Yes' : 'No'}`,
          `**Untranslated strings found**: ${untranslated.total}`,
        ];

        if (untranslated.strings.length === 0) {
          lines.push('\nNo untranslated strings found.');
        } else {
          lines.push('\n## Untranslated Strings');
          lines.push('| ID | Text | Context |');
          lines.push('|----|------|---------|');
          for (const str of untranslated.strings.slice(0, 10)) {
            lines.push(`| ${str.id} | ${str.text.substring(0, 50)}${str.text.length > 50 ? '…' : ''} | ${str.context || ''} |`);
          }
          if (untranslated.strings.length > 10) {
            lines.push(`| … ${untranslated.strings.length - 10} more … |`);
          }
        }

        lines.push('\n*AI translation not yet implemented. This is a placeholder.*');

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error getting untranslated strings: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // translate_media_metadata (LANG-005)
  // ------------------------------------------------------------------ //
  server.tool(
    'translate_media_metadata',
    'Translate media metadata (alt text, captions, descriptions, titles) for target language. SEO-aware translation with context. L2 governance: auto-queues changes.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      target_language: z.string().describe('Target language code (e.g., "es", "fr")'),
      source_language: z.string().optional().describe('Source language code (defaults to site default)'),
      provider: z.enum(['openai', 'deepl', 'google']).optional().default('openai').describe('Translation provider'),
      preview: z.boolean().default(true).describe('Preview mode (true = return translations without applying)'),
      max_items: z.number().optional().default(20).describe('Maximum number of media items to translate in this batch'),
    },
    async ({ site_id, target_language, source_language, provider, preview, max_items }) => {
      try {
        const client = getClient(site_id);
        const integrations = getIntegrations();

        // For now, placeholder implementation
        const untranslated = await client.getUntranslatedMedia(target_language);
        
        const lines: string[] = [
          '# Media Metadata Translation (Preview)',
          `**Target language**: ${target_language}`,
          `**Provider**: ${provider}`,
          `**Preview mode**: ${preview ? 'Yes' : 'No'}`,
          `**Untranslated media items found**: ${untranslated.total}`,
        ];

        if (untranslated.media.length === 0) {
          lines.push('\nNo untranslated media metadata found.');
        } else {
          lines.push('\n## Untranslated Media Items');
          lines.push('| ID | Title | Alt Text |');
          lines.push('|----|-------|----------|');
          for (const item of untranslated.media.slice(0, 10)) {
            lines.push(`| ${item.media_id} | ${item.title?.substring(0, 30) || '(no title)'}${item.title && item.title.length > 30 ? '…' : ''} | ${item.alt?.substring(0, 30) || ''}${item.alt && item.alt.length > 30 ? '…' : ''} |`);
          }
          if (untranslated.media.length > 10) {
            lines.push(`| … ${untranslated.media.length - 10} more … |`);
          }
        }

        lines.push('\n*AI translation not yet implemented. This is a placeholder.*');

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error getting untranslated media: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}

export function registerTranslationTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  registerTranslationFreeTools(server, getClient);
  registerTranslationAdvancedTools(server, getClient);
}