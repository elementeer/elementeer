import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ElementifyTemplate,
  ElementifyTemplateList,
  ElementifyError,
  ElementifyErrorCode,
} from '@elementify/shared';

export class ElementifyApiError extends Error {
  constructor(
    public readonly code: ElementifyErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ElementifyApiError';
  }
}

export interface CreateTemplateInput {
  title: string;
  type: ElementifyTemplate['type'];
  status?: ElementifyTemplate['status'];
  elementor_data?: string;
  categories?: string[];
  tags?: string[];
}

export interface UpdateTemplateInput {
  title?: string;
  status?: ElementifyTemplate['status'];
  categories?: string[];
  tags?: string[];
}

export interface ListTemplatesParams {
  page?: number;
  per_page?: number;
  type?: ElementifyTemplate['type'];
  status?: string;
  search?: string;
  category?: string;
}

export interface SiteInfo {
  name: string;
  url: string;
  wp_version: string;
  elementor_version: string | null;
  elementor_pro: boolean;
  activation_mode: string;
  template_count: number;
  capabilities: string[];
}

export class ElementifyClient {
  private http: AxiosInstance;

  constructor(siteUrl: string, apiKey: string) {
    const baseURL = siteUrl.replace(/\/$/, '') + '/wp-json/elementify/v1';

    this.http = axios.create({
      baseURL,
      headers: {
        'X-Elementify-Key': apiKey,
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30_000,
    });

    // Response interceptor — normalize errors
    this.http.interceptors.response.use(
      (res) => res,
      (err: AxiosError<ElementifyError>) => {
        throw this.handleError(err);
      },
    );
  }

  /** @internal — public for unit testing only */
  handleError(err: AxiosError<ElementifyError>): ElementifyApiError {
    if (!err.response) {
      return new ElementifyApiError(
        'not_found',
        `Network error: ${err.message}`,
        0,
      );
    }

    const { status, data } = err.response;
    const code = data?.code as string | undefined;

    // Critical distinction: scope errors must NOT surface as "invalid key"
    if (code === 'elementify_insufficient_scope' || code === 'auth_insufficient_scope') {
      return new ElementifyApiError(
        'auth_insufficient_scope',
        data?.message ?? 'API key lacks the required capability for this operation.',
        status,
      );
    }

    if (code === 'elementify_governance_blocked' || code === 'governance_blocked') {
      return new ElementifyApiError(
        'governance_blocked',
        data?.message ?? 'This operation is blocked by governance settings.',
        status,
      );
    }

    if (code === 'elementify_invalid_key' || code === 'auth_invalid_key') {
      return new ElementifyApiError(
        'auth_invalid_key',
        data?.message ?? 'Invalid or missing API key.',
        status,
      );
    }

    if (code === 'elementify_key_inactive' || code === 'auth_key_inactive') {
      return new ElementifyApiError(
        'auth_key_inactive',
        data?.message ?? 'API key is inactive.',
        status,
      );
    }

    if (status === 401) {
      return new ElementifyApiError(
        'auth_invalid_key',
        data?.message ?? 'Unauthorized.',
        status,
      );
    }

    if (status === 403) {
      // 403 with a "scope" message is insufficient_scope, not invalid_key
      const msg = data?.message ?? '';
      if (msg.toLowerCase().includes('scope') || msg.toLowerCase().includes('capabilit')) {
        return new ElementifyApiError('auth_insufficient_scope', msg, status);
      }
      return new ElementifyApiError('governance_blocked', msg || 'Forbidden.', status);
    }

    if (status === 404) {
      return new ElementifyApiError('not_found', data?.message ?? 'Not found.', status);
    }

    if (status === 429) {
      return new ElementifyApiError('rate_limited', data?.message ?? 'Rate limited.', status);
    }

    const knownCode = (data?.code as ElementifyErrorCode) ?? 'not_found';
    return new ElementifyApiError(
      knownCode,
      data?.message ?? `Request failed with status ${status}`,
      status,
    );
  }

  // ------------------------------------------------------------------ //
  // Template operations
  // ------------------------------------------------------------------ //

  async listTemplates(params: ListTemplatesParams = {}): Promise<ElementifyTemplateList> {
    const res = await this.http.get<ElementifyTemplateList>('/templates', { params });
    return res.data;
  }

  async getTemplate(id: number): Promise<ElementifyTemplate> {
    const res = await this.http.get<ElementifyTemplate>(`/templates/${id}`);
    return res.data;
  }

  async createTemplate(input: CreateTemplateInput): Promise<ElementifyTemplate> {
    const res = await this.http.post<ElementifyTemplate>('/templates', input);
    return res.data;
  }

  async updateTemplate(id: number, input: UpdateTemplateInput): Promise<ElementifyTemplate> {
    const res = await this.http.patch<ElementifyTemplate>(`/templates/${id}`, input);
    return res.data;
  }

  async deleteTemplate(id: number): Promise<{ deleted: true; id: number }> {
    const res = await this.http.delete<{ deleted: true; id: number }>(`/templates/${id}`);
    return res.data;
  }

  async duplicateTemplate(id: number, newTitle?: string): Promise<ElementifyTemplate> {
    const res = await this.http.post<ElementifyTemplate>(`/templates/${id}/duplicate`, {
      title: newTitle,
    });
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // Template data (Elementor JSON)
  // ------------------------------------------------------------------ //

  async getTemplateData(id: number): Promise<{ id: number; elementor_data: unknown[] }> {
    const res = await this.http.get<{ id: number; elementor_data: unknown[] }>(
      `/templates/${id}/data`,
    );
    return res.data;
  }

  async updateTemplateData(
    id: number,
    elementorData: unknown[],
  ): Promise<{ id: number; updated: true }> {
    const res = await this.http.put<{ id: number; updated: true }>(`/templates/${id}/data`, {
      elementor_data: elementorData,
    });
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // Site
  // ------------------------------------------------------------------ //

  async getSiteInfo(): Promise<SiteInfo> {
    const res = await this.http.get<SiteInfo>('/site');
    return res.data;
  }
}
