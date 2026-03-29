/**
 * Integration tests: full request/response cycle using MSW to mock HTTP.
 * Tests that each API method hits the correct endpoint, sends correct headers,
 * and maps error responses to the right ElementifyErrorCode.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ElementifyClient, ElementifyApiError } from '../../client.js';

const BASE = 'https://test.example.com/wp-json/elementify/v1';
const API_KEY = 'ek_integration_test_key';

const mswServer = setupServer();

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

function makeClient(): ElementifyClient {
  return new ElementifyClient('https://test.example.com', API_KEY);
}

function templateFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: 'Test Template',
    type: 'page',
    status: 'publish',
    author: 1,
    date: '2025-01-01T00:00:00',
    modified: '2025-06-01T00:00:00',
    categories: [],
    tags: [],
    shortcode: '[elementor-template id="1"]',
    ...overrides,
  };
}

describe('ElementifyClient integration — happy paths', () => {
  it('listTemplates hits GET /templates with correct headers', async () => {
    let receivedHeaders: Headers | undefined;

    mswServer.use(
      http.get(`${BASE}/templates`, ({ request }) => {
        receivedHeaders = request.headers;
        return HttpResponse.json({ templates: [], total: 0, total_pages: 1 });
      }),
    );

    const client = makeClient();
    await client.listTemplates();

    expect(receivedHeaders?.get('x-elementify-key')).toBe(API_KEY);
    expect(receivedHeaders?.get('authorization')).toBe(`Bearer ${API_KEY}`);
  });

  it('listTemplates passes query params to server', async () => {
    let receivedUrl: URL | undefined;

    mswServer.use(
      http.get(`${BASE}/templates`, ({ request }) => {
        receivedUrl = new URL(request.url);
        return HttpResponse.json({ templates: [], total: 0, total_pages: 1 });
      }),
    );

    const client = makeClient();
    await client.listTemplates({ type: 'section', page: 2, per_page: 50 });

    expect(receivedUrl?.searchParams.get('type')).toBe('section');
    expect(receivedUrl?.searchParams.get('page')).toBe('2');
    expect(receivedUrl?.searchParams.get('per_page')).toBe('50');
  });

  it('getTemplate hits GET /templates/:id', async () => {
    mswServer.use(
      http.get(`${BASE}/templates/42`, () => {
        return HttpResponse.json(templateFixture({ id: 42 }));
      }),
    );

    const client = makeClient();
    const tpl = await client.getTemplate(42);
    expect(tpl.id).toBe(42);
  });

  it('createTemplate hits POST /templates', async () => {
    let requestBody: unknown;
    mswServer.use(
      http.post(`${BASE}/templates`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(templateFixture({ title: 'New Page' }), { status: 201 });
      }),
    );

    const client = makeClient();
    await client.createTemplate({ title: 'New Page', type: 'page' });
    expect((requestBody as Record<string, unknown>).title).toBe('New Page');
  });

  it('updateTemplate hits PATCH /templates/:id', async () => {
    let requestBody: unknown;
    mswServer.use(
      http.patch(`${BASE}/templates/7`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(templateFixture({ id: 7, title: 'Updated' }));
      }),
    );

    const client = makeClient();
    await client.updateTemplate(7, { title: 'Updated' });
    expect((requestBody as Record<string, unknown>).title).toBe('Updated');
  });

  it('deleteTemplate hits DELETE /templates/:id', async () => {
    mswServer.use(
      http.delete(`${BASE}/templates/5`, () => {
        return HttpResponse.json({ deleted: true, id: 5 });
      }),
    );

    const client = makeClient();
    const result = await client.deleteTemplate(5);
    expect(result).toEqual({ deleted: true, id: 5 });
  });

  it('duplicateTemplate hits POST /templates/:id/duplicate', async () => {
    let requestBody: unknown;
    mswServer.use(
      http.post(`${BASE}/templates/3/duplicate`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(templateFixture({ id: 99, title: 'My Copy' }), { status: 201 });
      }),
    );

    const client = makeClient();
    await client.duplicateTemplate(3, 'My Copy');
    expect((requestBody as Record<string, unknown>).title).toBe('My Copy');
  });

  it('getTemplateData hits GET /templates/:id/data', async () => {
    mswServer.use(
      http.get(`${BASE}/templates/8/data`, () => {
        return HttpResponse.json({ id: 8, elementor_data: [{ id: 'abc', elType: 'section' }] });
      }),
    );

    const client = makeClient();
    const result = await client.getTemplateData(8);
    expect(result.elementor_data).toHaveLength(1);
  });

  it('updateTemplateData hits PUT /templates/:id/data', async () => {
    let requestBody: unknown;
    mswServer.use(
      http.put(`${BASE}/templates/8/data`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ id: 8, updated: true });
      }),
    );

    const client = makeClient();
    const data = [{ id: 'x', elType: 'container', elements: [] }];
    await client.updateTemplateData(8, data);

    const body = requestBody as Record<string, unknown>;
    expect(body.elementor_data).toEqual(data);
  });

  it('getSiteInfo hits GET /site', async () => {
    mswServer.use(
      http.get(`${BASE}/site`, () => {
        return HttpResponse.json({
          name: 'My Blog',
          url: 'https://test.example.com',
          wp_version: '6.5',
          elementor_version: '3.21',
          elementor_pro: false,
          activation_mode: 'standalone-free',
          template_count: 5,
          capabilities: ['templates:read'],
        });
      }),
    );

    const client = makeClient();
    const info = await client.getSiteInfo();
    expect(info.name).toBe('My Blog');
  });
});

describe('ElementifyClient integration — error mapping', () => {
  // The core Respira bug fix: scope errors must not surface as auth_invalid_key

  it('401 + elementify_insufficient_scope → auth_insufficient_scope (NOT auth_invalid_key)', async () => {
    mswServer.use(
      http.get(`${BASE}/templates`, () => {
        return HttpResponse.json(
          { code: 'elementify_insufficient_scope', message: 'Key lacks templates:read capability.', status: 401 },
          { status: 401 },
        );
      }),
    );

    const client = makeClient();
    const err = await client.listTemplates().catch((e) => e);

    expect(err).toBeInstanceOf(ElementifyApiError);
    expect(err.code).toBe('auth_insufficient_scope');
    expect(err.code).not.toBe('auth_invalid_key');
  });

  it('401 + elementify_invalid_key → auth_invalid_key', async () => {
    mswServer.use(
      http.get(`${BASE}/templates`, () => {
        return HttpResponse.json(
          { code: 'elementify_invalid_key', message: 'Invalid API key.' },
          { status: 401 },
        );
      }),
    );

    const client = makeClient();
    const err = await client.listTemplates().catch((e) => e);
    expect(err.code).toBe('auth_invalid_key');
  });

  it('403 + elementify_governance_blocked → governance_blocked', async () => {
    mswServer.use(
      http.get(`${BASE}/templates`, () => {
        return HttpResponse.json(
          { code: 'elementify_governance_blocked', message: 'Blocked by governance.' },
          { status: 403 },
        );
      }),
    );

    const client = makeClient();
    const err = await client.listTemplates().catch((e) => e);
    expect(err.code).toBe('governance_blocked');
  });

  it('404 → not_found', async () => {
    mswServer.use(
      http.get(`${BASE}/templates/9999`, () => {
        return HttpResponse.json(
          { code: 'not_found', message: 'Template not found.' },
          { status: 404 },
        );
      }),
    );

    const client = makeClient();
    const err = await client.getTemplate(9999).catch((e) => e);
    expect(err.code).toBe('not_found');
    expect(err.status).toBe(404);
  });

  it('generic 401 with no code body → auth_invalid_key', async () => {
    mswServer.use(
      http.get(`${BASE}/templates`, () => {
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }),
    );

    const client = makeClient();
    const err = await client.listTemplates().catch((e) => e);
    expect(err.code).toBe('auth_invalid_key');
  });

  it('403 + "scope" in message → auth_insufficient_scope', async () => {
    mswServer.use(
      http.get(`${BASE}/templates`, () => {
        return HttpResponse.json(
          { message: 'API key lacks the required scope.' },
          { status: 403 },
        );
      }),
    );

    const client = makeClient();
    const err = await client.listTemplates().catch((e) => e);
    expect(err.code).toBe('auth_insufficient_scope');
  });

  it('403 generic message → governance_blocked', async () => {
    mswServer.use(
      http.get(`${BASE}/templates`, () => {
        return HttpResponse.json({ message: 'Forbidden.' }, { status: 403 });
      }),
    );

    const client = makeClient();
    const err = await client.listTemplates().catch((e) => e);
    expect(err.code).toBe('governance_blocked');
  });

  it('error response includes message from server', async () => {
    mswServer.use(
      http.get(`${BASE}/templates`, () => {
        return HttpResponse.json(
          { code: 'elementify_invalid_key', message: 'Key revoked on 2025-03-01.' },
          { status: 401 },
        );
      }),
    );

    const client = makeClient();
    const err = await client.listTemplates().catch((e) => e);
    expect(err.message).toBe('Key revoked on 2025-03-01.');
  });
});
