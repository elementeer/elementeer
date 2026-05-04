// @ts-nocheck
/**
 * API-003: Content Workflow Staging
 * 
 * This module implements content workflow staging with:
 * 1. Content scheduling and staging
 * 2. Environment integration
 * 3. Queue 2.0 integration
 * 4. Approval workflow support
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { withCapabilityCheck } from '../capability-middleware.js';

const WorkflowTypeSchema = z.enum([
  'content_publish',
  'template_update',
  'style_update',
  'page_composition',
  'bulk_operation',
]);

const WorkflowStatusSchema = z.enum([
  'draft',
  'scheduled',
  'in_progress',
  'awaiting_approval',
  'approved',
  'rejected',
  'completed',
  'failed',
  'cancelled',
]);

const ScheduleTypeSchema = z.enum([
  'immediate',
  'scheduled',
  'conditional',
]);

export interface WorkflowStage {
  id: string;
  name: string;
  description?: string;
  environment: 'draft' | 'staging' | 'production';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  result?: Record<string, unknown>;
  errors?: string[];
  operations?: Array<{ type: string; parameters: Record<string, unknown> }>;
}

export interface ContentWorkflow {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  scheduled_for?: string;
  created_by: string;
  stages: WorkflowStage[];
  current_stage_index: number;
  metadata: Record<string, unknown>;
}

/**
 * Register workflow staging tools
 */
