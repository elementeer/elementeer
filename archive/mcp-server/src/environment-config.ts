import type { CapabilityId } from './client.js';

export type EnvironmentType = 'draft' | 'staging' | 'production';

export interface EnvironmentConfig {
  id: string;
  type: EnvironmentType;
  name: string;
  description: string;
  readOnly: boolean;
  dataIsolation: boolean;
  promotionSource: EnvironmentType | null;
  promotionTarget: EnvironmentType | null;
  defaultCapabilities: CapabilityId[];
}

export interface EnvironmentCapability {
  capabilityId: CapabilityId;
  allowedEnvironments: EnvironmentType[];
  readOnlyEnvironments: EnvironmentType[];
}

export interface PromotionWorkflow {
  source: EnvironmentType;
  target: EnvironmentType;
  approvalRequired: boolean;
  autoTests: string[];
  rollbackPlan: 'automatic' | 'manual' | 'none';
}

/**
 * Default environment configurations
 */
export const DEFAULT_ENVIRONMENTS: EnvironmentConfig[] = [
  {
    id: 'draft',
    type: 'draft',
    name: 'Draft',
    description: 'Work in progress, individual developer sandboxes',
    readOnly: false,
    dataIsolation: true,
    promotionSource: null,
    promotionTarget: 'staging',
    defaultCapabilities: [
      'page-composition',
      'global-styles',
      'theme-builder',
      'change-review',
    ],
  },
  {
    id: 'staging',
    type: 'staging',
    name: 'Staging',
    description: 'Integration testing, client review',
    readOnly: false,
    dataIsolation: true,
    promotionSource: 'draft',
    promotionTarget: 'production',
    defaultCapabilities: [
      'page-composition',
      'global-styles',
      'theme-builder',
      'change-review',
      'woocommerce-templates',
      'multilingual-workflows',
    ],
  },
  {
    id: 'production',
    type: 'production',
    name: 'Production',
    description: 'Live site, customer-facing',
    readOnly: true,
    dataIsolation: false,
    promotionSource: 'staging',
    promotionTarget: null,
    defaultCapabilities: [
      'page-composition',
      'global-styles',
      'theme-builder',
      'change-review',
      'woocommerce-templates',
      'multilingual-workflows',
    ],
  },
];

/**
 * Environment-specific capability restrictions
 */
export const ENVIRONMENT_CAPABILITIES: EnvironmentCapability[] = [
  // Page Composition
  {
    capabilityId: 'page-composition',
    allowedEnvironments: ['draft', 'staging', 'production'],
    readOnlyEnvironments: ['production'],
  },
  // Global Styles
  {
    capabilityId: 'global-styles',
    allowedEnvironments: ['draft', 'staging', 'production'],
    readOnlyEnvironments: ['production'],
  },
  // Theme Builder
  {
    capabilityId: 'theme-builder',
    allowedEnvironments: ['draft', 'staging', 'production'],
    readOnlyEnvironments: ['production'],
  },
  // Change Review
  {
    capabilityId: 'change-review',
    allowedEnvironments: ['draft', 'staging', 'production'],
    readOnlyEnvironments: [],
  },
  // WooCommerce Templates
  {
    capabilityId: 'woocommerce-templates',
    allowedEnvironments: ['draft', 'staging', 'production'],
    readOnlyEnvironments: ['production'],
  },
  // Multilingual Workflows
  {
    capabilityId: 'multilingual-workflows',
    allowedEnvironments: ['draft', 'staging', 'production'],
    readOnlyEnvironments: ['production'],
  },
];

/**
 * Promotion workflows between environments
 */
export const PROMOTION_WORKFLOWS: PromotionWorkflow[] = [
  {
    source: 'draft',
    target: 'staging',
    approvalRequired: false,
    autoTests: ['validate-elementor-write', 'check-capability-matrix'],
    rollbackPlan: 'automatic',
  },
  {
    source: 'staging',
    target: 'production',
    approvalRequired: true,
    autoTests: [
      'validate-elementor-write',
      'check-capability-matrix',
      'performance-check',
      'accessibility-scan',
    ],
    rollbackPlan: 'manual',
  },
];

/**
 * Get environment configuration by ID
 */
export function getEnvironmentConfig(id: string): EnvironmentConfig | undefined {
  return DEFAULT_ENVIRONMENTS.find(env => env.id === id);
}

/**
 * Get environment configuration by type
 */
export function getEnvironmentByType(type: EnvironmentType): EnvironmentConfig | undefined {
  return DEFAULT_ENVIRONMENTS.find(env => env.type === type);
}

/**
 * Get all available environments
 */
export function getAllEnvironments(): EnvironmentConfig[] {
  return [...DEFAULT_ENVIRONMENTS];
}

/**
 * Check if capability is allowed in environment
 */
export function isCapabilityAllowedInEnvironment(
  capabilityId: CapabilityId,
  environmentType: EnvironmentType
): { allowed: boolean; readOnly: boolean } {
  const envCapability = ENVIRONMENT_CAPABILITIES.find(
    cap => cap.capabilityId === capabilityId
  );
  
  if (!envCapability) {
    // Default to allowing in all environments if not specified
    return { allowed: true, readOnly: false };
  }
  
  const allowed = envCapability.allowedEnvironments.includes(environmentType);
  const readOnly = envCapability.readOnlyEnvironments.includes(environmentType);
  
  return { allowed, readOnly };
}

/**
 * Get promotion workflow between environments
 */
export function getPromotionWorkflow(
  source: EnvironmentType,
  target: EnvironmentType
): PromotionWorkflow | undefined {
  return PROMOTION_WORKFLOWS.find(
    workflow => workflow.source === source && workflow.target === target
  );
}

/**
 * Get next environment in promotion chain
 */
export function getNextEnvironment(current: EnvironmentType): EnvironmentType | null {
  const env = getEnvironmentByType(current);
  return env?.promotionTarget || null;
}

/**
 * Get previous environment in promotion chain
 */
export function getPreviousEnvironment(current: EnvironmentType): EnvironmentType | null {
  const env = getEnvironmentByType(current);
  return env?.promotionSource || null;
}