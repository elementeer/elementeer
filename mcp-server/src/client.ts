import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ElementifyTemplate,
  ElementifyTemplateList,
  ElementifyError,
  ElementifyErrorCode,
  SiteInfo,
  GlobalColor,
  GlobalTypographyEntry,
  GlobalStylesData,
  SiteContext,
  SiteAssessment,
  SiteFingerprint,
  SiteFingerprintSignal,
  QueuedChange,
  AssessmentIssue,
  SiteContextRole,
  SiteContextPurpose,
  Recommendation,
  RecommendationCategory,
  ThemeBuilderTemplateSummary,
  DestinationProfile,
  DestinationProfileKind,
  Capability,
  CapabilityId,
  CapabilityMatrix,
  ControlIntent,
  BrandAdaptationPlan,
  DesignColorToken,
  DesignSpacingToken,
  DesignTokenReport,
  DesignTypographyToken,
  DesignValueHint,
  ImportReport,
  ImportSmokeTestPlan,
  LayoutRiskCode,
  LayoutRiskSeverity,
  LayoutRiskSignal,
  OutputCritique,
  PipelinePathPlan,
  ProjectChangeStyle,
  ProjectCopyDensity,
  ProjectEditingMode,
  ProjectLayoutPriority,
  ProjectProfile,
  ProjectQuestionPolicy,
  ProductSurfaceAssignment,
  RiskResolutionMode,
  TierBoundaryCase,
  RebuildStrategy,
  RecommendationEngineInput,
  RecommendationEngineReport,
  StrategyCritique,
  AddonProfileId,
  GuidanceMode,
  IntentWizardDepth,
  IntentWizardId,
  IntentWizardInput,
  IntentWizardIntent,
  IntentWizardOrigin,
  IntentWizardRoute,
  IntentWizardScenarioId,
  IntentWizardTierRecommendation,
  IntentWizardUserPosture,
  RecommendedAddonProfile,
  RecommendedSkillProfile,
  RecommendedStackProfile,
  SkillProfileId,
  StackProfileId,
  StackReadinessSignals,
} from '@elementify/shared';

