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

export interface GlobalColor {
  id?: string;
  title: string;
  color: string;  // hex, e.g. "#1A56DB"
}

export interface GlobalTypographyEntry {
  id?: string;
  title: string;
  font_family?: string;
  font_size?: number;      // px
  font_weight?: string;    // "400", "700", etc.
  line_height?: number;    // em multiplier, e.g. 1.6
  letter_spacing?: number; // px
  text_transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface GlobalStylesData {
  kit_id: number;
  system_colors:     Array<{ _id: string; title: string; color: string }>;
  custom_colors:     Array<{ _id: string; title: string; color: string }>;
  system_typography: unknown[];
  custom_typography: unknown[];
}

export type SiteContextRole = 'freelancer' | 'agency' | 'site-owner' | 'ai-agent';
export type SiteContextPurpose = 'ecommerce' | 'corporate' | 'portfolio' | 'blog' | 'community' | 'other';

export interface SiteContext {
  user_role: SiteContextRole | null;
  site_purpose: SiteContextPurpose | null;
  brand_notes: string | null;
  target_audience: string | null;
  primary_language: string | null;
  set_at: string | null;
}

export interface AssessmentIssue {
  severity: 'critical' | 'warning' | 'info';
  code: string;
  message: string;
  count?: number;
}

export interface SiteAssessment {
  assessed_at: string;
  wordpress: {
    version: string;
    language: string;
    timezone: string;
    is_multisite: boolean;
    site_name: string;
    site_tagline: string;
    admin_url: string;
  };
  elementor: {
    version: string | null;
    pro: boolean;
    pro_version: string | null;
    active_kit_id: number | null;
  };
  brand: {
    logo_set: boolean;
    logo_id: number | null;
    global_colors_count: number;
    global_typography_count: number;
  };
  theme_builder: Record<string, Array<{ id: number; title: string; status: string }>>;
  template_library: {
    total: number;
    by_type: Record<string, number>;
    uncategorized: number;
    published: number;
    draft: number;
  };
  pages: {
    elementor_total: number;
    by_post_type: Record<string, number>;
  };
  performance: {
    css_print_method: string;
    optimized_dom: boolean;
    load_fa4_shim: boolean;
  };
  plugins: {
    active_count: number;
    classified: Record<string, string[]>;
    woocommerce: boolean;
    multilingual: boolean;
  };
  custom_post_types: Array<{ name: string; label: string; rest: boolean }>;
  user_roles: string[];
  issues: AssessmentIssue[];
  issues_count: { critical: number; warning: number; info: number };
}

export interface QueuedChange {
  id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  operation: string;
  params: Record<string, unknown>;
  note: string | null;
  before_state: Record<string, unknown> | null;
  reviewed_at: string | null;
  review_note: string | null;
  applied_at: string | null;
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
      (err: AxiosError<unknown>) => {
        throw this.handleError(err);
      },
    );
  }

  /** @internal — public for unit testing only */
  handleError(err: AxiosError<unknown>): ElementifyApiError {
    if (!err.response) {
      return new ElementifyApiError(
        'not_found',
        `Network error: ${err.message}`,
        0,
      );
    }

    const { status } = err.response;
    const data = err.response.data as ElementifyError | undefined;
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

  async assessSite(): Promise<SiteAssessment> {
    const res = await this.http.get<SiteAssessment>('/site/assessment');
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // Logo
  // ------------------------------------------------------------------ //

  async getLogo(): Promise<{ logo_id: number | null; logo_url: string | null; set: boolean }> {
    const res = await this.http.get('/site/logo');
    return res.data;
  }

  async setLogo(mediaId: number): Promise<{ logo_id: number; logo_url: string | null; updated: true }> {
    const res = await this.http.put('/site/logo', { media_id: mediaId });
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // Global Styles
  // ------------------------------------------------------------------ //

  async getGlobalStyles(): Promise<GlobalStylesData> {
    const res = await this.http.get<GlobalStylesData>('/site/global-styles');
    return res.data;
  }

  async setGlobalColors(
    colors: GlobalColor[],
    slot: 'system' | 'custom' = 'system',
  ): Promise<{ kit_id: number; slot: string; colors: GlobalColor[]; updated: true }> {
    const res = await this.http.put('/site/global-styles/colors', { colors, slot });
    return res.data;
  }

  async setGlobalTypography(
    typography: GlobalTypographyEntry[],
    slot: 'system' | 'custom' = 'system',
  ): Promise<{ kit_id: number; slot: string; typography: unknown[]; updated: true }> {
    const res = await this.http.put('/site/global-styles/typography', { typography, slot });
    return res.data;
  }

  async getSiteContext(): Promise<SiteContext> {
    const res = await this.http.get<SiteContext>('/site/context');
    return res.data;
  }

  async setSiteContext(ctx: Partial<Omit<SiteContext, 'set_at'>>): Promise<SiteContext> {
    const res = await this.http.put<SiteContext>('/site/context', ctx);
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // Pages
  // ------------------------------------------------------------------ //

  async listElementorPages(params: { post_type?: string; per_page?: number; page?: number }) {
    const res = await this.http.get('/pages', { params });
    return res.data as {
      posts: Array<{
        id: number;
        title: string;
        slug: string;
        post_type: string;
        status: string;
        url: string;
        modified: string;
      }>;
      total: number;
      total_pages: number;
    };
  }

  async getPageData(params: { id: number; extract?: string; index?: number }) {
    const { id, ...query } = params;
    const res = await this.http.get(`/pages/${id}/data`, { params: query });
    return res.data;
  }

  async updatePageData(
    id: number,
    elementorData: unknown[],
  ): Promise<{ id: number; updated: true }> {
    const res = await this.http.put<{ id: number; updated: true }>(`/pages/${id}/data`, {
      elementor_data: elementorData,
    });
    return res.data;
  }

  async sideloadImage(params: {
    url: string;
    title?: string;
    alt_text?: string;
    caption?: string;
  }): Promise<{ id: number; url: string | null; mime_type: string | null; title: string }> {
    const res = await this.http.post('/media/sideload', params);
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // Change Review Queue
  // ------------------------------------------------------------------ //

  async listChanges(
    status?: string,
  ): Promise<{ changes: QueuedChange[]; total: number }> {
    const res = await this.http.get<{ changes: QueuedChange[]; total: number }>(
      '/changes/queue',
      status && status !== 'all' ? { params: { status } } : {},
    );
    return res.data;
  }

  async createChange(input: {
    operation: string;
    params: Record<string, unknown>;
    note?: string;
    before_state?: Record<string, unknown>;
  }): Promise<QueuedChange> {
    const res = await this.http.post<QueuedChange>('/changes/queue', input);
    return res.data;
  }

  async getChange(id: string): Promise<QueuedChange> {
    const res = await this.http.get<QueuedChange>(`/changes/${id}`);
    return res.data;
  }

  async updateChangeStatus(
    id: string,
    status: 'approved' | 'rejected' | 'applied',
    note?: string,
  ): Promise<QueuedChange> {
    const res = await this.http.put<QueuedChange>(`/changes/${id}/status`, { status, note });
    return res.data;
  }

  async deleteChange(id: string): Promise<{ deleted: true; id: string }> {
    const res = await this.http.delete<{ deleted: true; id: string }>(`/changes/${id}`);
    return res.data;
  }

  async createThemeBuilderTemplate(params: {
    title: string;
    type: string;
    elementor_data?: unknown[];
    conditions?: string;
    status?: string;
  }): Promise<{ id: number; title: string; type: string; status: string; conditions: string[] }> {
    const res = await this.http.post('/theme-builder/templates', params);
    return res.data;
  }
}
