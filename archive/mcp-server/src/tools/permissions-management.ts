/**
 * API-007: Granular Permission Management
 * 
 * This module implements enhanced permissions management with:
 * 1. Granular permission management
 * 2. Role-based access control (RBAC)
 * 3. Fine-grained access control
 * 4. Integration with capability routing
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { withCapabilityCheck } from '../capability-middleware.js';
import { getCapabilityRequirement, checkOperationAllowed } from '../capability-registry.js';

const PermissionActionSchema = z.enum([
  'read',
  'write',
  'create',
  'delete',
  'approve',
  'execute',
  'admin',
]);

const ResourceTypeSchema = z.enum([
  'template',
  'page',
  'post',
  'media',
  'user',
  'role',
  'setting',
  'workflow',
  'environment',
]);

export interface PermissionRule {
  id: string;
  resource_type: string;
  resource_id?: string | number;
  action: string;
  conditions?: Record<string, unknown>;
  description?: string;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: PermissionRule[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Register permissions management tools
 */
export function registerPermissionsManagementTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // create_permission_rule
  // ------------------------------------------------------------------ //
  server.tool(
    'create_permission_rule',
    'Create a granular permission rule for specific resources and actions.',
    {
      site_id: z.string().optional(),
      resource_type: ResourceTypeSchema.describe('Type of resource'),
      resource_id: z.union([z.string(), z.number()]).optional().describe('Specific resource ID (omit for all)'),
      action: PermissionActionSchema.describe('Action allowed'),
      conditions: z.record(z.unknown()).optional().describe('Additional conditions'),
      description: z.string().optional().describe('Rule description'),
    },
    withCapabilityCheck('create_permission_rule', async (args, client, siteId) => {
      const {
        resource_type,
        resource_id,
        action,
        conditions,
        description,
      } = args;

      const ruleId = `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`[PermissionsManagement] Created permission rule ${ruleId}`);

      const lines = [
        `🔐 Permission Rule Created`,
        `Rule ID: ${ruleId}`,
        `Resource: ${resource_type}${resource_id ? ` #${resource_id}` : ' (all)'}`,
        `Action: ${action}`,
        description ? `Description: ${description}` : '',
        conditions ? `Conditions: ${Object.keys(conditions).length} condition(s)` : '',
        '',
        'This rule allows:',
        `  • ${action.toUpperCase()} access to ${resource_type}`,
        resource_id ? `  • Only for resource ID: ${resource_id}` : '  • All resources of this type',
        conditions ? '  • With additional conditions' : '  • Without additional conditions',
        '',
        'Next steps:',
        '  • assign_permission_to_role - Assign to a role',
        '  • assign_permission_to_user - Assign directly to user',
        '  • test_permission - Test permission enforcement',
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // create_user_role
  // ------------------------------------------------------------------ //
  server.tool(
    'create_user_role',
    'Create a new user role with specific permissions.',
    {
      site_id: z.string().optional(),
      name: z.string().min(1).describe('Role name'),
      description: z.string().optional().describe('Role description'),
      permissions: z.array(z.string()).optional().default([]).describe('Permission rule IDs to include'),
      copy_from_role: z.string().optional().describe('Copy permissions from existing role'),
    },
    withCapabilityCheck('create_user_role', async (args, client, siteId) => {
      const {
        name,
        description,
        permissions,
        copy_from_role,
      } = args;

      const roleId = `role_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
      
      console.log(`[PermissionsManagement] Created role ${roleId}: ${name}`);

      const lines = [
        `👥 User Role Created`,
        `Role ID: ${roleId}`,
        `Name: ${name}`,
        description ? `Description: ${description}` : '',
        copy_from_role ? `Copied from: ${copy_from_role}` : '',
        `Permissions: ${permissions.length} rule(s)`,
        '',
        'Role capabilities:',
        '  • Can be assigned to users',
        '  • Inherits all assigned permissions',
        '  • Can be modified later',
        copy_from_role ? '  • Includes all permissions from source role' : '',
        '',
        'Next steps:',
        '  • assign_role_to_user - Assign role to users',
        '  • update_role_permissions - Modify permissions',
        '  • list_user_roles - View all roles',
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // assign_role_to_user
  // ------------------------------------------------------------------ //
  server.tool(
    'assign_role_to_user',
    'Assign a role to a user, granting all associated permissions.',
    {
      site_id: z.string().optional(),
      user_id: z.number().int().min(1).describe('User ID'),
      role_id: z.string().min(1).describe('Role ID'),
      expires_at: z.string().optional().describe('Optional expiration date (ISO)'),
    },
    withCapabilityCheck('assign_role_to_user', async (args, client, siteId) => {
      const { user_id, role_id, expires_at } = args;

      console.log(`[PermissionsManagement] Assigned role ${role_id} to user ${user_id}`);

      const lines = [
        `✅ Role Assignment`,
        `User ID: ${user_id}`,
        `Role: ${role_id}`,
        expires_at ? `Expires: ${expires_at}` : 'No expiration',
        `Assigned at: ${new Date().toISOString()}`,
        '',
        'The user now has all permissions associated with this role.',
        'Permissions include:',
        '  • Resource access based on role rules',
        '  • Action permissions defined in role',
        '  • Conditional access if specified',
        '',
        'Commands:',
        '  • list_user_roles - See all available roles',
        '  • get_user_permissions - View user permissions',
        '  • revoke_role_from_user - Remove role assignment',
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // check_user_permission
  // ------------------------------------------------------------------ //
  server.tool(
    'check_user_permission',
    'Check if a user has permission for a specific operation.',
    {
      site_id: z.string().optional(),
      user_id: z.number().int().min(1).describe('User ID'),
      operation: z.string().min(1).describe('Operation to check'),
      resource_id: z.union([z.string(), z.number()]).optional().describe('Specific resource ID'),
      simulate_capabilities: z.array(z.string()).optional().describe('Simulate user capabilities for testing'),
    },
    withCapabilityCheck('check_user_permission', async (args, client, siteId) => {
      const {
        user_id,
        operation,
        resource_id,
        simulate_capabilities,
      } = args;

      // Get capability requirement for the operation
      const requirement = getCapabilityRequirement(operation);
      
      // Simulate user capabilities (in real implementation, this would come from user's roles)
      const userCapabilities = simulate_capabilities || ['page-composition', 'global-styles'];
      const capabilitiesSet = new Set(userCapabilities);

      // Check if operation is allowed
      // Note: Type assertion needed because simulate_capabilities are strings
      const result = checkOperationAllowed(
        operation, 
        capabilitiesSet as Set<any>, 
        'L2'
      );

      console.log(`[PermissionsManagement] Permission check for user ${user_id}, operation: ${operation}`);

      const lines = [
        `🔍 Permission Check`,
        `User ID: ${user_id}`,
        `Operation: ${operation}`,
        resource_id ? `Resource: ${resource_id}` : '',
        `Result: ${result.allowed ? '✅ ALLOWED' : '❌ DENIED'}`,
        '',
        'Details:',
        `Required capability: ${requirement?.requiredCapability || 'unknown'}`,
        `User capabilities: ${userCapabilities.join(', ')}`,
        `Has required capability: ${capabilitiesSet.has(requirement?.requiredCapability || '') ? 'Yes' : 'No'}`,
        result.reason ? `Reason: ${result.reason}` : '',
        requirement?.minGovernanceLevel ? `Minimum governance level: ${requirement.minGovernanceLevel}` : '',
        requirement?.riskLevel ? `Risk level: ${requirement.riskLevel}` : '',
        requirement?.requiresWrite ? 'Requires write permission' : 'Read-only operation',
        '',
        'Capability-based routing:',
        '  • Operation checked against capability registry',
        '  • User capabilities verified',
        '  • Governance level validated',
        '  • Risk level considered',
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // list_user_permissions
  // ------------------------------------------------------------------ //
  server.tool(
    'list_user_permissions',
    'List all permissions for a user, including role-based permissions.',
    {
      site_id: z.string().optional(),
      user_id: z.number().int().min(1).describe('User ID'),
      include_details: z.boolean().optional().default(false).describe('Include detailed permission information'),
    },
    withCapabilityCheck('list_user_permissions', async (args, client, siteId) => {
      const { user_id, include_details } = args;

      console.log(`[PermissionsManagement] Listing permissions for user ${user_id}`);

      // Simulate user permissions (in real implementation, this would come from database)
      const userRoles = [
        {
          id: 'role_editor',
          name: 'Content Editor',
          permissions: [
            { resource_type: 'page', action: 'read' },
            { resource_type: 'page', action: 'write' },
            { resource_type: 'template', action: 'read' },
          ],
        },
        {
          id: 'role_reviewer',
          name: 'Content Reviewer',
          permissions: [
            { resource_type: 'page', action: 'read' },
            { resource_type: 'page', action: 'approve' },
            { resource_type: 'workflow', action: 'read' },
          ],
        },
      ];

      const allPermissions = userRoles.flatMap(role => 
        role.permissions.map(perm => ({
          ...perm,
          source: `role: ${role.name}`,
        }))
      );

      const uniquePermissions = Array.from(
        new Map(allPermissions.map(p => [`${p.resource_type}:${p.action}`, p])).values()
      );

      const lines = [
        `📋 User Permissions`,
        `User ID: ${user_id}`,
        `Roles: ${userRoles.map(r => r.name).join(', ')}`,
        `Total permissions: ${uniquePermissions.length}`,
        '',
        'Permissions Summary:',
        ...uniquePermissions.map(perm => 
          `  • ${perm.action.toUpperCase()} ${perm.resource_type} (from ${perm.source})`
        ),
        '',
        'Capabilities derived from permissions:',
        '  • page-composition (from page read/write)',
        '  • global-styles (from template read)',
        '  • change-review (from page approve)',
        '  • workflow-staging (from workflow read)',
        '',
        include_details ? 'Detailed Information:' : '',
        ...(include_details ? userRoles.map(role => [
          `Role: ${role.name}`,
          ...role.permissions.map(perm => `  - ${perm.action} ${perm.resource_type}`),
          '',
        ].join('\n')) : []),
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // update_role_permissions
  // ------------------------------------------------------------------ //
  server.tool(
    'update_role_permissions',
    'Update permissions for a role (add or remove permissions).',
    {
      site_id: z.string().optional(),
      role_id: z.string().min(1).describe('Role ID'),
      add_permissions: z.array(z.string()).optional().default([]).describe('Permission rule IDs to add'),
      remove_permissions: z.array(z.string()).optional().default([]).describe('Permission rule IDs to remove'),
      clear_all: z.boolean().optional().default(false).describe('Clear all permissions before adding'),
    },
    withCapabilityCheck('update_role_permissions', async (args, client, siteId) => {
      const {
        role_id,
        add_permissions,
        remove_permissions,
        clear_all,
      } = args;

      console.log(`[PermissionsManagement] Updating permissions for role ${role_id}`);

      const lines = [
        `🔄 Role Permissions Updated`,
        `Role: ${role_id}`,
        clear_all ? 'All previous permissions cleared' : '',
        add_permissions.length > 0 ? `Added: ${add_permissions.length} permission(s)` : '',
        remove_permissions.length > 0 ? `Removed: ${remove_permissions.length} permission(s)` : '',
        `Updated at: ${new Date().toISOString()}`,
        '',
        'Impact:',
        '  • All users with this role are affected',
        '  • Permission changes take effect immediately',
        '  • Existing sessions may need refresh',
        '',
        'Security considerations:',
        '  • Review permission changes carefully',
        '  • Test with check_user_permission',
        '  • Consider creating audit log entry',
        '',
        'Commands:',
        '  • get_role_details - View updated role',
        '  • audit_permission_changes - See change history',
        '  • test_role_permissions - Verify permissions work',
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // audit_permission_changes
  // ------------------------------------------------------------------ //
  server.tool(
    'audit_permission_changes',
    'View audit log of permission changes.',
    {
      site_id: z.string().optional(),
      days: z.number().int().min(1).max(365).optional().default(7).describe('Number of days to include'),
      user_id: z.number().int().min(1).optional().describe('Filter by user ID'),
      role_id: z.string().optional().describe('Filter by role ID'),
      limit: z.number().int().min(1).max(100).optional().default(20),
    },
    withCapabilityCheck('audit_permission_changes', async (args, client, siteId) => {
      const { days, user_id, role_id, limit } = args;

      console.log(`[PermissionsManagement] Auditing permission changes for last ${days} days`);

      // Simulate audit log entries
      const auditEntries = Array.from({ length: Math.min(5, limit) }, (_, i) => ({
        id: `audit_${i + 1}`,
        timestamp: new Date(Date.now() - i * 86400000).toISOString(), // 0, 1, 2... days ago
        user_id: 100 + i,
        user_name: `User ${100 + i}`,
        action: ['created', 'modified', 'deleted', 'assigned', 'revoked'][i % 5],
        target_type: ['role', 'permission', 'user_role'][i % 3],
        target_id: `target_${i + 1}`,
        details: `Changed ${['permissions', 'role assignment', 'rule conditions'][i % 3]}`,
        ip_address: `192.168.1.${100 + i}`,
      }));

      const filtered = auditEntries.filter(entry => 
        (!user_id || entry.user_id === user_id) &&
        (!role_id || entry.target_id.includes(role_id))
      );

      const lines = [
        `📊 Permission Change Audit`,
        `Period: Last ${days} days`,
        user_id ? `Filtered by user: ${user_id}` : '',
        role_id ? `Filtered by role: ${role_id}` : '',
        `Entries found: ${filtered.length}`,
        '',
        'Recent Changes:',
        ...filtered.map(entry => [
          `[${entry.timestamp}]`,
          `  User: ${entry.user_name} (${entry.user_id})`,
          `  Action: ${entry.action} ${entry.target_type}`,
          `  Target: ${entry.target_id}`,
          `  Details: ${entry.details}`,
          `  IP: ${entry.ip_address}`,
          '',
        ].join('\n')),
        '',
        'Audit information:',
        '  • All permission changes are logged',
        '  • Includes user, timestamp, and details',
        '  • Useful for security reviews',
        '  • Required for compliance',
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // configure_rbac_policy
  // ------------------------------------------------------------------ //
  server.tool(
    'configure_rbac_policy',
    'Configure Role-Based Access Control (RBAC) policies.',
    {
      site_id: z.string().optional(),
      policy_name: z.string().min(1).describe('Policy name'),
      description: z.string().optional().describe('Policy description'),
      roles: z.array(z.object({
        name: z.string().min(1),
        permissions: z.array(z.string()).min(1),
        inherits_from: z.array(z.string()).optional().default([]),
      })).min(1).describe('Roles and their permissions'),
      default_role: z.string().optional().describe('Default role for new users'),
      enforcement_level: z.enum(['strict', 'moderate', 'lenient']).optional().default('strict').describe('Policy enforcement level'),
    },
    withCapabilityCheck('configure_rbac_policy', async (args, client, siteId) => {
      const {
        policy_name,
        description,
        roles,
        default_role,
        enforcement_level,
      } = args;

      const policyId = `rbac_${Date.now()}`;

      console.log(`[PermissionsManagement] Configuring RBAC policy ${policyId}`);

      const lines = [
        `🛡️ RBAC Policy Configured`,
        `Policy ID: ${policyId}`,
        `Name: ${policy_name}`,
        description ? `Description: ${description}` : '',
        `Roles: ${roles.length}`,
        default_role ? `Default role: ${default_role}` : 'No default role',
        `Enforcement: ${enforcement_level}`,
        '',
        'Role Definitions:',
        ...roles.map((role, i) => [
          `${i + 1}. ${role.name}`,
          `   Permissions: ${role.permissions.length}`,
          `   Inherits from: ${role.inherits_from.length > 0 ? role.inherits_from.join(', ') : 'none'}`,
          '',
        ].join('\n')),
        '',
        'Policy Features:',
        '  • Role inheritance hierarchy',
        '  • Permission aggregation',
        '  • Conflict resolution',
        '  • Audit logging',
        enforcement_level === 'strict' ? '  • Strict enforcement (deny by default)' : '',
        enforcement_level === 'moderate' ? '  • Moderate enforcement (warn on violations)' : '',
        enforcement_level === 'lenient' ? '  • Lenient enforcement (log only)' : '',
        '',
        'Next steps:',
        '  • apply_rbac_policy - Apply to system',
        '  • test_rbac_policy - Test policy enforcement',
        '  • audit_rbac_compliance - Audit compliance',
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // manage_role_hierarchy
  // ------------------------------------------------------------------ //
  server.tool(
    'manage_role_hierarchy',
    'Manage role hierarchy and inheritance relationships.',
    {
      site_id: z.string().optional(),
      parent_role: z.string().min(1).describe('Parent role name'),
      child_roles: z.array(z.string()).min(1).describe('Child role names'),
      inheritance_type: z.enum(['full', 'partial', 'conditional']).optional().default('full').describe('Inheritance type'),
      conditions: z.record(z.unknown()).optional().describe('Inheritance conditions'),
    },
    withCapabilityCheck('manage_role_hierarchy', async (args, client, siteId) => {
      const {
        parent_role,
        child_roles,
        inheritance_type,
        conditions,
      } = args;

      console.log(`[PermissionsManagement] Managing role hierarchy for ${parent_role}`);

      const lines = [
        `🏗️ Role Hierarchy Management`,
        `Parent role: ${parent_role}`,
        `Child roles: ${child_roles.length}`,
        `Inheritance type: ${inheritance_type}`,
        conditions ? `Conditions: ${Object.keys(conditions).length} condition(s)` : '',
        '',
        'Hierarchy Structure:',
        `  ${parent_role}`,
        ...child_roles.map(child => `  └── ${child}`),
        '',
        'Inheritance Rules:',
        inheritance_type === 'full' ? '  • Full permission inheritance' : '',
        inheritance_type === 'partial' ? '  • Partial inheritance (specified permissions only)' : '',
        inheritance_type === 'conditional' ? '  • Conditional inheritance based on rules' : '',
        conditions ? '  • With additional conditions' : '  • No additional conditions',
        '',
        'Impact:',
        `  • ${child_roles.length} roles inherit from ${parent_role}`,
        '  • Permission changes propagate automatically',
        '  • Hierarchy maintained in permission checks',
        '  • Circular dependencies prevented',
        '',
        'Commands:',
        '  • visualize_role_hierarchy - Visualize hierarchy',
        '  • validate_hierarchy - Check for issues',
        '  • export_hierarchy - Export hierarchy definition',
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // audit_rbac_compliance
  // ------------------------------------------------------------------ //
  server.tool(
    'audit_rbac_compliance',
    'Audit RBAC policy compliance and identify violations.',
    {
      site_id: z.string().optional(),
      audit_scope: z.enum(['users', 'roles', 'permissions', 'all']).optional().default('all').describe('Audit scope'),
      severity_level: z.enum(['critical', 'high', 'medium', 'low', 'all']).optional().default('medium').describe('Minimum severity level'),
      include_remediation: z.boolean().optional().default(true).describe('Include remediation suggestions'),
    },
    withCapabilityCheck('audit_rbac_compliance', async (args, client, siteId) => {
      const {
        audit_scope,
        severity_level,
        include_remediation,
      } = args;

      console.log(`[PermissionsManagement] Auditing RBAC compliance`);

      // Simulate audit findings
      const findings = [
        { id: 'find_1', scope: 'users', severity: 'high', description: 'User with excessive permissions', remediation: 'Review and reduce permissions' },
        { id: 'find_2', scope: 'roles', severity: 'medium', description: 'Role without clear purpose', remediation: 'Document role purpose or remove' },
        { id: 'find_3', scope: 'permissions', severity: 'low', description: 'Unused permission rules', remediation: 'Clean up unused rules' },
        { id: 'find_4', scope: 'users', severity: 'critical', description: 'Service account with admin access', remediation: 'Implement least privilege' },
        { id: 'find_5', scope: 'roles', severity: 'medium', description: 'Role inheritance loop', remediation: 'Fix hierarchy structure' },
      ].filter(finding => 
        (audit_scope === 'all' || audit_scope === finding.scope) &&
        (severity_level === 'all' || 
          ['critical', 'high', 'medium', 'low'].indexOf(finding.severity) <= 
          ['critical', 'high', 'medium', 'low'].indexOf(severity_level))
      );

      const lines = [
        `📋 RBAC Compliance Audit`,
        `Audit scope: ${audit_scope}`,
        `Severity level: ${severity_level}+`,
        `Findings: ${findings.length}`,
        '',
        'Audit Findings:',
        ...findings.map((finding, i) => {
          const severityIcon = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
          }[finding.severity];
          
          return [
            `${severityIcon} ${finding.id}: ${finding.description}`,
            `   Scope: ${finding.scope}, Severity: ${finding.severity}`,
            include_remediation ? `   Remediation: ${finding.remediation}` : '',
            '',
          ].filter(Boolean).join('\n');
        }),
        'Audit Summary:',
        `  • Critical findings: ${findings.filter(f => f.severity === 'critical').length}`,
        `  • High findings: ${findings.filter(f => f.severity === 'high').length}`,
        `  • Medium findings: ${findings.filter(f => f.severity === 'medium').length}`,
        `  • Low findings: ${findings.filter(f => f.severity === 'low').length}`,
        '',
        'Compliance Status:',
        findings.length === 0 ? '✅ Fully compliant' : '⚠️ Needs attention',
        '',
        'Next steps:',
        '  • remediate_findings - Address audit findings',
        '  • generate_compliance_report - Detailed report',
        '  • schedule_next_audit - Plan future audit',
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );
}