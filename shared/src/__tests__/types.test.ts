/**
 * Type-level and runtime tests for shared types.
 * Verifies that type values are consistent and exhaustive.
 */
import { describe, it, expect } from 'vitest';
import type {
  ElementifyErrorCode,
  ElementifyError,
  KeyCapability,
  ActivationMode,
  GovernanceSettings,
  ElementifyTemplate,
  ElementifyTemplateList,
  SiteConfig,
  ElementifyConfig,
} from '../index.js';

// ------------------------------------------------------------------ //
// Runtime values derived from the type system
// ------------------------------------------------------------------ //

const KEY_CAPABILITIES: KeyCapability[] = [
  'templates:read',
  'templates:write',
  'templates:delete',
  'theme-builder:read',
  'theme-builder:write',
  'global-widgets:read',
  'global-widgets:write',
  'library:export',
  'library:import',
];

const ACTIVATION_MODES: ActivationMode[] = [
  'standalone-free',
  'standalone-pro',
  'vamerli-embedded',
  'vamerli-agency',
];

const ERROR_CODES: ElementifyErrorCode[] = [
  'auth_invalid_key',
  'auth_key_inactive',
  'auth_insufficient_scope',
  'governance_blocked',
  'not_found',
  'elementor_not_active',
  'template_type_unsupported',
  'rate_limited',
];

// ------------------------------------------------------------------ //
// Tests
// ------------------------------------------------------------------ //

describe('KeyCapability', () => {
  it('all capability values are non-empty strings', () => {
    for (const cap of KEY_CAPABILITIES) {
      expect(typeof cap).toBe('string');
      expect(cap.length).toBeGreaterThan(0);
    }
  });

  it('all capabilities follow namespace:action format', () => {
    for (const cap of KEY_CAPABILITIES) {
      expect(cap).toMatch(/^[a-z-]+:[a-z-]+$/);
    }
  });

  it('contains exactly 9 capabilities', () => {
    expect(KEY_CAPABILITIES).toHaveLength(9);
  });

  it('has no duplicate values', () => {
    const unique = new Set(KEY_CAPABILITIES);
    expect(unique.size).toBe(KEY_CAPABILITIES.length);
  });

  it('includes read/write/delete for templates', () => {
    expect(KEY_CAPABILITIES).toContain('templates:read');
    expect(KEY_CAPABILITIES).toContain('templates:write');
    expect(KEY_CAPABILITIES).toContain('templates:delete');
  });

  it('auth_insufficient_scope is separate from auth_invalid_key', () => {
    // This is the critical Respira distinction
    expect(ERROR_CODES).toContain('auth_insufficient_scope');
    expect(ERROR_CODES).toContain('auth_invalid_key');
    const insufficientIdx = ERROR_CODES.indexOf('auth_insufficient_scope');
    const invalidIdx = ERROR_CODES.indexOf('auth_invalid_key');
    expect(insufficientIdx).not.toBe(invalidIdx);
  });
});

describe('ActivationMode', () => {
  it('all mode values are non-empty strings', () => {
    for (const mode of ACTIVATION_MODES) {
      expect(typeof mode).toBe('string');
      expect(mode.length).toBeGreaterThan(0);
    }
  });

  it('contains exactly 4 modes', () => {
    expect(ACTIVATION_MODES).toHaveLength(4);
  });

  it('has no duplicate values', () => {
    const unique = new Set(ACTIVATION_MODES);
    expect(unique.size).toBe(ACTIVATION_MODES.length);
  });

  it('includes standalone-free as lowest tier', () => {
    expect(ACTIVATION_MODES).toContain('standalone-free');
  });

  it('includes vamerli-agency as highest tier', () => {
    expect(ACTIVATION_MODES).toContain('vamerli-agency');
  });
});

describe('ElementifyErrorCode', () => {
  it('all error codes are non-empty strings', () => {
    for (const code of ERROR_CODES) {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate error codes', () => {
    const unique = new Set(ERROR_CODES);
    expect(unique.size).toBe(ERROR_CODES.length);
  });

  it('contains exactly 8 error codes', () => {
    expect(ERROR_CODES).toHaveLength(8);
  });

  it('auth_insufficient_scope is present and distinct', () => {
    expect(ERROR_CODES.filter((c) => c.includes('scope'))).toHaveLength(1);
    expect(ERROR_CODES.filter((c) => c === 'auth_insufficient_scope')).toHaveLength(1);
  });

  it('all auth error codes start with "auth_"', () => {
    const authCodes = ERROR_CODES.filter((c) => c.startsWith('auth_'));
    expect(authCodes).toContain('auth_invalid_key');
    expect(authCodes).toContain('auth_key_inactive');
    expect(authCodes).toContain('auth_insufficient_scope');
  });
});

describe('GovernanceSettings runtime shape', () => {
  it('can construct a valid GovernanceSettings object', () => {
    const settings: GovernanceSettings = {
      allowed_capabilities: ['templates:read', 'templates:write'],
      require_approval: false,
      audit_log_enabled: true,
      max_keys: 10,
    };

    expect(settings.allowed_capabilities).toHaveLength(2);
    expect(settings.require_approval).toBe(false);
    expect(settings.audit_log_enabled).toBe(true);
    expect(settings.max_keys).toBe(10);
  });
});

describe('ElementifyTemplate runtime shape', () => {
  it('can construct a valid template object', () => {
    const template: ElementifyTemplate = {
      id: 1,
      title: 'Hero Section',
      status: 'publish',
      type: 'section',
      author: 1,
      date: '2025-01-01T00:00:00',
      modified: '2025-06-01T00:00:00',
      categories: ['hero'],
      tags: ['promo'],
      shortcode: '[elementor-template id="1"]',
    };

    expect(template.id).toBe(1);
    expect(template.type).toBe('section');
  });

  it('template list total and total_pages are numeric', () => {
    const list: ElementifyTemplateList = {
      templates: [],
      total: 0,
      total_pages: 1,
    };

    expect(typeof list.total).toBe('number');
    expect(typeof list.total_pages).toBe('number');
  });
});

describe('ElementifyError runtime shape', () => {
  it('can construct a valid error object', () => {
    const error: ElementifyError = {
      code: 'auth_insufficient_scope',
      message: 'Key lacks required capability.',
      status: 403,
    };

    expect(error.code).toBe('auth_insufficient_scope');
    expect(error.status).toBe(403);
  });
});

describe('SiteConfig and ElementifyConfig', () => {
  it('can construct a valid single-site config', () => {
    const config: ElementifyConfig = {
      sites: [
        {
          id: 'my-site',
          name: 'My Site',
          url: 'https://example.com',
          apiKey: 'ek_abc123',
          default: true,
          activationMode: 'standalone-free',
        },
      ],
    };

    expect(config.sites).toHaveLength(1);
    expect(config.sites[0]!.id).toBe('my-site');
  });

  it('activationMode is optional on SiteConfig', () => {
    const config: SiteConfig = {
      id: 'x',
      name: 'X',
      url: 'https://x.com',
      apiKey: 'ek_x',
    };
    expect(config.activationMode).toBeUndefined();
  });
});