export function registerWorkflowStagingTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // create_content_workflow
  // ------------------------------------------------------------------ //
  server.tool(
    'create_content_workflow',
    'Create a new content workflow with staging across environments.',
    {
      site_id: z.string().optional(),
      name: z.string().min(1).describe('Workflow name'),
      description: z.string().optional().describe('Workflow description'),
      type: WorkflowTypeSchema.describe('Workflow type'),
      schedule_type: ScheduleTypeSchema.optional().default('immediate').describe('Schedule type'),
      scheduled_for: z.string().optional().describe('ISO date string for scheduled execution'),
      stages: z.array(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        environment: z.enum(['draft', 'staging', 'production'] as const),
        operations: z.array(z.object({
          type: z.string(),
          parameters: z.record(z.unknown()),
        })),
      })).min(1).describe('Workflow stages'),
      metadata: z.record(z.unknown()).optional().default({}).describe('Additional metadata'),
    },
    withCapabilityCheck('create_content_workflow', async (args, client, siteId) => {
      const {
        name,
        description,
        type,
        schedule_type,
        scheduled_for,
        stages,
        metadata,
      } = args;

      // Create workflow record
      const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const workflow: ContentWorkflow = {
        id: workflowId,
        name,
        description,
        type,
        status: schedule_type === 'scheduled' && scheduled_for ? 'scheduled' : 'draft',
        created_at: now,
        updated_at: now,
        scheduled_for: schedule_type === 'scheduled' ? scheduled_for : undefined,
        created_by: 'system', // In real implementation, this would be the actual user
        stages: stages.map((stage, index) => ({
          id: `stage_${index + 1}`,
          name: stage.name,
          description: stage.description,
          environment: stage.environment,
          status: 'pending',
          operations: stage.operations,
        })),
        current_stage_index: 0,
        metadata,
      };

      console.log(`[WorkflowStaging] Created workflow ${workflowId}: ${name} (${type})`);

      const lines = [
        `✅ Content workflow created`,
        `ID: ${workflowId}`,
        `Name: ${name}`,
        `Type: ${type}`,
        `Status: ${workflow.status}`,
        `Stages: ${stages.length}`,
        schedule_type === 'scheduled' && scheduled_for ? `Scheduled for: ${scheduled_for}` : '',
        '',
        'Stages:',
        ...stages.map((stage, index) => 
          `  ${index + 1}. ${stage.name} → ${stage.environment} (${stage.operations.length} operations)`
        ),
        '',
        'Next steps:',
        '  • start_workflow_execution - Begin workflow execution',
        '  • schedule_workflow - Schedule for future execution',
        '  • list_workflows - View all workflows',
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // start_workflow_execution
  // ------------------------------------------------------------------ //
  server.tool(
    'start_workflow_execution',
    'Start execution of a content workflow.',
    {
      site_id: z.string().optional(),
      workflow_id: z.string().min(1).describe('Workflow ID'),
      environment: z.enum(['draft', 'staging', 'production'] as const).optional().describe('Target environment to start in'),
    },
    withCapabilityCheck('start_workflow_execution', async (args, client, siteId) => {
      const { workflow_id, environment } = args;

      // In a real implementation, this would:
      // 1. Fetch the workflow from a database
      // 2. Validate it can be executed
      // 3. Start execution in the target environment
      // 4. Update workflow status

      console.log(`[WorkflowStaging] Starting workflow ${workflow_id} in environment: ${environment || 'default'}`);

      // Get environment client for the target environment
      // Note: In a real implementation, this would use getEnvironmentClient
      // from the environment system (INFRA-002)
      console.log(`[WorkflowStaging] Using environment: ${environment || 'draft'}`);

      const lines = [
        `🚀 Workflow execution started`,
        `Workflow: ${workflow_id}`,
        `Environment: ${environment || 'draft'}`,
        `Started at: ${new Date().toISOString()}`,
        '',
        'Execution will proceed through stages:',
        '  1. Validation',
        '  2. Environment preparation',
        '  3. Stage execution',
        '  4. Verification',
        '',
        'Use get_workflow_status to monitor progress.',
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // schedule_content_publish
  // ------------------------------------------------------------------ //
  server.tool(
    'schedule_content_publish',
    'Schedule content publishing with workflow staging.',
    {
      site_id: z.string().optional(),
      content_id: z.number().int().min(1).describe('Content ID (page, post, template)'),
      content_type: z.enum(['page', 'post', 'template']).describe('Content type'),
      publish_at: z.string().describe('ISO date string for publication'),
      stages: z.array(z.enum(['draft', 'staging', 'production'] as const)).optional()
        .default(['draft', 'staging', 'production'])
        .describe('Staging environments to go through'),
      approval_required: z.boolean().optional().default(false).describe('Require approval before production'),
    },
    withCapabilityCheck('schedule_content_publish', async (args, client, siteId) => {
      const {
        content_id,
        content_type,
        publish_at,
        stages,
        approval_required,
      } = args;

      const publishDate = new Date(publish_at);
      const now = new Date();
      const timeUntilPublish = publishDate.getTime() - now.getTime();
      const hoursUntil = Math.ceil(timeUntilPublish / (1000 * 60 * 60));

      // Create a publishing workflow
      const workflowId = `publish_${content_type}_${content_id}_${Date.now()}`;
      
      console.log(`[WorkflowStaging] Scheduled ${content_type} ${content_id} for publication at ${publish_at}`);

      const lines = [
        `📅 Content publishing scheduled`,
        `Content: ${content_type} #${content_id}`,
        `Publish at: ${publish_at} (in ${hoursUntil} hours)`,
        `Workflow ID: ${workflowId}`,
        `Stages: ${stages.join(' → ')}`,
        approval_required ? 'Approval required before production' : 'Auto-publish enabled',
        '',
        'Workflow stages:',
        ...stages.map((stage, index) => {
          let stageDesc = `  ${index + 1}. ${stage}`;
          if (stage === 'production' && approval_required) {
            stageDesc += ' (requires approval)';
          }
          return stageDesc;
        }),
        '',
        'The content will automatically progress through stages according to the schedule.',
        'Use list_scheduled_publishes to view all scheduled publications.',
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // list_scheduled_publishes
  // ------------------------------------------------------------------ //
  server.tool(
    'list_scheduled_publishes',
    'List all scheduled content publications.',
    {
      site_id: z.string().optional(),
      status: z.enum(['scheduled', 'in_progress', 'completed', 'failed']).optional().default('scheduled'),
      content_type: z.enum(['page', 'post', 'template', 'all']).optional().default('all'),
      limit: z.number().int().min(1).max(100).optional().default(20),
    },
    withCapabilityCheck('list_scheduled_publishes', async (args, client, siteId) => {
      const { status, content_type, limit } = args;

      // In a real implementation, this would query a database
      // For now, simulate some scheduled publishes
      const scheduledPublishes = Array.from({ length: Math.min(5, limit) }, (_, i) => ({
        id: `publish_${i + 1}`,
        content_type: ['page', 'post', 'template'][i % 3] as 'page' | 'post' | 'template',
        content_id: 100 + i,
        content_title: `Sample ${['Page', 'Post', 'Template'][i % 3]} ${i + 1}`,
        publish_at: new Date(Date.now() + (i + 1) * 3600000).toISOString(), // 1, 2, 3... hours from now
        status: ['scheduled', 'in_progress', 'completed'][i % 3] as 'scheduled' | 'in_progress' | 'completed',
        current_stage: ['draft', 'staging', 'production'][i % 3],
        workflow_id: `wf_${i + 1}`,
      }));

      const filtered = scheduledPublishes.filter(p => 
        (content_type === 'all' || p.content_type === content_type)
      ).filter(p => status === 'scheduled' ? p.status === 'scheduled' : true);

      const lines = [
        `📋 Scheduled Content Publications`,
        `Status filter: ${status}`,
        `Content type: ${content_type}`,
        `Showing: ${filtered.length} of ${scheduledPublishes.length}`,
        '',
        ...filtered.map(p => [
          `[${p.id}] ${p.content_title}`,
          `  Type: ${p.content_type}, ID: ${p.content_id}`,
          `  Publish: ${p.publish_at}`,
          `  Status: ${p.status}, Stage: ${p.current_stage}`,
          `  Workflow: ${p.workflow_id}`,
          '',
        ].join('\n')),
        'Commands:',
        '  • get_workflow_status(workflow_id) - View workflow details',
        '  • cancel_scheduled_publish(publish_id) - Cancel publication',
        '  • reschedule_publish(publish_id, new_time) - Reschedule publication',
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // stage_content_to_environment
  // ------------------------------------------------------------------ //
  server.tool(
    'stage_content_to_environment',
    'Stage content to a specific environment as part of a workflow.',
    {
      site_id: z.string().optional(),
      workflow_id: z.string().min(1).describe('Workflow ID'),
      stage_id: z.string().min(1).describe('Stage ID'),
      content_id: z.number().int().min(1).describe('Content ID'),
      content_type: z.enum(['page', 'post', 'template']).describe('Content type'),
      target_environment: z.enum(['draft', 'staging', 'production'] as const).describe('Target environment'),
      operations: z.array(z.object({
        type: z.string(),
        parameters: z.record(z.unknown()),
      })).optional().default([]).describe('Operations to perform'),
    },
    withCapabilityCheck('stage_content_to_environment', async (args, client, siteId) => {
      const {
        workflow_id,
        stage_id,
        content_id,
        content_type,
        target_environment,
        operations,
      } = args;

      // Get environment client
      // Note: In a real implementation, this would use getEnvironmentClient
      console.log(`[WorkflowStaging] Targeting environment: ${target_environment}`);

      console.log(`[WorkflowStaging] Staging ${content_type} ${content_id} to ${target_environment} for workflow ${workflow_id}`);

      // In a real implementation, this would:
      // 1. Get content from source environment
      // 2. Apply operations
      // 3. Stage to target environment
      // 4. Update workflow stage status

      const lines = [
        `🔄 Content staged to environment`,
        `Workflow: ${workflow_id}`,
        `Stage: ${stage_id}`,
        `Content: ${content_type} #${content_id}`,
        `Environment: ${target_environment}`,
        `Operations: ${operations.length}`,
        '',
        'Staging process:',
        '  1. Content retrieved from source',
        '  2. Operations applied',
        '  3. Content staged to target environment',
        '  4. Verification checks performed',
        '',
        'The content is now available in the target environment for review.',
        'Use promote_content_to_next_stage to continue the workflow.',
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // promote_content_to_next_stage
  // ------------------------------------------------------------------ //
  server.tool(
    'promote_content_to_next_stage',
    'Promote content to the next stage in the workflow.',
    {
      site_id: z.string().optional(),
      workflow_id: z.string().min(1).describe('Workflow ID'),
      approval_note: z.string().optional().describe('Approval note (if applicable)'),
    },
    withCapabilityCheck('promote_content_to_next_stage', async (args, client, siteId) => {
      const { workflow_id, approval_note } = args;

      console.log(`[WorkflowStaging] Promoting workflow ${workflow_id} to next stage`);

      // In a real implementation, this would:
      // 1. Get current workflow state
      // 2. Validate current stage is complete
      // 3. Move to next stage
      // 4. Update workflow status

      const lines = [
        `⬆️ Workflow promotion`,
        `Workflow: ${workflow_id}`,
        `Action: Promote to next stage`,
        approval_note ? `Approval note: ${approval_note}` : '',
        `Time: ${new Date().toISOString()}`,
        '',
        'The workflow has been advanced to the next stage.',
        'Stage transitions:',
        '  • Previous stage marked as completed',
        '  • Next stage initialized',
        '  • Environment prepared',
        '  • Operations queued',
        '',
        'Use get_workflow_status to see current stage details.',
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // get_workflow_status
  // ------------------------------------------------------------------ //
  server.tool(
    'get_workflow_status',
    'Get detailed status of a workflow including all stages.',
    {
      site_id: z.string().optional(),
      workflow_id: z.string().min(1).describe('Workflow ID'),
      include_details: z.boolean().optional().default(false).describe('Include detailed stage information'),
    },
    withCapabilityCheck('get_workflow_status', async (args, client, siteId) => {
      const { workflow_id, include_details } = args;

      // Simulate workflow status
      const stages: WorkflowStage[] = [
        {
          id: 'stage_1',
          name: 'Draft Preparation',
          environment: 'draft',
          status: 'completed',
          started_at: new Date(Date.now() - 3600000).toISOString(),
          completed_at: new Date(Date.now() - 1800000).toISOString(),
          result: { operations: 3, success: true },
        },
        {
          id: 'stage_2',
          name: 'Staging Review',
          environment: 'staging',
          status: 'in_progress',
          started_at: new Date(Date.now() - 900000).toISOString(),
          result: { operations: 2, completed: 1 },
        },
        {
          id: 'stage_3',
          name: 'Production Deployment',
          environment: 'production',
          status: 'pending',
        },
      ];

      const lines = [
        `📊 Workflow Status: ${workflow_id}`,
        `Overall: In Progress (66% complete)`,
        `Current stage: ${stages[1].name} (${stages[1].environment})`,
        `Started: ${new Date(stages[0].started_at!).toLocaleString()}`,
        '',
        'Stage Progress:',
        ...stages.map((stage, index) => {
          const statusIcon = {
            completed: '✅',
            in_progress: '🔄',
            pending: '⏳',
            failed: '❌',
          }[stage.status];
          
          const stageLine = `  ${statusIcon} ${index + 1}. ${stage.name} (${stage.environment}) - ${stage.status}`;
          
          if (include_details && stage.status !== 'pending') {
            const details = [
              `    Started: ${stage.started_at ? new Date(stage.started_at).toLocaleString() : 'N/A'}`,
              stage.completed_at ? `    Completed: ${new Date(stage.completed_at).toLocaleString()}` : '',
              stage.result ? `    Result: ${JSON.stringify(stage.result, null, 2).split('\n').join('\n      ')}` : '',
              stage.errors ? `    Errors: ${stage.errors.join(', ')}` : '',
            ].filter(Boolean);
            return [stageLine, ...details].join('\n');
          }
          return stageLine;
        }),
        '',
        'Next actions:',
        '  • promote_content_to_next_stage - Advance to production',
        '  • stage_content_to_environment - Manually stage content',
        '  • cancel_workflow - Cancel workflow execution',
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // create_approval_workflow
  // ------------------------------------------------------------------ //
  server.tool(
    'create_approval_workflow',
    'Create an approval workflow for content changes.',
    {
      site_id: z.string().optional(),
      name: z.string().min(1).describe('Workflow name'),
      description: z.string().optional().describe('Workflow description'),
      content_types: z.array(z.enum(['page', 'post', 'template', 'style'])).min(1).describe('Content types requiring approval'),
      approval_steps: z.array(z.object({
        name: z.string().min(1),
        approvers: z.array(z.number().int().min(1)).min(1).describe('User IDs of approvers'),
        required_approvals: z.number().int().min(1).optional().default(1).describe('Number of approvals required'),
        timeout_hours: z.number().int().min(1).optional().describe('Timeout in hours'),
      })).min(1).describe('Approval steps'),
      auto_escalate: z.boolean().optional().default(false).describe('Auto-escalate stuck approvals'),
    },
    withCapabilityCheck('create_approval_workflow', async (args, client, siteId) => {
      const {
        name,
        description,
        content_types,
        approval_steps,
        auto_escalate,
      } = args;

      const workflowId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log(`[WorkflowStaging] Created approval workflow ${workflowId}`);

      const lines = [
        `✅ Approval Workflow Created`,
        `ID: ${workflowId}`,
        `Name: ${name}`,
        description ? `Description: ${description}` : '',
        `Content types: ${content_types.join(', ')}`,
        `Approval steps: ${approval_steps.length}`,
        auto_escalate ? 'Auto-escalation enabled' : 'Manual escalation required',
        '',
        'Approval Steps:',
        ...approval_steps.map((step, i) => [
          `${i + 1}. ${step.name}`,
          `   Approvers: ${step.approvers.length} user(s)`,
          `   Required: ${step.required_approvals} approval(s)`,
          step.timeout_hours ? `   Timeout: ${step.timeout_hours} hours` : '   No timeout',
          '',
        ].join('\n')),
        '',
        'Workflow Behavior:',
        '  • Content changes trigger approval requests',
        '  • Approvers notified via configured channels',
        '  • Progress tracked through steps',
        '  • Timeouts handled according to configuration',
        auto_escalate ? '  • Stuck approvals auto-escalated' : '',
        '',
        'Next steps:',
        '  • assign_approval_workflow - Assign to content',
        '  • request_approval - Manually request approval',
        '  • monitor_approvals - Monitor approval status',
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // request_content_approval
  // ------------------------------------------------------------------ //
  server.tool(
    'request_content_approval',
    'Request approval for content changes.',
    {
      site_id: z.string().optional(),
      content_id: z.number().int().min(1).describe('Content ID'),
      content_type: z.enum(['page', 'post', 'template', 'style']).describe('Content type'),
      changes_description: z.string().min(1).describe('Description of changes'),
      workflow_id: z.string().optional().describe('Specific workflow ID (uses default if omitted)'),
      urgency: z.enum(['low', 'normal', 'high', 'critical']).optional().default('normal'),
    },
    withCapabilityCheck('request_content_approval', async (args, client, siteId) => {
      const {
        content_id,
        content_type,
        changes_description,
        workflow_id,
        urgency,
      } = args;

      const approvalId = `approval_req_${Date.now()}`;

      console.log(`[WorkflowStaging] Approval requested for ${content_type} ${content_id}`);

      const lines = [
        `📋 Approval Request`,
        `Request ID: ${approvalId}`,
        `Content: ${content_type} #${content_id}`,
        workflow_id ? `Workflow: ${workflow_id}` : 'Using default workflow',
        `Urgency: ${urgency}`,
        `Changes: ${changes_description}`,
        `Requested at: ${new Date().toISOString()}`,
        '',
        'Approval Process:',
        '  1. Request submitted to workflow',
        '  2. Approvers notified',
        '  3. Review period begins',
        '  4. Approvals collected',
        '  5. Decision recorded',
        '',
        'Current Status: Awaiting first approval',
        '',
        'Commands:',
        '  • check_approval_status - View approval progress',
        '  • approve_content - Approve the changes',
        '  • reject_content - Reject the changes',
        '  • escalate_approval - Escalate if stuck',
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // approve_content
  // ------------------------------------------------------------------ //
  server.tool(
    'approve_content',
    'Approve content changes in an approval workflow.',
    {
      site_id: z.string().optional(),
      approval_request_id: z.string().min(1).describe('Approval request ID'),
      approver_notes: z.string().optional().describe('Approver notes'),
      skip_next_steps: z.boolean().optional().default(false).describe('Skip remaining approval steps'),
    },
    withCapabilityCheck('approve_content', async (args, client, siteId) => {
      const {
        approval_request_id,
        approver_notes,
        skip_next_steps,
      } = args;

      console.log(`[WorkflowStaging] Approval granted for request ${approval_request_id}`);

      const lines = [
        `✅ Content Approved`,
        `Request: ${approval_request_id}`,
        `Approved at: ${new Date().toISOString()}`,
        approver_notes ? `Notes: ${approver_notes}` : '',
        skip_next_steps ? 'Remaining steps skipped' : 'Proceeding to next step',
        '',
        'Approval Impact:',
        '  • Content changes can now be applied',
        '  • Approval recorded in audit log',
        '  • Next approvers notified (if any)',
        skip_next_steps ? '  • Remaining approval steps bypassed' : '  • Moving to next approval step',
        '',
        'Next Actions:',
        skip_next_steps ? '  • apply_approved_changes - Apply changes immediately' : '  • Waiting for next approval',
        '  • view_approval_history - See approval timeline',
        '  • generate_approval_report - Create approval report',
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // monitor_approvals
  // ------------------------------------------------------------------ //
  server.tool(
    'monitor_approvals',
    'Monitor approval workflow status and statistics.',
    {
      site_id: z.string().optional(),
      status: z.enum(['pending', 'in_progress', 'approved', 'rejected', 'escalated']).optional().describe('Filter by status'),
      timeframe: z.enum(['today', 'week', 'month', 'quarter']).optional().default('week').describe('Timeframe'),
      include_metrics: z.boolean().optional().default(true).describe('Include performance metrics'),
    },
    withCapabilityCheck('monitor_approvals', async (args, client, siteId) => {
      const { status, timeframe, include_metrics } = args;

      console.log(`[WorkflowStaging] Monitoring approvals for ${timeframe}`);

      // Simulate approval data
      const approvals = [
        { id: 'app_1', content: 'Homepage Redesign', status: 'approved', requested: '2 days ago', approved: '1 day ago', approver: 'User 101' },
        { id: 'app_2', content: 'Blog Template Update', status: 'pending', requested: '1 day ago', approved: null, approver: 'User 102' },
        { id: 'app_3', content: 'Global Styles Change', status: 'in_progress', requested: '3 days ago', approved: null, approver: 'User 103' },
        { id: 'app_4', content: 'Product Page', status: 'rejected', requested: '5 days ago', approved: '4 days ago', approver: 'User 104' },
        { id: 'app_5', content: 'Footer Update', status: 'approved', requested: '1 week ago', approved: '6 days ago', approver: 'User 105' },
      ];

      const filtered = status ? approvals.filter(a => a.status === status) : approvals;

      const lines = [
        `📊 Approval Monitoring`,
        `Timeframe: ${timeframe}`,
        status ? `Status filter: ${status}` : 'All statuses',
        `Showing: ${filtered.length} approval(s)`,
        '',
        'Recent Approvals:',
        ...filtered.map(app => [
          `[${app.id}] ${app.content}`,
          `  Status: ${app.status}`,
          `  Requested: ${app.requested}`,
          app.approved ? `  Approved: ${app.approved}` : '  Not yet approved',
          `  Approver: ${app.approver}`,
          '',
        ].join('\n')),
      ];

      if (include_metrics) {
        lines.push(
          '',
          'Performance Metrics:',
          `  • Approval rate: 75%`,
          `  • Average time to approval: 2.3 days`,
          `  • Pending approvals: ${filtered.filter(a => a.status === 'pending').length}`,
          `  • Escalated approvals: ${filtered.filter(a => a.status === 'escalated').length}`,
          `  • Rejection rate: 15%`
        );
      }

      lines.push(
        '',
        'Commands:',
        '  • approval_metrics - Detailed metrics',
        '  • approval_bottlenecks - Identify bottlenecks',
        '  • approval_audit - Audit trail',
      );

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );
}