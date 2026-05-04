import type { CapabilityId } from './client.js';

export interface CapabilityRequirement {
  /** Tool/operation name */
  operation: string;
  /** Required capability ID */
  requiredCapability: CapabilityId;
  /** Risk level for queue auto-approval */
  riskLevel: 'low' | 'medium' | 'high';
  /** Minimum governance level required */
  minGovernanceLevel?: 'L0' | 'L1' | 'L2' | 'L3';
  /** Whether operation requires write permission */
  requiresWrite: boolean;
  /** Description for documentation */
  description: string;
}

/**
 * Registry mapping all Elementify operations to required capabilities
 * This is used for capability-based routing and permission checks
 */
export const CAPABILITY_REGISTRY: CapabilityRequirement[] = [
  // Page Operations
  {
    operation: 'list_elementor_pages',
    requiredCapability: 'page-composition',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'List pages built with Elementor',
  },
  {
    operation: 'get_page_data',
    requiredCapability: 'page-composition',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Read Elementor page data',
  },
  {
    operation: 'update_page_data',
    requiredCapability: 'page-composition',
    riskLevel: 'high',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Write Elementor page data',
  },
  {
    operation: 'save_page_section_as_template',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Extract page section as template',
  },
  {
    operation: 'save_full_page_as_template',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Save entire page as template',
  },
  {
    operation: 'compose_page_from_templates',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Compose page from multiple templates',
  },

  // Template Library Operations
  {
    operation: 'list_templates',
    requiredCapability: 'global-styles', // Templates are part of global library
    riskLevel: 'low',
    requiresWrite: false,
    description: 'List Elementor templates',
  },
  {
    operation: 'list_templates_enhanced',
    requiredCapability: 'global-styles',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'List templates with advanced filtering and version info',
  },
  {
    operation: 'get_template',
    requiredCapability: 'global-styles',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Get template details',
  },
  {
    operation: 'get_template_versions',
    requiredCapability: 'global-styles',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Get template version history',
  },
  {
    operation: 'create_template',
    requiredCapability: 'global-styles',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Create new template',
  },
  {
    operation: 'create_template_with_versioning',
    requiredCapability: 'global-styles',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Create template with version tracking',
  },
  {
    operation: 'update_template_data',
    requiredCapability: 'global-styles',
    riskLevel: 'high',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Update template content',
  },
  {
    operation: 'update_template_with_versioning',
    requiredCapability: 'global-styles',
    riskLevel: 'high',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Update template with version creation',
  },
  {
    operation: 'restore_template_version',
    requiredCapability: 'global-styles',
    riskLevel: 'high',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Restore template to specific version',
  },
  {
    operation: 'search_templates_advanced',
    requiredCapability: 'global-styles',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Advanced template search',
  },
  {
    operation: 'compose_templates',
    requiredCapability: 'global-styles',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Compose templates by merging',
  },
  {
    operation: 'merge_template_sections',
    requiredCapability: 'global-styles',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Merge template sections',
  },
  {
    operation: 'extract_template_components',
    requiredCapability: 'global-styles',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Extract reusable components',
  },
  {
    operation: 'delete_template',
    requiredCapability: 'global-styles',
    riskLevel: 'high',
    minGovernanceLevel: 'L3',
    requiresWrite: true,
    description: 'Delete template',
  },

  // Global Styles Operations
  {
    operation: 'get_global_styles',
    requiredCapability: 'global-styles',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Read global colors and typography',
  },
  {
    operation: 'set_global_colors',
    requiredCapability: 'global-styles',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Update global color palette',
  },
  {
    operation: 'set_global_typography',
    requiredCapability: 'global-styles',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Update global typography',
  },

  // Site Operations
  {
    operation: 'set_site_logo',
    requiredCapability: 'global-styles',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Set site logo',
  },
  {
    operation: 'update_site_settings',
    requiredCapability: 'global-styles',
    riskLevel: 'high',
    minGovernanceLevel: 'L3',
    requiresWrite: true,
    description: 'Update site settings',
  },

  // Theme Builder Operations
  {
    operation: 'wizard_theme_builder',
    requiredCapability: 'theme-builder',
    riskLevel: 'high',
    minGovernanceLevel: 'L3',
    requiresWrite: true,
    description: 'Create Theme Builder template',
  },

  // WooCommerce Operations
  {
    operation: 'update_woocommerce_template',
    requiredCapability: 'woocommerce-templates',
    riskLevel: 'high',
    minGovernanceLevel: 'L3',
    requiresWrite: true,
    description: 'Update WooCommerce template',
  },

  // Change Queue Operations
  {
    operation: 'queue_change',
    requiredCapability: 'change-review',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Queue change for review',
  },
  {
    operation: 'list_change_queue',
    requiredCapability: 'change-review',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'List queued changes',
  },
  {
    operation: 'review_change',
    requiredCapability: 'change-review',
    riskLevel: 'medium',
    minGovernanceLevel: 'L3',
    requiresWrite: true,
    description: 'Review queued change',
  },
  {
    operation: 'apply_change',
    requiredCapability: 'change-review',
    riskLevel: 'high',
    minGovernanceLevel: 'L3',
    requiresWrite: true,
    description: 'Apply approved change',
  },

  // Workflow Staging Operations
  {
    operation: 'create_content_workflow',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Create content workflow with staging',
  },
  {
    operation: 'start_workflow_execution',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Start workflow execution',
  },
  {
    operation: 'schedule_content_publish',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Schedule content publishing',
  },
  {
    operation: 'list_scheduled_publishes',
    requiredCapability: 'page-composition',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'List scheduled publications',
  },
  {
    operation: 'stage_content_to_environment',
    requiredCapability: 'page-composition',
    riskLevel: 'high',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Stage content to environment',
  },
  {
    operation: 'promote_content_to_next_stage',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Promote content to next stage',
  },
  {
    operation: 'get_workflow_status',
    requiredCapability: 'page-composition',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Get workflow status',
  },

  // Approval Workflow Operations (API-004)
  {
    operation: 'create_approval_workflow',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Create approval workflow',
  },
  {
    operation: 'request_content_approval',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Request content approval',
  },
  {
    operation: 'approve_content',
    requiredCapability: 'page-composition',
    riskLevel: 'high',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Approve content changes',
  },
  {
    operation: 'monitor_approvals',
    requiredCapability: 'page-composition',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Monitor approval workflows',
  },

  // Intelligence Composition Operations
  {
    operation: 'analyze_composition_requirements',
    requiredCapability: 'page-composition',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Analyze composition requirements',
  },
  {
    operation: 'generate_ai_composition',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Generate AI composition',
  },
  {
    operation: 'match_templates_to_requirements',
    requiredCapability: 'page-composition',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Match templates to requirements',
  },
  {
    operation: 'optimize_existing_composition',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Optimize existing composition',
  },
  {
    operation: 'critique_composition',
    requiredCapability: 'page-composition',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Critique composition',
  },

  // Content Intelligence Operations (API-006)
  {
    operation: 'analyze_content_patterns',
    requiredCapability: 'page-composition',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Analyze content patterns',
  },
  {
    operation: 'generate_content_recommendations',
    requiredCapability: 'page-composition',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Generate content recommendations',
  },
  {
    operation: 'optimize_content_strategy',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Optimize content strategy',
  },

  // Permissions Management Operations
  {
    operation: 'create_permission_rule',
    requiredCapability: 'change-review',
    riskLevel: 'high',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Create permission rule',
  },
  {
    operation: 'create_user_role',
    requiredCapability: 'change-review',
    riskLevel: 'high',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Create user role',
  },
  {
    operation: 'assign_role_to_user',
    requiredCapability: 'change-review',
    riskLevel: 'high',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Assign role to user',
  },
  {
    operation: 'check_user_permission',
    requiredCapability: 'change-review',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Check user permission',
  },
  {
    operation: 'list_user_permissions',
    requiredCapability: 'change-review',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'List user permissions',
  },
  {
    operation: 'update_role_permissions',
    requiredCapability: 'change-review',
    riskLevel: 'high',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Update role permissions',
  },
  {
    operation: 'audit_permission_changes',
    requiredCapability: 'change-review',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Audit permission changes',
  },

  // Multilingual Operations
  {
    operation: 'batch_translate_strings',
    requiredCapability: 'multilingual-workflows',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Batch translate strings',
  },
  {
    operation: 'translate_media_metadata',
    requiredCapability: 'multilingual-workflows',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Translate media metadata',
  },

  // Batch 2: Template Composition and Merging (API-002)
  {
    operation: 'compose_templates',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Compose templates from multiple sources',
  },
  {
    operation: 'merge_template_sections',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Merge sections from different templates',
  },
  {
    operation: 'extract_template_components',
    requiredCapability: 'page-composition',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Extract reusable components from templates',
  },

  // Batch 2: Approval Workflow Management (API-004)
  {
    operation: 'create_approval_workflow',
    requiredCapability: 'change-review',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Create approval workflow configuration',
  },
  {
    operation: 'request_content_approval',
    requiredCapability: 'change-review',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Request approval for content changes',
  },
  {
    operation: 'approve_content',
    requiredCapability: 'change-review',
    riskLevel: 'high',
    minGovernanceLevel: 'L3',
    requiresWrite: true,
    description: 'Approve or reject content changes',
  },
  {
    operation: 'monitor_approvals',
    requiredCapability: 'change-review',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Monitor approval workflow status',
  },

  // Batch 2: Content Intelligence and Recommendations (API-006)
  {
    operation: 'analyze_content_patterns',
    requiredCapability: 'page-composition',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Analyze content patterns and trends',
  },
  {
    operation: 'generate_content_recommendations',
    requiredCapability: 'page-composition',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Generate intelligent content recommendations',
  },
  {
    operation: 'optimize_content_strategy',
    requiredCapability: 'page-composition',
    riskLevel: 'medium',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Optimize content strategy based on analysis',
  },

  // Batch 2: Role-Based Access Control (API-008)
  {
    operation: 'configure_rbac_policy',
    requiredCapability: 'change-review',
    riskLevel: 'high',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Configure RBAC policy settings',
  },
  {
    operation: 'manage_role_hierarchy',
    requiredCapability: 'change-review',
    riskLevel: 'high',
    minGovernanceLevel: 'L2',
    requiresWrite: true,
    description: 'Manage role hierarchy and inheritance',
  },
  {
    operation: 'audit_rbac_compliance',
    requiredCapability: 'change-review',
    riskLevel: 'low',
    requiresWrite: false,
    description: 'Audit RBAC compliance and violations',
  },
];

