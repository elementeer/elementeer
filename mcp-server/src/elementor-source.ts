import type { ElementifyClient, ImportReport } from './client.js';

export interface ElementorSourcePayload {
  sourceType: ImportReport['sourceType'];
  sourceRef: string;
  title: string | null;
  elementorData: unknown;
}

export async function resolveElementorSource(params: {
  client: ElementifyClient;
  sourceType: ImportReport['sourceType'];
  sourceId?: number;
  elementorData?: string;
  title?: string;
}): Promise<
  | { ok: true; payload: ElementorSourcePayload }
  | { ok: false; error: string }
> {
  const { client, sourceType, sourceId, elementorData, title } = params;

  if (sourceType === 'raw') {
    if (!elementorData) {
      return {
        ok: false,
        error: 'Error: elementor_data is required when source_type is "raw".',
      };
    }

    try {
      return {
        ok: true,
        payload: {
          sourceType,
          sourceRef: `raw:${title ?? 'payload'}`,
          title: title ?? null,
          elementorData: JSON.parse(elementorData),
        },
      };
    } catch {
      return {
        ok: false,
        error: 'Error: elementor_data must be valid JSON.',
      };
    }
  }

  if (!sourceId) {
    return {
      ok: false,
      error: `Error: source_id is required when source_type is "${sourceType}".`,
    };
  }

  if (sourceType === 'template') {
    const [template, templateData] = await Promise.all([
      client.getTemplate(sourceId),
      client.getTemplateData(sourceId),
    ]);

    return {
      ok: true,
      payload: {
        sourceType,
        sourceRef: `template:${sourceId}`,
        title: template.title,
        elementorData: templateData.elementor_data,
      },
    };
  }

  const pageData = await client.getPageData({ id: sourceId });
  return {
    ok: true,
    payload: {
      sourceType,
      sourceRef: `page:${sourceId}`,
      title: pageData.post_title ?? title ?? null,
      elementorData: pageData.elementor_data,
    },
  };
}