export type {
  AssessmentIssue,
  Capability,
  CapabilityId,
  CapabilityMatrix,
  ControlIntent,
  BrandAdaptationPlan,
  DesignColorToken,
  DesignSpacingToken,
  DesignTokenReport,
  DesignTypographyToken,
  DesignValueHint,
  DestinationProfile,
  DestinationProfileKind,
  GlobalColor,
  GlobalStylesData,
  GlobalTypographyEntry,
  ImportReport,
  ImportSmokeTestPlan,
  LayoutRiskCode,
  LayoutRiskSeverity,
  LayoutRiskSignal,
  OutputCritique,
  PipelinePathPlan,
  ProjectChangeStyle,
  ProjectCopyDensity,
  ProjectEditingMode,
  ProjectLayoutPriority,
  ProjectProfile,
  ProjectQuestionPolicy,
  ProductSurfaceAssignment,
  QueuedChange,
  RiskResolutionMode,
  RebuildStrategy,
  Recommendation,
  RecommendationEngineInput,
  RecommendationEngineReport,
  RecommendationCategory,
  SiteAssessment,
  SiteContext,
  SiteContextPurpose,
  SiteContextRole,
  SiteFingerprint,
  SiteFingerprintSignal,
  SiteInfo,
  StrategyCritique,
  ThemeBuilderTemplateSummary,
  TierBoundaryCase,
  AddonProfileId,
  GuidanceMode,
  IntentWizardDepth,
  IntentWizardId,
  IntentWizardInput,
  IntentWizardIntent,
  IntentWizardOrigin,
  IntentWizardRoute,
  IntentWizardScenarioId,
  IntentWizardTierRecommendation,
  IntentWizardUserPosture,
  RecommendedAddonProfile,
  RecommendedSkillProfile,
  RecommendedStackProfile,
  SkillProfileId,
  StackProfileId,
  StackReadinessSignals,
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

export interface LibraryImportSource {
  kind: 'local-elementor' | 'elementify-premium';
  asset_id: string;
  asset_title?: string;
  reference?: string;
}

export interface ImportLibraryAssetInput {
  title: string;
  type: ElementifyTemplate['type'];
  status?: ElementifyTemplate['status'];
  elementor_data: unknown[];
  categories?: string[];
  tags?: string[];
  source: LibraryImportSource;
}

export interface ImportLibraryAssetResult {
  imported: true;
  import_mode: 'manual-import';
  source: LibraryImportSource;
  template: ElementifyTemplate;
}

export interface ImportExternalDataInput {
  format: 'csv' | 'json' | 'xml';
  data: string;
  post_type?: string;
  field_mapping?: Record<string, string>;
  duplicate_detection?: 'title' | 'slug' | 'sku' | 'none';
  dry_run?: boolean;
}

export interface ImportExternalDataResult {
  imported: boolean;
  imported_count: number;
  skipped_count: number;
  duplicate_count: number;
  errors: Array<{ row: number; error: string }>;
  summary: string;
}

export interface TranslationCoverageAnalysis {
  multilingual_plugin: string | null;
  configured_languages: string[];
  coverage_matrix: Array<{
    post_id: number;
    post_title: string;
    post_type: string;
    post_language: string;
    translations: Array<{
      language: string;
      status: 'translated' | 'missing' | 'outdated';
      post_id?: number;
      post_title?: string;
      last_modified?: string;
    }>;
  }>;
  summary: {
    total_posts: number;
    total_translated: number;
    total_missing: number;
    total_outdated: number;
    coverage_percent: number;
  };
}

export interface UntranslatedString {
  id: string;
  text: string;
  context?: string;
  source_language: string;
}

export interface UntranslatedStringsResponse {
  strings: UntranslatedString[];
  total: number;
}

export interface StringTranslationRequest {
  id: string;
  text: string;
  translated_text: string;
}

export interface TranslateStringsResponse {
  applied: number;
  preview: boolean;
  strings: StringTranslationRequest[];
}

export interface UntranslatedMediaItem {
  media_id: number;
  alt?: string;
  caption?: string;
  description?: string;
  title?: string;
  source_language: string;
}

export interface UntranslatedMediaResponse {
  media: UntranslatedMediaItem[];
  total: number;
}

export interface MediaTranslationRequest {
  media_id: number;
  alt?: string;
  caption?: string;
  description?: string;
  title?: string;
}

export interface AllyStatus {
  ally_available: boolean;
  plugin: string | null;
  version: string | null;
  tier: 'free' | 'pro' | 'one' | null;
  credits_remaining: number | null;
  capabilities: {
    scan: boolean;
    report: boolean;
    basic_fixes: boolean;
    ai_fixes: boolean;
    batch_scan: boolean;
    scheduled_scans: boolean;
    custom_rules: boolean;
  };
}

export interface AllyScanResults {
  scans: any[];
  last_scan: string | null;
  available_credits: number;
  ally_status: AllyStatus;
  message: string;
}

export interface AllyTriggerScanResponse {
  triggered: boolean;
  scan_id: string | null;
  message: string;
  credits_required: number;
  credits_remaining: number;
  ally_status: AllyStatus;
}

export interface AllyApplyFixResponse {
  fixed: boolean;
  message: string;
  scan_id: string;
  issue_id: string;
  fix_type: string;
  ally_status: AllyStatus;
}

export interface TranslateMediaResponse {
  applied: number;
  preview: boolean;
  items: MediaTranslationRequest[];
}

export interface LmsStatus {
  lms_available: boolean;
  plugin: string | null;
  version: string | null;
  course_count: number;
}

export interface LmsCourseList {
  courses: Array<{
    id: number;
    title: string;
    slug: string;
    status: string;
    url: string;
    description?: string;
    price?: string;
    students_count?: number;
  }>;
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface LmsCourseStructure {
  course_id: number;
  title: string;
  sections: Array<{
    id: number;
    title: string;
    order: number;
    lessons: Array<{
      id: number;
      title: string;
      order: number;
      content_type?: string;
      duration?: string;
      completed?: boolean;
    }>;
    quizzes?: Array<{
      id: number;
      title: string;
      order: number;
      question_count?: number;
    }>;
  }>;
}

export interface CharityStatus {
  charity_available: boolean;
  plugin: string | null;
  version: string | null;
  form_count: number;
}

export interface CharityFormList {
  forms: Array<{
    id: number;
    title: string;
    slug: string;
    status: string;
    url: string;
    goal?: string;
    raised?: string;
    donor_count?: number;
  }>;
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CharityDonationStats {
  total_raised: number;
  donor_count: number;
  average_donation: number;
  total_donations: number;
}

export interface ListTemplatesParams {
  page?: number;
  per_page?: number;
  type?: ElementifyTemplate['type'];
  status?: string;
  search?: string;
  category?: string;
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

  async importLibraryAsset(input: ImportLibraryAssetInput): Promise<ImportLibraryAssetResult> {
    const res = await this.http.post<ImportLibraryAssetResult>('/library/import', input);
    return res.data;
  }

  async importExternalData(input: ImportExternalDataInput): Promise<ImportExternalDataResult> {
    const res = await this.http.post<ImportExternalDataResult>('/import/external', input);
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
  // Site Settings
  // ------------------------------------------------------------------ //

  async getSiteSettings(): Promise<{
    blogname: string;
    description: string;
    homepage: { id: number; title: string; url: string } | null;
    posts_page: { id: number; title: string; url: string } | null;
    permalink: string;
    timezone: string;
    date_format: string;
    time_format: string;
    start_of_week: number;
  }> {
    const res = await this.http.get('/site/settings');
    return res.data;
  }

  async updateSiteSettings(updates: {
    blogname?: string;
    description?: string;
    homepage?: number;
    posts_page?: number;
    permalink?: string;
  }): Promise<{ updated: string[]; settings: any }> {
    const res = await this.http.put('/site/settings', updates);
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // SEO Management
  // ------------------------------------------------------------------ //

  async getSeoMeta(params: { post_id: number }): Promise<{
    post_id: number;
    plugin: string;
    title: string;
    description: string;
    focus_keyword: string;
  }> {
    const res = await this.http.get('/site/seo/meta', { params });
    return res.data;
  }

  async updateSeoMeta(params: {
    post_id: number;
    title?: string;
    description?: string;
    focus_keyword?: string;
  }): Promise<{ post_id: number; plugin: string; updated: string[] }> {
    const res = await this.http.put('/site/seo/meta', params);
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // Performance & Cache
  // ------------------------------------------------------------------ //

  async flushElementorCache(): Promise<{ flushed: boolean; message: string }> {
    const res = await this.http.post('/site/performance/flush-cache');
    return res.data;
  }

  async getPerformanceReport(): Promise<{
    css_method: string;
    dom_size: { average_nodes: number; note: string };
    asset_optimization: Record<string, boolean | string>;
    cache_status: Record<string, string | null>;
    elementor_status: string | null;
    elementor_pro: boolean;
    php_info: {
      version: string;
      memory_limit: string;
      max_execution_time: string;
      upload_max_filesize: string;
      post_max_size: string;
      opcache_enabled: boolean;
      eol: boolean;
    };
    object_cache: {
      enabled: boolean;
      type: string;
      redis: boolean;
      memcached: boolean;
      apc: boolean;
    };
    autoloaded_options: {
      count: number;
      size_bytes: number;
      size_human: string;
      note: string;
    };
    database_stats: {
      total_size_bytes: number;
      total_size_human: string;
      data_size_bytes: number;
      index_size_bytes: number;
      table_count: number;
      has_query_cache: boolean;
      engine: string;
    };
    enqueued_assets: {
      scripts: number;
      styles: number;
      external_scripts: number;
      external_styles: number;
      total: number;
    };
    render_blocking_resources: {
      count: number;
      resources: Array<{ type: string; handle: string; src: string }>;
      note: string;
    };
  }> {
    const res = await this.http.get('/site/performance/report');
    return res.data;
  }

  async optimizeElementorAssets(): Promise<{
    optimized: boolean;
    message: string;
    suggestions: string[];
  }> {
    const res = await this.http.post('/site/performance/optimize-assets');
    return res.data;
  }

  async cleanDatabase(preview = true): Promise<{
    cleaned: boolean;
    preview: boolean;
    stats: {
      revisions: number;
      transients: number;
      spam_comments: number;
      total: number;
    };
    message: string;
  }> {
    const res = await this.http.post('/site/performance/clean-database', { preview });
    return res.data;
  }

  async getCacheRecommendation(): Promise<{
    hosting: string;
    server: string;
    recommended_plugin: string | null;
    should_install: boolean;
    reason: string;
    detected_server_software: string;
  }> {
    const res = await this.http.get('/site/performance/cache-recommendation');
    return res.data;
  }

  async diagnoseIssue(symptom: 'slow_page' | 'white_screen' | '500_error' | 'plugin_conflict'): Promise<{
    symptom: string;
    title: string;
    steps: Array<{
      step: number;
      action: string;
      command: string;
      expected: string;
      risk?: string;
    }>;
    note: string;
  }> {
    const res = await this.http.post('/site/performance/diagnose-issue', { symptom });
    return res.data;
  }

  async readErrorLog(lines = 50): Promise<{
    exists: boolean;
    message?: string;
    total_lines: number;
    recent_lines: number;
    entries: string[];
  }> {
    const res = await this.http.get('/site/performance/error-log', { params: { lines } });
    return res.data;
  }

  async testPluginConflict(pluginSlug: string, action: 'deactivate' | 'reactivate'): Promise<{
    action: string;
    plugin: string;
    simulated: boolean;
    message: string;
    note: string;
  }> {
    const res = await this.http.post('/site/performance/test-plugin-conflict', {
      plugin_slug: pluginSlug,
      action,
    });
    return res.data;
  }

  async getWizard(wizardId: string): Promise<{
    status: 'active' | 'inactive' | 'missing' | 'needs_configuration';
    gaps: Array<{
      id: string;
      severity: 'critical' | 'warning' | 'info';
      description: string;
      data?: Record<string, unknown>;
    }>;
    recommendations: Array<{
      id: string;
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      action: string;
      gap_id?: string;
    }>;
    suggested_tools: Array<{
      tool: string;
      purpose: string;
      governance_level?: 'L0' | 'L1' | 'L2' | 'L3';
    }>;
    suggested_plugins: Array<{
      slug: string;
      name: string;
      reason: string;
      required_capability?: string;
    }>;
  }> {
    const res = await this.http.get(`/site/wizards/${wizardId}`);
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // Translation Coverage Analysis
  // ------------------------------------------------------------------ //

  async getTranslationCoverage(): Promise<TranslationCoverageAnalysis> {
    const res = await this.http.get('/translation/coverage');
    return res.data;
  }

  async getUntranslatedStrings(targetLanguage: string): Promise<UntranslatedStringsResponse> {
    const res = await this.http.get('/translation/strings/untranslated', {
      params: { target_language: targetLanguage },
    });
    return res.data;
  }

  async translateStrings(
    targetLanguage: string,
    strings: StringTranslationRequest[],
    preview = true,
  ): Promise<TranslateStringsResponse> {
    const res = await this.http.post('/translation/strings/translate', {
      target_language: targetLanguage,
      strings,
      preview,
    });
    return res.data;
  }

  async getUntranslatedMedia(targetLanguage: string): Promise<UntranslatedMediaResponse> {
    const res = await this.http.get('/translation/media/untranslated', {
      params: { target_language: targetLanguage },
    });
    return res.data;
  }

  async translateMediaMetadata(
    targetLanguage: string,
    items: MediaTranslationRequest[],
    preview = true,
  ): Promise<TranslateMediaResponse> {
    const res = await this.http.post('/translation/media/translate', {
      target_language: targetLanguage,
      items,
      preview,
    });
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // Ally Integration
  // ------------------------------------------------------------------ //

  async getAllyStatus(): Promise<AllyStatus> {
    const res = await this.http.get('/ally/status');
    return res.data;
  }

  async getAllyScanResults(): Promise<AllyScanResults> {
    const res = await this.http.get('/ally/scan/results');
    return res.data;
  }

  async triggerAllyScan(): Promise<AllyTriggerScanResponse> {
    const res = await this.http.post('/ally/scan/trigger');
    return res.data;
  }

  async applyAllyFix(params: { scan_id: string; issue_id: string; fix_type?: 'basic' | 'ai' }): Promise<AllyApplyFixResponse> {
    const res = await this.http.post('/ally/fix/apply', params);
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // LMS Integration
  // ------------------------------------------------------------------ //

  async getLmsStatus(): Promise<LmsStatus> {
    const res = await this.http.get('/lms/status');
    return res.data;
  }

  async listLmsCourses(params: { page?: number; per_page?: number } = {}): Promise<LmsCourseList> {
    const res = await this.http.get('/lms/courses', { params });
    return res.data;
  }

  async getLmsCourseStructure(courseId: number): Promise<LmsCourseStructure> {
    const res = await this.http.get(`/lms/courses/${courseId}/structure`);
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // Charity Integration
  // ------------------------------------------------------------------ //

  async getCharityStatus(): Promise<CharityStatus> {
    const res = await this.http.get('/charity/status');
    return res.data;
  }

  async listCharityForms(params: { page?: number; per_page?: number } = {}): Promise<CharityFormList> {
    const res = await this.http.get('/charity/forms', { params });
    return res.data;
  }

  async getCharityStats(): Promise<CharityDonationStats> {
    const res = await this.http.get('/charity/stats');
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // Booking & Events Integration
  // ------------------------------------------------------------------ //

  async getBookingStatus(): Promise<any> {
    const res = await this.http.get('/booking/status');
    return res.data;
  }

  async listBookings(params: { page?: number; per_page?: number } = {}): Promise<any> {
    const res = await this.http.get('/booking/list', { params });
    return res.data;
  }

  async getBookingStats(): Promise<any> {
    const res = await this.http.get('/booking/stats');
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // WooCommerce Integration
  // ------------------------------------------------------------------ //

  async listWooCommerceProducts(params: { page?: number; per_page?: number; status?: string; category?: string; stock_status?: string; search?: string } = {}): Promise<any> {
    throw new Error('Not implemented');
  }

  async getWooCommerceProduct(productId: number): Promise<any> {
    throw new Error('Not implemented');
  }

  async createWooCommerceProduct(data: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async updateWooCommerceProduct(productId: number, data: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async deleteWooCommerceProduct(productId: number, force?: boolean): Promise<any> {
    throw new Error('Not implemented');
  }

  async listWooCommerceOrders(params: { page?: number; per_page?: number; status?: string; customer?: number; product?: number; date_after?: string; date_before?: string } = {}): Promise<any> {
    throw new Error('Not implemented');
  }

  async getWooCommerceOrder(orderId: number): Promise<any> {
    throw new Error('Not implemented');
  }

  async updateWooCommerceOrderStatus(orderId: number, status: string, note?: string): Promise<any> {
    throw new Error('Not implemented');
  }

  async listWooCommerceProductCategories(params: { page?: number; per_page?: number; parent?: number } = {}): Promise<any> {
    throw new Error('Not implemented');
  }

  async createWooCommerceProductCategory(data: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async updateWooCommerceProductCategory(categoryId: number, data: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async deleteWooCommerceProductCategory(categoryId: number): Promise<any> {
    throw new Error('Not implemented');
  }

  async getWooCommerceStoreSettings(): Promise<any> {
    throw new Error('Not implemented');
  }

  async updateWooCommerceStoreSettings(data: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async setupWooCommercePages(params: { create_missing?: boolean; assign_template?: boolean } = {}): Promise<any> {
    throw new Error('Not implemented');
  }

  // ------------------------------------------------------------------ //
  // Form Plugin Integration
  // ------------------------------------------------------------------ //

  async listForms(params: { plugin?: string; page?: number; per_page?: number } = {}): Promise<any> {
    throw new Error('Not implemented');
  }

  async getForm(formId: number, plugin?: string): Promise<any> {
    throw new Error('Not implemented');
  }

  async createForm(data: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async updateForm(formId: number, data: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async deleteForm(formId: number, plugin?: string): Promise<any> {
    throw new Error('Not implemented');
  }

  async listFormEntries(formId: number, params: { page?: number; per_page?: number; plugin?: string } = {}): Promise<any> {
    throw new Error('Not implemented');
  }

  async getFormEntry(entryId: number, plugin?: string): Promise<any> {
    throw new Error('Not implemented');
  }

  async exportFormEntries(formId: number, format: string = 'csv', plugin?: string): Promise<any> {
    throw new Error('Not implemented');
  }

  // ------------------------------------------------------------------ //
  // Performance Deep-Dive Integration
  // ------------------------------------------------------------------ //

  async generateCriticalCss(pageId?: number): Promise<any> {
    throw new Error('Not implemented');
  }

  async auditAssetLoading(pageId?: number): Promise<any> {
    throw new Error('Not implemented');
  }

  async enableRedisCache(): Promise<any> {
    throw new Error('Not implemented');
  }

  async purgeCdnCache(): Promise<any> {
    throw new Error('Not implemented');
  }

  async optimizeHtaccess(): Promise<any> {
    throw new Error('Not implemented');
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

  // ------------------------------------------------------------------ //
  // Menus
  // ------------------------------------------------------------------ //

  async listMenus(): Promise<{
    menus: Array<{
      id: number;
      name: string;
      slug: string;
      count: number;
      description: string;
    }>;
    total: number;
  }> {
    const res = await this.http.get('/menus');
    return res.data;
  }

  async createMenu(params: { name: string }): Promise<{
    menu: {
      id: number;
      name: string;
      slug: string;
      count: number;
      description: string;
    };
    message: string;
  }> {
    const res = await this.http.post('/menus', params);
    return res.data;
  }

  async deleteMenu(id: number): Promise<{ message: string }> {
    const res = await this.http.delete(`/menus/${id}`);
    return res.data;
  }

  async listMenuItems(params: { menu_id: number }): Promise<{
    items: Array<{
      id: number;
      label: string;
      url: string;
      parent: number;
      position: number;
      type: string;
      target: string;
      classes: string[];
      xfn: string;
    }>;
    total: number;
  }> {
    const res = await this.http.get(`/menus/${params.menu_id}/items`);
    return res.data;
  }

  async createMenuItem(params: {
    menu_id: number;
    label: string;
    url: string;
    parent?: number;
    position?: number;
  }): Promise<{
    item: {
      id: number;
      label: string;
      url: string;
      parent: number;
      position: number;
      type: string;
      target: string;
      classes: string[];
      xfn: string;
    };
    message: string;
  }> {
    const res = await this.http.post(`/menus/${params.menu_id}/items`, params);
    return res.data;
  }

  async updateMenuItem(params: {
    id: number;
    menu_id: number;
    label?: string;
    url?: string;
    parent?: number;
    position?: number;
  }): Promise<{
    item: {
      id: number;
      label: string;
      url: string;
      parent: number;
      position: number;
      type: string;
      target: string;
      classes: string[];
      xfn: string;
    };
    message: string;
  }> {
    const res = await this.http.put(`/menu-items/${params.id}`, params);
    return res.data;
  }

  async deleteMenuItem(id: number): Promise<{ message: string }> {
    const res = await this.http.delete(`/menu-items/${id}`);
    return res.data;
  }

  async listMenuLocations(): Promise<{
    locations: Array<{
      location: string;
      description: string;
      menu_id: number | null;
    }>;
    total: number;
  }> {
    const res = await this.http.get('/menu-locations');
    return res.data;
  }

  async assignMenuLocation(params: { menu_id: number; location: string }): Promise<{
    message: string;
    location: string;
    menu_id: number;
  }> {
    const res = await this.http.post('/menu-locations', params);
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // Content Management
  // ------------------------------------------------------------------ //

  async createPage(params: {
    title: string;
    content?: string;
    status?: string;
    parent?: number;
    elementor_ready?: boolean;
  }): Promise<{
    page: {
      id: number;
      title: string;
      slug: string;
      content: string;
      excerpt: string;
      status: string;
      type: string;
      author: number;
      parent: number;
      date: string;
      modified: string;
      featured_image_id: number;
      permalink: string;
      elementor_edit_mode: boolean;
    };
    message: string;
  }> {
    const res = await this.http.post('/pages', params);
    return res.data;
  }

  async createPost(params: {
    title: string;
    content?: string;
    status?: string;
    categories?: number[];
    tags?: string[];
  }): Promise<{
    post: {
      id: number;
      title: string;
      slug: string;
      content: string;
      excerpt: string;
      status: string;
      type: string;
      author: number;
      parent: number;
      date: string;
      modified: string;
      featured_image_id: number;
      permalink: string;
      elementor_edit_mode: boolean;
    };
    message: string;
  }> {
    const res = await this.http.post('/posts', params);
    return res.data;
  }

  async updatePostMeta(params: {
    id: number;
    slug?: string;
    excerpt?: string;
    featured_image_id?: number;
  }): Promise<{
    post_id: number;
    updated: Record<string, unknown>;
    message: string;
  }> {
    const res = await this.http.put(`/posts/${params.id}/meta`, params);
    return res.data;
  }

  async deletePost(params: {
    id: number;
    force?: boolean;
  }): Promise<{
    post_id: number;
    deleted: boolean;
    message: string;
  }> {
    const res = await this.http.delete(`/posts/${params.id}`, { params: { force: params.force } });
    return res.data;
  }

  async listTaxonomies(): Promise<{
    taxonomies: Array<{
      name: string;
      label: string;
      labels: Record<string, string>;
      hierarchical: boolean;
      public: boolean;
      object_type: string[];
    }>;
    total: number;
  }> {
    const res = await this.http.get('/taxonomies');
    return res.data;
  }

  async createTerm(params: {
    taxonomy: string;
    name: string;
    slug?: string;
    parent?: number;
    description?: string;
  }): Promise<{
    term: {
      id: number;
      name: string;
      slug: string;
      description: string;
      parent: number;
      count: number;
      taxonomy: string;
    };
    message: string;
  }> {
    const res = await this.http.post(`/terms/${params.taxonomy}`, params);
    return res.data;
  }

  async updateTerm(params: {
    taxonomy: string;
    id: number;
    name?: string;
    slug?: string;
    parent?: number;
    description?: string;
  }): Promise<{
    term: {
      id: number;
      name: string;
      slug: string;
      description: string;
      parent: number;
      count: number;
      taxonomy: string;
    };
    message: string;
  }> {
    const res = await this.http.put(`/terms/${params.taxonomy}`, params);
    return res.data;
  }

  async deleteTerm(params: {
    taxonomy: string;
    id: number;
    force?: boolean;
  }): Promise<{
    term_id: number;
    deleted: boolean;
    message: string;
  }> {
    const res = await this.http.delete(`/terms/${params.taxonomy}`, { params });
    return res.data;
  }

  async listPostTypes(): Promise<{
    post_types: Array<{
      name: string;
      label: string;
      labels: Record<string, string>;
      public: boolean;
      hierarchical: boolean;
      has_archive: boolean;
      supports: Record<string, boolean>;
    }>;
    total: number;
  }> {
    const res = await this.http.get('/post-types');
    return res.data;
  }

  // ------------------------------------------------------------------ //
  // Media Library
  // ------------------------------------------------------------------ //

  async listMedia(params: {
    page?: number;
    per_page?: number;
    search?: string;
    mime_type?: string;
  }): Promise<{
    media: Array<{
      id: number;
      title: string;
      caption: string;
      description: string;
      alt_text: string;
      mime_type: string;
      date: string;
      modified: string;
      author: number;
      url: string;
      sizes: Record<string, { url: string; width: number; height: number }>;
      metadata: Record<string, unknown>;
    }>;
    total: number;
    total_pages: number;
    page: number;
    per_page: number;
  }> {
    const res = await this.http.get('/media', { params });
    return res.data;
  }

  async getMedia(id: number): Promise<{
    media: {
      id: number;
      title: string;
      caption: string;
      description: string;
      alt_text: string;
      mime_type: string;
      date: string;
      modified: string;
      author: number;
      url: string;
      sizes: Record<string, { url: string; width: number; height: number }>;
      metadata: Record<string, unknown>;
    };
  }> {
    const res = await this.http.get(`/media/${id}`);
    return res.data;
  }

  async updateMedia(
    id: number,
    updates: {
      alt_text?: string;
      title?: string;
      caption?: string;
      description?: string;
    },
  ): Promise<{
    media_id: number;
    updated: Record<string, string>;
    media: {
      id: number;
      title: string;
      caption: string;
      description: string;
      alt_text: string;
      mime_type: string;
      date: string;
      modified: string;
      author: number;
      url: string;
      sizes: Record<string, { url: string; width: number; height: number }>;
      metadata: Record<string, unknown>;
    };
    message: string;
  }> {
    const res = await this.http.put(`/media/${id}`, updates);
    return res.data;
  }

  async deleteMedia(id: number, force = false): Promise<{
    media_id: number;
    deleted: boolean;
    message: string;
  }> {
    const res = await this.http.delete(`/media/${id}`, { params: { force } });
    return res.data;
  }
}
