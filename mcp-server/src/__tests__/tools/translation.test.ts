import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTranslationFreeTools, registerTranslationAdvancedTools } from '../../tools/translation.js';
import type { ElementifyClient, TranslationCoverageAnalysis, UntranslatedStringsResponse, UntranslatedMediaResponse } from '../../client.js';

function makeTranslationCoverage(overrides: Partial<TranslationCoverageAnalysis> = {}): TranslationCoverageAnalysis {
  return {
    multilingual_plugin: 'WPML',
    configured_languages: ['en', 'de', 'fr'],
    coverage_matrix: [
      {
        post_id: 1,
        post_title: 'Hello World',
        post_type: 'post',
        post_language: 'en',
        translations: [
          { language: 'de', status: 'translated' as const, post_id: 2, post_title: 'Hallo Welt', last_modified: '2026-04-10' },
          { language: 'fr', status: 'missing' as const, post_id: undefined },
        ],
      },
      {
        post_id: 3,
        post_title: 'About Us',
        post_type: 'page',
        post_language: 'en',
        translations: [
          { language: 'de', status: 'outdated' as const, post_id: 4, post_title: 'Über uns', last_modified: '2026-04-05' },
          { language: 'fr', status: 'translated' as const, post_id: 5, post_title: 'À propos', last_modified: '2026-04-12' },
        ],
      },
    ],
    summary: {
      total_posts: 45,
      total_translated: 30,
      total_missing: 10,
      total_outdated: 5,
      coverage_percent: 66.7,
    },
    ...overrides,
  };
}

function makeUntranslatedStrings(overrides: Partial<UntranslatedStringsResponse> = {}): UntranslatedStringsResponse {
  return {
    total: 5,
    strings: [
      { id: 'string_1', text: 'Welcome to our site', context: 'header', source_language: 'en' },
      { id: 'string_2', text: 'Learn more', context: 'button', source_language: 'en' },
    ],
    ...overrides,
  };
}

function makeUntranslatedMedia(overrides: Partial<UntranslatedMediaResponse> = {}): UntranslatedMediaResponse {
  return {
    total: 3,
    media: [
      { media_id: 1, title: 'Office building', alt: 'Modern office building', source_language: 'en' },
      { media_id: 2, title: 'Team photo', alt: 'Our team', source_language: 'en' },
    ],
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    getTranslationCoverage: vi.fn().mockResolvedValue(makeTranslationCoverage()),
    getUntranslatedStrings: vi.fn().mockResolvedValue(makeUntranslatedStrings()),
    getUntranslatedMedia: vi.fn().mockResolvedValue(makeUntranslatedMedia()),
    // Add other client methods that may be called (minimal set)
    assessSite: vi.fn(),
    getSiteInfo: vi.fn(),
    getSiteContext: vi.fn(),
    listTemplates: vi.fn(),
    createChange: vi.fn().mockResolvedValue({ id: 'change_123' }),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('Translation tools (Free)', () => {
  let server: McpServer;
  let client: ElementifyClient;
  let getClient: (siteId?: string) => ElementifyClient;
  let toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    client = makeClient();
    getClient = vi.fn().mockReturnValue(client);

    toolHandlers = new Map();
    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      const name = args[0] as string;
      // The callback is always the last argument
      const handler = args[args.length - 1] as (args: Record<string, unknown>) => Promise<unknown>;
      toolHandlers.set(name, handler);
      return server as any;
    });

    registerTranslationFreeTools(server, getClient);
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(args) as Promise<any>;
  }

  describe('analyze_translation_coverage', () => {
    it('calls getTranslationCoverage and returns formatted output', async () => {
      const result = await callTool('analyze_translation_coverage', { site_id: 'test-site', include_summary: true });
      expect(client.getTranslationCoverage).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Translation Coverage Analysis');
      expect(result.content[0].text).toContain('**Multilingual plugin**: WPML');
      expect(result.content[0].text).toContain('**Configured languages**: en, de, fr');
      expect(result.content[0].text).toContain('## Summary');
      expect(result.content[0].text).toContain('Total posts analyzed**: 45');
      expect(result.content[0].text).toContain('Coverage**: 66.7%');
      expect(result.content[0].text).toContain('## Coverage Matrix');
    });

    it('handles missing multilingual plugin', async () => {
      vi.mocked(client.getTranslationCoverage).mockResolvedValueOnce(makeTranslationCoverage({ multilingual_plugin: null }));
      const result = await callTool('analyze_translation_coverage', { include_summary: true });
      expect(result.content[0].text).toContain('None detected (single‑language site)');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getTranslationCoverage).mockRejectedValueOnce(new Error('Coverage error'));
      const result = await callTool('analyze_translation_coverage', { include_summary: true });
      expect(result.content[0].text).toContain('❌ Error analyzing translation coverage');
    });
  });
});

describe('Translation tools (Advanced)', () => {
  let server: McpServer;
  let client: ElementifyClient;
  let getClient: (siteId?: string) => ElementifyClient;
  let toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    client = makeClient();
    getClient = vi.fn().mockReturnValue(client);

    toolHandlers = new Map();
    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      const name = args[0] as string;
      const handler = args[args.length - 1] as (args: Record<string, unknown>) => Promise<unknown>;
      toolHandlers.set(name, handler);
      return server as any;
    });

    registerTranslationAdvancedTools(server, getClient);
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(args) as Promise<any>;
  }

  describe('batch_translate_strings', () => {
    it('calls getUntranslatedStrings and returns placeholder output', async () => {
      const result = await callTool('batch_translate_strings', { target_language: 'de' });
      expect(client.getUntranslatedStrings).toHaveBeenCalledWith('de');
      expect(result.content[0].text).toContain('# Batch String Translation (Preview)');
      expect(result.content[0].text).toContain('**Target language**: de');
      expect(result.content[0].text).toContain('**Untranslated strings found**: 5');
      expect(result.content[0].text).toContain('## Untranslated Strings');
    });

    it('handles empty untranslated strings', async () => {
      vi.mocked(client.getUntranslatedStrings).mockResolvedValueOnce(makeUntranslatedStrings({ strings: [] }));
      const result = await callTool('batch_translate_strings', { target_language: 'fr' });
      expect(result.content[0].text).toContain('No untranslated strings found.');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getUntranslatedStrings).mockRejectedValueOnce(new Error('Strings error'));
      const result = await callTool('batch_translate_strings', { target_language: 'es' });
      expect(result.content[0].text).toContain('❌ Error getting untranslated strings');
    });
  });

  describe('translate_media_metadata', () => {
    it('calls getUntranslatedMedia and returns placeholder output', async () => {
      const result = await callTool('translate_media_metadata', { target_language: 'fr' });
      expect(client.getUntranslatedMedia).toHaveBeenCalledWith('fr');
      expect(result.content[0].text).toContain('# Media Metadata Translation (Preview)');
      expect(result.content[0].text).toContain('**Target language**: fr');
      expect(result.content[0].text).toContain('**Untranslated media items found**: 3');
      expect(result.content[0].text).toContain('## Untranslated Media Items');
    });

    it('handles empty untranslated media', async () => {
      vi.mocked(client.getUntranslatedMedia).mockResolvedValueOnce(makeUntranslatedMedia({ media: [] }));
      const result = await callTool('translate_media_metadata', { target_language: 'de' });
      expect(result.content[0].text).toContain('No untranslated media metadata found.');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getUntranslatedMedia).mockRejectedValueOnce(new Error('Media error'));
      const result = await callTool('translate_media_metadata', { target_language: 'es' });
      expect(result.content[0].text).toContain('❌ Error getting untranslated media');
    });
  });
});