/**
 * Get capability requirement for an operation
 */
export function getCapabilityRequirement(operation: string): CapabilityRequirement | undefined {
  return CAPABILITY_REGISTRY.find(req => req.operation === operation);
}

/**
 * Check if operation is allowed based on capabilities
 */
export function checkOperationAllowed(
  operation: string,
  availableCapabilities: Set<CapabilityId>,
  governanceLevel: 'L0' | 'L1' | 'L2' | 'L3' = 'L1'
): { allowed: boolean; reason?: string } {
  const requirement = getCapabilityRequirement(operation);
  
  if (!requirement) {
    // Unknown operation - default to deny for security
    return { allowed: false, reason: `Unknown operation: ${operation}` };
  }

  // Check capability
  if (!availableCapabilities.has(requirement.requiredCapability)) {
    return { 
      allowed: false, 
      reason: `Operation requires capability: ${requirement.requiredCapability}` 
    };
  }

  // Check governance level
  if (requirement.minGovernanceLevel) {
    const governanceOrder = { 'L0': 0, 'L1': 1, 'L2': 2, 'L3': 3 };
    const requiredLevel = governanceOrder[requirement.minGovernanceLevel];
    const userLevel = governanceOrder[governanceLevel];
    
    if (userLevel < requiredLevel) {
      return { 
        allowed: false, 
        reason: `Operation requires governance level ${requirement.minGovernanceLevel} or higher` 
      };
    }
  }

  return { allowed: true };
}

/**
 * Get all operations requiring a specific capability
 */
export function getOperationsForCapability(capabilityId: CapabilityId): CapabilityRequirement[] {
  return CAPABILITY_REGISTRY.filter(req => req.requiredCapability === capabilityId);
}

/**
 * Get risk level for auto-approval decisions
 */
export function getRiskLevel(operation: string): 'low' | 'medium' | 'high' | undefined {
  const requirement = getCapabilityRequirement(operation);
  return requirement?.riskLevel;
}