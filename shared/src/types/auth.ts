export type ActivationMode =
  | 'standalone-free'
  | 'standalone-pro'
  | 'vamerli-embedded'
  | 'vamerli-agency';

export interface ApiKey {
  key: string;
  label: string;
  capabilities: KeyCapability[];
  created_at: string;
  last_used?: string;
  is_active: boolean;
}

export type KeyCapability =
  | 'templates:read'
  | 'templates:write'
  | 'templates:delete'
  | 'theme-builder:read'
  | 'theme-builder:write'
  | 'global-widgets:read'
  | 'global-widgets:write'
  | 'library:export'
  | 'library:import';

export interface GovernanceSettings {
  allowed_capabilities: KeyCapability[];
  require_approval: boolean;
  audit_log_enabled: boolean;
  max_keys: number;
}
