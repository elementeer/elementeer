export const DOMAIN_KEY_CAPABILITIES = [
  'site-audit:read',
  'stack-bootstrap:read',
  'stack-bootstrap:prepare',
  'stack-bootstrap:write',
  'site-foundation:read',
  'site-foundation:write',
  'design-system:read',
  'design-system:write',
  'content-structure:read',
  'content-structure:write',
  'theme-structure:read',
  'theme-structure:write',
  'library-operations:read',
  'library-operations:write',
  'library-operations:import',
  'library-operations:export',
  'media-operations:read',
  'media-operations:write',
  'plugin-stack-context:read',
  'plugin-stack-context:prepare',
  'governance:read',
  'governance:review',
  'governance:apply',
  'governance:write',
  'workflow-orchestration:read',
  'workflow-orchestration:prepare',
  'workflow-orchestration:write',
] as const;

export const LEGACY_KEY_CAPABILITIES = [
  'templates:read',
  'templates:write',
  'templates:delete',
  'pages:read',
  'pages:write',
  'site:read',
  'site:write',
  'global-styles:read',
  'global-styles:write',
  'theme-builder:read',
  'theme-builder:write',
  'global-widgets:read',
  'global-widgets:write',
  'library:export',
  'library:import',
  'governance:read',
  'governance:write',
] as const;

export type DomainKeyCapability = (typeof DOMAIN_KEY_CAPABILITIES)[number];
export type LegacyKeyCapability = (typeof LEGACY_KEY_CAPABILITIES)[number];

export const LEGACY_KEY_CAPABILITY_ALIASES: Record<
  LegacyKeyCapability,
  readonly DomainKeyCapability[]
> = {
  'templates:read': ['content-structure:read'],
  'templates:write': ['content-structure:write'],
  'templates:delete': ['content-structure:write'],
  'pages:read': ['content-structure:read'],
  'pages:write': ['content-structure:write'],
  'site:read': ['site-audit:read'],
  'site:write': ['site-foundation:write'],
  'global-styles:read': ['design-system:read'],
  'global-styles:write': ['design-system:write'],
  'theme-builder:read': ['theme-structure:read'],
  'theme-builder:write': ['theme-structure:write'],
  'global-widgets:read': ['content-structure:read'],
  'global-widgets:write': ['content-structure:write'],
  'library:export': ['library-operations:export'],
  'library:import': ['library-operations:import'],
  'governance:read': ['governance:read'],
  'governance:write': ['governance:write'],
} as const;

export const KEY_CAPABILITIES = DOMAIN_KEY_CAPABILITIES;

export const DEFAULT_KEY_CAPABILITIES: readonly DomainKeyCapability[] = [
  'site-audit:read',
  'stack-bootstrap:read',
  'site-foundation:read',
  'design-system:read',
  'content-structure:read',
] as const;

export type KeyCapability = DomainKeyCapability;
export type StoredKeyCapability = DomainKeyCapability | LegacyKeyCapability;

export function isDomainKeyCapability(value: string): value is DomainKeyCapability {
  return (DOMAIN_KEY_CAPABILITIES as readonly string[]).includes(value);
}

export function isLegacyKeyCapability(value: string): value is LegacyKeyCapability {
  return (LEGACY_KEY_CAPABILITIES as readonly string[]).includes(value);
}

export function resolveCapabilityAliases(
  capability: StoredKeyCapability | string,
): DomainKeyCapability[] {
  if (isDomainKeyCapability(capability)) {
    return [capability];
  }

  if (isLegacyKeyCapability(capability)) {
    return [...LEGACY_KEY_CAPABILITY_ALIASES[capability]];
  }

  return [];
}

export function normalizeStoredCapabilities(
  capabilities: readonly (StoredKeyCapability | string)[],
): DomainKeyCapability[] {
  const normalized = capabilities.flatMap((capability) =>
    resolveCapabilityAliases(capability),
  );

  return [...new Set(normalized)];
}

export type ActivationMode =
  | 'standalone-free'
  | 'standalone-pro'
  | 'vamerli-embedded'
  | 'vamerli-agency';

export interface ApiKey {
  key: string;
  label: string;
  capabilities: StoredKeyCapability[];
  created_at: string;
  last_used?: string;
  is_active: boolean;
}

export interface GovernanceSettings {
  allowed_capabilities: StoredKeyCapability[];
  require_approval: boolean;
  audit_log_enabled: boolean;
  max_keys: number;
}
