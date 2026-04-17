import axios from 'axios';
import { z } from 'zod';
import type {
  UntranslatedString,
  StringTranslationRequest,
  UntranslatedMediaItem,
  MediaTranslationRequest,
} from './client.js';

export interface TranslationAiProvider {
  translateStrings(
    strings: UntranslatedString[],
    targetLanguage: string,
    sourceLanguage?: string,
    context?: Record<string, unknown>,
  ): Promise<StringTranslationRequest[]>;

  translateMediaMetadata(
    items: UntranslatedMediaItem[],
    targetLanguage: string,
    sourceLanguage?: string,
    context?: Record<string, unknown>,
  ): Promise<MediaTranslationRequest[]>;
}

const translationResponseSchema = z.array(z.string());
const mediaTranslationResponseSchema = z.array(z.object({
  alt: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
}));

export function createOpenAiTranslationProvider(
  apiKey: string,
  model = 'gpt-4o-mini',
): TranslationAiProvider {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // Helper to split array into batches of size maxBatchSize
  function batch<T>(array: T[], maxBatchSize: number): T[][] {
    const batches = [];
    for (let i = 0; i < array.length; i += maxBatchSize) {
      batches.push(array.slice(i, i + maxBatchSize));
    }
    return batches;
  }

  // Rate limiting: delay between batches (ms)
  const BATCH_DELAY_MS = 1000;
  const MAX_BATCH_SIZE = 10; // Conservative batch size for translation

  async function withRateLimit<T>(batches: T[][], processBatch: (batch: T[]) => Promise<void>) {
    for (let i = 0; i < batches.length; i++) {
      await processBatch(batches[i]);
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }
  }

  async function callOpenAiJson<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    model: string,
  ): Promise<T> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a translation assistant. Respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      },
      { headers, timeout: 60_000 },
    );

    const raw = (response.data as { choices?: Array<{ message?: { content?: string } }> })
      .choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error('OpenAI response missing content');
    }
    try {
      const parsed = JSON.parse(raw);
      return schema.parse(parsed);
    } catch (error) {
      throw new Error(`Failed to parse OpenAI response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function buildStringTranslationPrompt(
    strings: UntranslatedString[],
    targetLanguage: string,
    sourceLanguage: string,
  ): string {
    const sourceLangName = languageName(sourceLanguage);
    const targetLangName = languageName(targetLanguage);
    const items = strings.map((s, _i) => ({
      id: s.id,
      text: s.text,
      context: s.context,
    }));
    return `Translate the following strings from ${sourceLangName} (${sourceLanguage}) to ${targetLangName} (${targetLanguage}).
Preserve any placeholders like {{variable}}, %s, {number}, etc. Maintain the same style and tone.
Provide a JSON array of translated strings in the same order as the input.
Each element should be the translated text only, without any additional commentary.

Input strings (with optional context):
${JSON.stringify(items, null, 2)}

Output format: ["translated string 1", "translated string 2", ...]`;
  }

  function buildMediaTranslationPrompt(
    items: UntranslatedMediaItem[],
    targetLanguage: string,
    sourceLanguage: string,
  ): string {
    const sourceLangName = languageName(sourceLanguage);
    const targetLangName = languageName(targetLanguage);
    const media = items.map(item => ({
      alt: item.alt,
      caption: item.caption,
      description: item.description,
      title: item.title,
    }));
    return `Translate the following media metadata from ${sourceLangName} (${sourceLanguage}) to ${targetLangName} (${targetLanguage}).
For each item, translate the alt text, caption, description, and title if present.
Preserve SEO keywords and natural phrasing.
Provide a JSON array of objects with keys "alt", "caption", "description", "title".
For missing fields, output null.

Input media items:
${JSON.stringify(media, null, 2)}

Output format: [{"alt": "translated alt", "caption": "translated caption", "description": "translated description", "title": "translated title"}, ...]`;
  }

  return {
    async translateStrings(strings, targetLanguage, sourceLanguage, _context) {
      if (strings.length === 0) {
        return [];
      }

      const srcLang = sourceLanguage ?? strings[0]?.source_language ?? 'en';
      const batches = batch(strings, MAX_BATCH_SIZE);
      const results: StringTranslationRequest[] = [];

      await withRateLimit(batches, async (batchStrings) => {
        const prompt = buildStringTranslationPrompt(batchStrings, targetLanguage, srcLang);
        const translations = await callOpenAiJson(prompt, translationResponseSchema, model);
        batchStrings.forEach((str, idx) => {
          results.push({
            id: str.id,
            text: str.text,
            translated_text: translations[idx] || str.text,
          });
        });
      });

      return results;
    },

    async translateMediaMetadata(items, targetLanguage, sourceLanguage, _context) {
      if (items.length === 0) {
        return [];
      }

      const srcLang = sourceLanguage ?? items[0]?.source_language ?? 'en';
      const batches = batch(items, MAX_BATCH_SIZE);
      const results: MediaTranslationRequest[] = [];

      await withRateLimit(batches, async (batchItems) => {
        const prompt = buildMediaTranslationPrompt(batchItems, targetLanguage, srcLang);
        const translations = await callOpenAiJson(prompt, mediaTranslationResponseSchema, model);
        batchItems.forEach((item, idx) => {
          const t = translations[idx];
          results.push({
            media_id: item.media_id,
            alt: t?.alt ?? item.alt,
            caption: t?.caption ?? item.caption,
            description: t?.description ?? item.description,
            title: t?.title ?? item.title,
          });
        });
      });

      return results;
    },
  };
}

function languageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    ar: 'Arabic',
    hi: 'Hindi',
  };
  return names[code] || code;
}