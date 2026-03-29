import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ElementifyClient, ElementifyApiError } from '../client.js';
import type { AxiosError } from 'axios';

vi.mock('axios');

const mockedAxios = vi.mocked(axios);

function makeAxiosError(status: number, data: Record<string, unknown>): AxiosError {
  const err = new Error('Request failed') as AxiosError;
  err.isAxiosError = true;
  err.response = {
    status,
    data,
    headers: {},
    config: {} as any,
    statusText: String(status),
  };
  return err;
}

function makeNetworkError(message: string): AxiosError {
  const err = new Error(message) as AxiosError;
  err.isAxiosError = true;
  err.response = undefined;
  return err;
}

describe('ElementifyClient', () => {
  let client: ElementifyClient;
  let mockHttp: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    interceptors: {
      response: { use: ReturnType<typeof vi.fn> };
    };
  };

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        response: { use: vi.fn() },
      },
    };

    let interceptorErrorHandler: ((err: unknown) => never) | undefined;

    mockHttp.interceptors.response.use.mockImplementation(
      (_onFulfilled: unknown, onRejected: (err: unknown) => never) => {
        interceptorErrorHandler = onRejected;
      },
    );

    mockedAxios.create = vi.fn().mockReturnValue(mockHttp);

    client = new ElementifyClient('https://example.com', 'ek_test_key');

    // Wire up the interceptor so errors pass through handleError
    const originalGet = mockHttp.get;
    mockHttp.get.mockImplementation(async (...args: unknown[]) => {
      try {
        return await originalGet(...args);
      } catch (err) {
        if (interceptorErrorHandler) throw interceptorErrorHandler(err);
        throw err;
      }
    });
  });

  describe('constructor', () => {
    it('constructs base URL by stripping trailing slash and appending /wp-json/elementify/v1', () => {
      new ElementifyClient('https://example.com/', 'ek_abc');
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://example.com/wp-json/elementify/v1',
        }),
      );
    });

    it('sets X-Elementify-Key header', () => {
      new ElementifyClient('https://example.com', 'ek_my_secret_key');
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Elementify-Key': 'ek_my_secret_key',
          }),
        }),
      );
    });

    it('sets Bearer Authorization fallback header', () => {
      new ElementifyClient('https://example.com', 'ek_my_secret_key');
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer ek_my_secret_key',
          }),
        }),
      );
    });

    it('sets 30s timeout', () => {
      new ElementifyClient('https://example.com', 'ek_key');
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 30_000 }),
      );
    });
  });

  describe('handleError — error code discrimination', () => {
    // Core Respira bug fix: scope errors must NOT surface as auth_invalid_key.
    // We call client.handleError() directly — cleanest unit test approach.
    // Interceptor wiring is covered separately in integration tests.

    it('maps elementify_insufficient_scope → auth_insufficient_scope (NOT auth_invalid_key)', () => {
      const err = client.handleError(makeAxiosError(401, {
        code: 'elementify_insufficient_scope',
        message: 'Key lacks templates:delete capability.',
      }));
      expect(err).toBeInstanceOf(ElementifyApiError);
      expect(err.code).toBe('auth_insufficient_scope');
      expect(err.status).toBe(401);
    });

    it('maps auth_insufficient_scope alias → auth_insufficient_scope', () => {
      const err = client.handleError(makeAxiosError(401, { code: 'auth_insufficient_scope', message: 'Insufficient scope.' }));
      expect(err.code).toBe('auth_insufficient_scope');
    });

    it('maps elementify_invalid_key → auth_invalid_key', () => {
      const err = client.handleError(makeAxiosError(401, { code: 'elementify_invalid_key', message: 'Invalid API key.' }));
      expect(err).toBeInstanceOf(ElementifyApiError);
      expect(err.code).toBe('auth_invalid_key');
    });

    it('maps auth_invalid_key alias → auth_invalid_key', () => {
      const err = client.handleError(makeAxiosError(401, { code: 'auth_invalid_key', message: 'Invalid API key.' }));
      expect(err.code).toBe('auth_invalid_key');
    });

    it('maps elementify_governance_blocked → governance_blocked', () => {
      const err = client.handleError(makeAxiosError(403, { code: 'elementify_governance_blocked', message: 'Blocked.' }));
      expect(err.code).toBe('governance_blocked');
    });

    it('maps governance_blocked alias → governance_blocked', () => {
      const err = client.handleError(makeAxiosError(403, { code: 'governance_blocked', message: 'Blocked.' }));
      expect(err.code).toBe('governance_blocked');
    });

    it('maps elementify_key_inactive → auth_key_inactive', () => {
      const err = client.handleError(makeAxiosError(401, { code: 'elementify_key_inactive', message: 'Key inactive.' }));
      expect(err.code).toBe('auth_key_inactive');
    });

    it('generic 401 with no recognized code → auth_invalid_key', () => {
      const err = client.handleError(makeAxiosError(401, { message: 'Unauthorized.' }));
      expect(err.code).toBe('auth_invalid_key');
      expect(err.status).toBe(401);
    });

    it('403 with "scope" in message → auth_insufficient_scope (not governance_blocked)', () => {
      const err = client.handleError(makeAxiosError(403, { message: 'API key lacks the required scope.' }));
      expect(err.code).toBe('auth_insufficient_scope');
    });

    it('403 with "capability" in message → auth_insufficient_scope', () => {
      const err = client.handleError(makeAxiosError(403, { message: 'This key does not have the required capability.' }));
      expect(err.code).toBe('auth_insufficient_scope');
    });

    it('403 with generic message → governance_blocked', () => {
      const err = client.handleError(makeAxiosError(403, { message: 'Forbidden.' }));
      expect(err.code).toBe('governance_blocked');
      expect(err.status).toBe(403);
    });

    it('404 → not_found', () => {
      const err = client.handleError(makeAxiosError(404, { message: 'Template not found.' }));
      expect(err.code).toBe('not_found');
      expect(err.status).toBe(404);
    });

    it('429 → rate_limited', () => {
      const err = client.handleError(makeAxiosError(429, { message: 'Too many requests.' }));
      expect(err.code).toBe('rate_limited');
    });

    it('network error (no response) → not_found with status 0', () => {
      const err = client.handleError(makeNetworkError('ECONNREFUSED'));
      expect(err).toBeInstanceOf(ElementifyApiError);
      expect(err.code).toBe('not_found');
      expect(err.status).toBe(0);
      expect(err.message).toContain('Network error');
    });

    it('preserves message from server response', () => {
      const err = client.handleError(makeAxiosError(401, {
        code: 'elementify_invalid_key',
        message: 'Your key expired on 2025-01-01.',
      }));
      expect(err.message).toBe('Your key expired on 2025-01-01.');
    });
  });

  describe('listTemplates', () => {
    it('calls GET /templates with correct params', async () => {
      mockHttp.get.mockResolvedValueOnce({
        data: { templates: [], total: 0, total_pages: 1 },
      });

      await client.listTemplates({ type: 'page', page: 2, per_page: 50 });

      expect(mockHttp.get).toHaveBeenCalledWith('/templates', {
        params: { type: 'page', page: 2, per_page: 50 },
      });
    });

    it('returns response data', async () => {
      const payload = {
        templates: [{ id: 1, title: 'Hero', type: 'section', status: 'publish' }],
        total: 1,
        total_pages: 1,
      };
      mockHttp.get.mockResolvedValueOnce({ data: payload });

      const result = await client.listTemplates();
      expect(result).toEqual(payload);
    });
  });

  describe('getTemplate', () => {
    it('calls GET /templates/:id', async () => {
      mockHttp.get.mockResolvedValueOnce({ data: { id: 42, title: 'My Template' } });
      await client.getTemplate(42);
      expect(mockHttp.get).toHaveBeenCalledWith('/templates/42');
    });
  });

  describe('deleteTemplate', () => {
    it('calls DELETE /templates/:id', async () => {
      mockHttp.delete.mockResolvedValueOnce({ data: { deleted: true, id: 5 } });
      const result = await client.deleteTemplate(5);
      expect(mockHttp.delete).toHaveBeenCalledWith('/templates/5');
      expect(result).toEqual({ deleted: true, id: 5 });
    });
  });

  describe('duplicateTemplate', () => {
    it('calls POST /templates/:id/duplicate with title', async () => {
      mockHttp.post.mockResolvedValueOnce({ data: { id: 99, title: 'Copy of Hero' } });
      await client.duplicateTemplate(1, 'Copy of Hero');
      expect(mockHttp.post).toHaveBeenCalledWith('/templates/1/duplicate', {
        title: 'Copy of Hero',
      });
    });

    it('passes undefined title when not specified', async () => {
      mockHttp.post.mockResolvedValueOnce({ data: { id: 99, title: 'Copy of Hero' } });
      await client.duplicateTemplate(1);
      expect(mockHttp.post).toHaveBeenCalledWith('/templates/1/duplicate', {
        title: undefined,
      });
    });
  });

  describe('getTemplateData', () => {
    it('calls GET /templates/:id/data', async () => {
      mockHttp.get.mockResolvedValueOnce({ data: { id: 7, elementor_data: [] } });
      await client.getTemplateData(7);
      expect(mockHttp.get).toHaveBeenCalledWith('/templates/7/data');
    });
  });

  describe('updateTemplateData', () => {
    it('calls PUT /templates/:id/data with elementor_data payload', async () => {
      mockHttp.put.mockResolvedValueOnce({ data: { id: 7, updated: true } });
      const data = [{ id: 'abc', elType: 'section', elements: [] }];
      await client.updateTemplateData(7, data);
      expect(mockHttp.put).toHaveBeenCalledWith('/templates/7/data', {
        elementor_data: data,
      });
    });
  });

  describe('getSiteInfo', () => {
    it('calls GET /site', async () => {
      mockHttp.get.mockResolvedValueOnce({
        data: {
          name: 'Test Site',
          url: 'https://example.com',
          wp_version: '6.5',
          elementor_version: '3.21',
          elementor_pro: false,
          activation_mode: 'standalone-free',
          template_count: 10,
          capabilities: ['templates:read'],
        },
      });
      const info = await client.getSiteInfo();
      expect(mockHttp.get).toHaveBeenCalledWith('/site');
      expect(info.name).toBe('Test Site');
    });
  });
});
