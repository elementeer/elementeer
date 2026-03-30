import { z } from 'zod';
import axios from 'axios';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { getIntegrations } from '../config.js';

export interface StockImage {
  id: string;
  description: string;
  photographer: string;
  photographer_url: string;
  url_full: string;
  url_large: string;
  url_thumb: string;
  source: 'pexels' | 'unsplash';
  attribution: string;  // required text for licensing
}

async function searchPexels(
  query: string,
  perPage: number,
  orientation: string,
  apiKey: string,
): Promise<StockImage[]> {
  const res = await axios.get('https://api.pexels.com/v1/search', {
    headers: { Authorization: apiKey },
    params: { query, per_page: perPage, orientation },
    timeout: 10_000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data.photos as any[]).map((p) => ({
    id:               String(p.id),
    description:      p.alt ?? query,
    photographer:     p.photographer,
    photographer_url: p.photographer_url,
    url_full:         p.src.original,
    url_large:        p.src.large,
    url_thumb:        p.src.small,
    source:           'pexels' as const,
    attribution:      `Photo by ${p.photographer} on Pexels`,
  }));
}

async function searchUnsplash(
  query: string,
  perPage: number,
  orientation: string,
  accessKey: string,
): Promise<StockImage[]> {
  const res = await axios.get('https://api.unsplash.com/search/photos', {
    headers: { Authorization: `Client-ID ${accessKey}` },
    params: { query, per_page: perPage, orientation },
    timeout: 10_000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data.results as any[]).map((p) => ({
    id:               p.id,
    description:      p.description ?? p.alt_description ?? query,
    photographer:     p.user.name,
    photographer_url: p.user.links.html,
    url_full:         p.urls.full,
    url_large:        p.urls.regular,
    url_thumb:        p.urls.thumb,
    source:           'unsplash' as const,
    attribution:      `Photo by ${p.user.name} on Unsplash`,
  }));
}

// ------------------------------------------------------------------ //
// AI Image Generation helpers
// ------------------------------------------------------------------ //

async function generateWithOpenAI(
  prompt: string,
  apiKey: string,
  width: number,
  height: number,
): Promise<string> {
  // DALL-E 3 only supports 1024×1024, 1792×1024, 1024×1792
  let size = '1024x1024';
  if (width > height) size = '1792x1024';
  else if (height > width) size = '1024x1792';

  const res = await axios.post(
    'https://api.openai.com/v1/images/generations',
    { model: 'dall-e-3', prompt, n: 1, size, response_format: 'url' },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 90_000,
    },
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((res.data as any).data[0].url) as string;
}

function buildPollinationsUrl(prompt: string, width: number, height: number): string {
  const seed = Math.floor(Math.random() * 1_000_000);
  return (
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux`
  );
}

export function registerStockImageTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {

  // ---------------------------------------------------------------- //
  // search_stock_images
  // ---------------------------------------------------------------- //
  server.tool(
    'search_stock_images',
    'Search for free stock photos from Pexels or Unsplash. Returns image URLs, photographer attribution, and a download URL suitable for sideload_stock_image. Requires a Pexels or Unsplash API key in ~/.elementify/config.json under integrations.pexels_api_key or integrations.unsplash_access_key.',
    {
      query:       z.string().describe('Search query, e.g. "modern office interior", "blue abstract background"'),
      per_page:    z.number().int().min(1).max(20).optional().default(10),
      orientation: z.enum(['landscape', 'portrait', 'square']).optional().default('landscape'),
      source:      z.enum(['pexels', 'unsplash', 'any']).optional().default('any')
                    .describe('"any" tries Pexels first, falls back to Unsplash'),
      api_key:     z.string().optional()
                    .describe('Override API key (alternative to setting it in config.json)'),
    },
    async ({ query, per_page, orientation, source, api_key }) => {
      const integrations = getIntegrations();
      const pexelsKey   = api_key ?? integrations.pexels_api_key;
      const unsplashKey = api_key ?? integrations.unsplash_access_key;

      let images: StockImage[] = [];
      let error: string | null = null;

      const src = source ?? 'any';

      if ((src === 'pexels' || src === 'any') && pexelsKey) {
        try {
          images = await searchPexels(query, per_page ?? 10, orientation ?? 'landscape', pexelsKey);
        } catch (e) {
          error = `Pexels error: ${(e as Error).message}`;
        }
      }

      if (images.length === 0 && (src === 'unsplash' || src === 'any') && unsplashKey) {
        try {
          images = await searchUnsplash(query, per_page ?? 10, orientation ?? 'landscape', unsplashKey);
        } catch (e) {
          error = `Unsplash error: ${(e as Error).message}`;
        }
      }

      if (images.length === 0) {
        const hint = !pexelsKey && !unsplashKey
          ? '\n\nNo API key configured. Add integrations.pexels_api_key to ~/.elementify/config.json'
          : error ? `\n\nError: ${error}` : '\n\nNo results found for this query.';
        return {
          content: [{ type: 'text', text: `No stock images found for "${query}".${hint}` }],
        };
      }

      const lines = [
        `Stock Images — "${query}" (${images.length} results from ${images[0]!.source})`,
        '',
      ];

      images.forEach((img, i) => {
        lines.push(`${i + 1}. [${img.id}] ${img.description}`);
        lines.push(`   By: ${img.photographer} — ${img.attribution}`);
        lines.push(`   Large: ${img.url_large}`);
        lines.push(`   Thumb: ${img.url_thumb}`);
        lines.push('');
      });

      lines.push('Use sideload_stock_image with the Large URL to add to media library.');

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ---------------------------------------------------------------- //
  // generate_ai_image
  // ---------------------------------------------------------------- //
  server.tool(
    'generate_ai_image',
    "Generate an AI image using DALL-E 3 (requires openai_api_key in config) or Pollinations.ai (free, no key needed). Optionally sideloads the result into the WordPress media library. Use for hero images, blog banners, product mockups, or any custom visual that isn't available as stock photography.",
    {
      prompt:   z.string().describe('Image description. Be specific: subject, style, mood, colors, composition.'),
      style:    z.enum(['photorealistic', 'illustration', 'digital-art', 'sketch', 'watercolor'])
                  .optional()
                  .describe('Visual style appended to the prompt'),
      width:    z.number().int().min(256).max(2048).optional().default(1024),
      height:   z.number().int().min(256).max(2048).optional().default(1024),
      model:    z.enum(['openai', 'pollinations', 'auto']).optional().default('auto')
                  .describe('"auto" uses OpenAI if openai_api_key is configured, otherwise Pollinations (free)'),
      sideload: z.boolean().optional().default(true)
                  .describe('Save the generated image to the WordPress media library'),
      title:    z.string().optional().describe('Media library title for the generated image'),
      alt_text: z.string().optional().describe('Accessibility alt text'),
      api_key:  z.string().optional().describe('Override the OpenAI API key from config'),
      site_id:  z.string().optional(),
    },
    async ({ prompt, style, width, height, model, sideload, title, alt_text, api_key, site_id }) => {
      const integrations = getIntegrations();
      const openaiKey    = api_key ?? integrations.openai_api_key;

      const w = width  ?? 1024;
      const h = height ?? 1024;
      const m = model  ?? 'auto';

      const fullPrompt = style ? `${prompt}, ${style} style` : prompt;
      const useOpenAI  = m === 'openai' || (m === 'auto' && !!openaiKey);

      let imageUrl: string;
      let provider: string;

      if (useOpenAI && openaiKey) {
        try {
          imageUrl = await generateWithOpenAI(fullPrompt, openaiKey, w, h);
          provider = 'DALL-E 3 (OpenAI)';
        } catch (e) {
          return {
            content: [{
              type: 'text' as const,
              text: [
                `OpenAI image generation failed: ${(e as Error).message}`,
                '',
                'Tip: set model="pollinations" to use the free fallback (no API key needed).',
              ].join('\n'),
            }],
          };
        }
      } else {
        // Free fallback — no API key required
        imageUrl = buildPollinationsUrl(fullPrompt, w, h);
        provider = 'Pollinations.ai (free)';
      }

      const lines: string[] = [
        `🎨 AI Image Generated — ${provider}`,
        `   Prompt: ${prompt}${style ? ` [${style}]` : ''}`,
        `   Size: ${w}×${h}`,
        `   URL: ${imageUrl}`,
        '',
      ];

      if (sideload !== false) {
        try {
          const client     = getClient(site_id);
          const attachment = await client.sideloadImage({
            url:      imageUrl,
            title:    title    ?? `AI: ${prompt.slice(0, 60)}`,
            alt_text: alt_text ?? prompt.slice(0, 125),
          });
          lines.push(`✅ Saved to media library — ID: ${attachment.id}`);
          if (attachment.url) lines.push(`   WordPress URL: ${attachment.url}`);
          lines.push('');
          lines.push('Use this ID with set_site_logo or in Elementor image widgets.');
        } catch (e) {
          lines.push(`⚠️  Generated but sideload failed: ${(e as Error).message}`);
          lines.push('You can manually sideload with: sideload_stock_image({ url: "<above URL>" })');
        }
      } else {
        lines.push('sideload=false — use sideload_stock_image with the URL above to save to WordPress.');
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );

  // ---------------------------------------------------------------- //
  // sideload_stock_image
  // ---------------------------------------------------------------- //
  server.tool(
    'sideload_stock_image',
    'Download a stock image URL into the WordPress media library. Returns the new attachment ID which can be used with set_site_logo or in Elementor widgets. Always include attribution (photographer name + source) in the alt_text or caption to satisfy Pexels/Unsplash licensing.',
    {
      site_id:   z.string().optional(),
      url:       z.string().url().describe('Direct image URL from search_stock_images (use url_large)'),
      title:     z.string().optional().describe('Image title in media library'),
      alt_text:  z.string().optional().describe('Alt text — include attribution: "Modern office by John Doe on Pexels"'),
      caption:   z.string().optional().describe('Optional caption shown below image'),
    },
    async ({ site_id, url, title, alt_text, caption }) => {
      const client = getClient(site_id);
      const result = await client.sideloadImage({ url, title, alt_text, caption });

      const lines = [
        `✅ Image sideloaded — ID: ${result.id}`,
        `   Title: ${result.title}`,
        result.url ? `   URL: ${result.url}` : '',
        `   MIME: ${result.mime_type ?? '—'}`,
        '',
        'Use this ID with set_site_logo or reference it in Elementor widget settings.',
      ].filter(Boolean);

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );
}
