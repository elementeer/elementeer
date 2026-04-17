import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { GOVERNANCE_LEVELS } from '../product-tiers.js';

/**
 * Form field specification schema.
 */
const formFieldSchema = z.object({
  type: z.enum(['text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'date', 'number', 'tel', 'url', 'file', 'hidden', 'acceptance'])
    .describe('Field type'),
  label: z.string().describe('Field label shown to users'),
  required: z.boolean().default(false).describe('Whether field is required'),
  placeholder: z.string().optional().describe('Placeholder text'),
  options: z.array(z.string()).optional().describe('Options for select/radio/checkbox fields'),
  file_types: z.array(z.string()).optional().describe('Allowed file types (e.g., ".pdf", ".jpg")'),
  max_file_size: z.number().optional().describe('Maximum file size in MB'),
  id: z.string().optional().describe('Unique field ID (auto-generated if omitted)'),
});

const conditionalLogicSchema = z.object({
  field: z.string().describe('Field ID that triggers the rule'),
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'greater', 'less']).describe('Comparison operator'),
  value: z.string().describe('Value to compare against'),
  action: z.enum(['show', 'hide']).describe('Action to perform on target field'),
  target: z.string().describe('Target field ID'),
});

const stepSchema = z.object({
  title: z.string().describe('Step title'),
  field_ids: z.array(z.string()).describe('Field IDs belonging to this step'),
});

const marketingIntegrationSchema = z.object({
  type: z.enum(['mailchimp', 'hubspot', 'webhook']).describe('Integration type'),
  mailchimp_list: z.string().optional().describe('Mailchimp audience/list ID'),
  mailchimp_tags: z.string().optional().describe('Comma-separated tags to apply'),
  hubspot_form_id: z.string().optional().describe('HubSpot form GUID'),
  hubspot_portal_id: z.string().optional().describe('HubSpot portal ID'),
  webhook_url: z.string().optional().describe('Webhook URL for POST requests'),
  webhook_headers: z.record(z.string()).optional().describe('Custom headers for webhook'),
});

/**
 * Elementor form widget JSON structure.
 * Based on Elementor Pro Form widget structure.
 */
interface ElementorFormWidget {
  id: string;
  elType: 'widget';
  settings: {
    form_name?: string;
    form_fields: Array<{
      id: string;
      type: string;
      field_label: string;
      placeholder: string;
      required: boolean;
      width: string;
      field_options?: string; // Elementor expects newline-separated string
      allow_multiple?: boolean;
      allowed_file_types?: string; // Comma-separated file extensions
      max_files?: number;
      acceptance_text?: string;
    }>;
    submit_actions: Array<'email' | 'redirect'>;
    email_to?: string;
    email_subject?: string;
    email_from?: string;
    email_from_name?: string;
    email_reply_to?: string;
    email_content?: string;
    redirect_url?: string;
    success_message?: string;
    custom_messages?: Record<string, string>;
  };
  elements: never[]; // Form widget has no child elements
}

/**
 * Advanced Elementor form widget JSON structure with multi-step, conditional logic, and marketing integrations.
 */
interface ElementorAdvancedFormWidget extends ElementorFormWidget {
  settings: ElementorFormWidget['settings'] & {
    step_type?: 'none' | 'progress_bar' | 'steps';
    step_next_label?: string;
    step_previous_label?: string;
    step_icon?: string;
    steps?: Array<{
      step_title: string;
      step_subtitle?: string;
      fields: string[]; // field IDs
    }>;
    conditional_logic?: Array<{
      field: string; // field ID that triggers the rule
      operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less';
      value: string;
      action: 'show' | 'hide';
      target: string; // target field ID
    }>;
    // Marketing integration settings
    mailchimp_list?: string;
    mailchimp_tags?: string;
    hubspot_form_id?: string;
    hubspot_portal_id?: string;
    webhook_url?: string;
    webhook_headers?: Record<string, string>;
    // Additional submit actions
    submit_actions: Array<'email' | 'redirect' | 'mailchimp' | 'hubspot' | 'webhook'>;
  };
}

/**
 * Generate Elementor Form widget JSON from field specifications.
 */
function generateFormWidget(
  fields: Array<z.infer<typeof formFieldSchema>>,
  options?: {
    formName?: string;
    emailTo?: string;
    redirectUrl?: string;
    successMessage?: string;
  },
): ElementorFormWidget {
  const formFields = fields.map((field, index) => {
    const fieldId = field.id || `field_${index + 1}`;
    const baseField = {
      id: fieldId,
      type: field.type,
      field_label: field.label,
      placeholder: field.placeholder || '',
      required: field.required,
      width: '100', // Default width
    };

    // Add type-specific settings
    const extraProps: Record<string, unknown> = {};
    
    // Select/radio/checkbox options
    if (['select', 'radio', 'checkbox'].includes(field.type) && field.options?.length) {
      extraProps.field_options = field.options.join('\n');
      if (field.type === 'checkbox') {
        extraProps.allow_multiple = true;
      }
    }
    
    // File upload settings
    if (field.type === 'file') {
      if (field.file_types?.length) {
        extraProps.allowed_file_types = field.file_types.join(',');
      }
      if (field.max_file_size) {
        extraProps.max_files = field.max_file_size;
      }
    }
    
    // Acceptance field (terms checkbox)
    if (field.type === 'acceptance') {
      extraProps.acceptance_text = field.placeholder || 'I agree to the terms & conditions';
    }
    
    return {
      ...baseField,
      ...extraProps,
    };
  });

  const widgetId = `elementor-form-${Date.now()}`;

  return {
    id: widgetId,
    elType: 'widget',
    settings: {
      form_name: options?.formName || 'Contact Form',
      form_fields: formFields,
      submit_actions: options?.emailTo ? ['email'] : options?.redirectUrl ? ['redirect'] : ['email'],
      email_to: options?.emailTo || '',
      email_subject: `New submission from ${options?.formName || 'Contact Form'}`,
      email_from: '{site_admin_email}',
      email_from_name: '{site_name}',
      email_reply_to: '{email}', // Dynamic tag for user's email field
      email_content: generateEmailContent(fields),
      redirect_url: options?.redirectUrl || '',
      success_message: options?.successMessage || 'Thank you! Your message has been sent.',
      custom_messages: {
        required: 'This field is required.',
        invalid_email: 'Please enter a valid email address.',
        invalid_url: 'Please enter a valid URL.',
        invalid_number: 'Please enter a valid number.',
      },
    },
    elements: [],
  };
}

/**
 * Generate advanced Elementor Form widget JSON with multi-step, conditional logic, and marketing integrations.
 */
function generateAdvancedFormWidget(
  fields: Array<z.infer<typeof formFieldSchema>>,
  options?: {
    formName?: string;
    emailTo?: string;
    redirectUrl?: string;
    successMessage?: string;
    steps?: Array<z.infer<typeof stepSchema>>;
    conditionalLogic?: Array<z.infer<typeof conditionalLogicSchema>>;
    marketingIntegrations?: Array<z.infer<typeof marketingIntegrationSchema>>;
  },
): ElementorAdvancedFormWidget {
  // First generate basic form widget
  const basicWidget = generateFormWidget(fields, options);
  
  const widgetId = `elementor-advanced-form-${Date.now()}`;
  
  // Determine submit actions based on marketing integrations
  const submitActions: Array<'email' | 'redirect' | 'mailchimp' | 'hubspot' | 'webhook'> = ['email'];
  if (options?.emailTo) submitActions.push('email');
  if (options?.redirectUrl) submitActions.push('redirect');
  
  const marketingSettings: Record<string, unknown> = {};
  if (options?.marketingIntegrations) {
    for (const integration of options.marketingIntegrations) {
      if (integration.type === 'mailchimp' && integration.mailchimp_list) {
        submitActions.push('mailchimp');
        marketingSettings.mailchimp_list = integration.mailchimp_list;
        if (integration.mailchimp_tags) {
          marketingSettings.mailchimp_tags = integration.mailchimp_tags;
        }
      } else if (integration.type === 'hubspot' && integration.hubspot_form_id) {
        submitActions.push('hubspot');
        marketingSettings.hubspot_form_id = integration.hubspot_form_id;
        if (integration.hubspot_portal_id) {
          marketingSettings.hubspot_portal_id = integration.hubspot_portal_id;
        }
      } else if (integration.type === 'webhook' && integration.webhook_url) {
        submitActions.push('webhook');
        marketingSettings.webhook_url = integration.webhook_url;
        if (integration.webhook_headers) {
          marketingSettings.webhook_headers = integration.webhook_headers;
        }
      }
    }
  }
  
  // Build steps structure if provided
  const steps = options?.steps?.map(step => ({
    step_title: step.title,
    fields: step.field_ids,
  }));
  
  // Build conditional logic if provided
  const conditionalLogic = options?.conditionalLogic?.map(logic => ({
    field: logic.field,
    operator: logic.operator,
    value: logic.value,
    action: logic.action,
    target: logic.target,
  }));
  
  // Extract basic settings without submit_actions to avoid type conflict
  const { submit_actions: _, ...basicSettings } = basicWidget.settings;
  
  return {
    ...basicWidget,
    id: widgetId,
    settings: {
      ...basicSettings,
      step_type: steps && steps.length > 1 ? 'progress_bar' : 'none',
      step_next_label: steps && steps.length > 1 ? 'Next' : undefined,
      step_previous_label: steps && steps.length > 1 ? 'Previous' : undefined,
      steps,
      conditional_logic: conditionalLogic,
      ...marketingSettings,
      submit_actions: Array.from(new Set(submitActions)) as Array<'email' | 'redirect' | 'mailchimp' | 'hubspot' | 'webhook'>,
    },
  } as ElementorAdvancedFormWidget;
}

/**
 * Generate email content template based on form fields.
 */
function generateEmailContent(fields: Array<z.infer<typeof formFieldSchema>>): string {
  const fieldLines = fields.map(field => {
    const label = field.label;
    return `[${label}]: {${field.id || field.label.toLowerCase().replace(/\s+/g, '_')}}`;
  });

  return [
    'New form submission:',
    '',
    ...fieldLines,
    '',
    '---',
    'Sent from {site_url}',
  ].join('\n');
}

// ------------------------------------------------------------------ //
// Form Migration Utilities (FORM-006)
// ------------------------------------------------------------------ //

/**
 * Parse Contact Form 7 shortcode and convert to Elementor form fields.
 * Returns object with fields and warnings.
 */
function parseCf7Shortcode(shortcode: string): { fields: Array<z.infer<typeof formFieldSchema>>; warnings: string[] } {
  const fields: Array<z.infer<typeof formFieldSchema>> = [];
  const warnings: string[] = [];
  
  // Simple CF7 tag parsing
  // CF7 tags look like: [text* your-name], [email* your-email], [textarea your-message]
  const tagPattern = /\[([^\]]+)\]/g;
  let match;
  
  while ((match = tagPattern.exec(shortcode)) !== null) {
    const tagContent = match[1].trim();
    const parts = tagContent.split(/\s+/);
    const tagType = parts[0];
    const fieldName = parts[1] || 'field';
    
    // Map CF7 types to Elementor types
    let elementorType: z.infer<typeof formFieldSchema>['type'];
    let options: string[] | undefined;
    
    switch (true) {
      case tagType.startsWith('text'):
      case tagType.startsWith('email'):
      case tagType.startsWith('tel'):
      case tagType.startsWith('url'):
      case tagType.startsWith('date'):
      case tagType.startsWith('number'):
        elementorType = tagType.replace('*', '').split('_')[0] as any;
        break;
      case tagType.startsWith('textarea'):
        elementorType = 'textarea';
        break;
      case tagType.startsWith('select'):
        elementorType = 'select';
        // Simple option extraction: [select menu-1 "Option 1" "Option 2"]
        options = parts.slice(2).map(opt => opt.replace(/["']/g, '')).filter(opt => opt);
        break;
      case tagType.startsWith('checkbox'):
        elementorType = 'checkbox';
        options = parts.slice(2).map(opt => opt.replace(/["']/g, '')).filter(opt => opt);
        break;
      case tagType.startsWith('radio'):
        elementorType = 'radio';
        options = parts.slice(2).map(opt => opt.replace(/["']/g, '')).filter(opt => opt);
        break;
      case tagType.startsWith('acceptance'):
        elementorType = 'acceptance';
        break;
      case tagType.startsWith('file'):
        elementorType = 'file';
        break;
      default:
        warnings.push(`Unsupported CF7 field type: ${tagType}`);
        continue;
    }
    
    const required = tagType.includes('*');
    const label = fieldName.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    fields.push({
      type: elementorType,
      label,
      required,
      placeholder: '',
      options,
      id: fieldName,
    });
  }
  
  return { fields, warnings };
}

/**
 * Convert WPForms JSON export to Elementor form fields.
 * Returns object with fields and warnings.
 */
function parseWpFormsJson(wpformsData: any): { fields: Array<z.infer<typeof formFieldSchema>>; warnings: string[] } {
  const fields: Array<z.infer<typeof formFieldSchema>> = [];
  const warnings: string[] = [];
  
  if (!wpformsData || !wpformsData.fields) {
    throw new Error('Invalid WPForms data: missing fields');
  }
  
  // WPForms field type mapping
  const typeMap: Record<string, z.infer<typeof formFieldSchema>['type']> = {
    'text': 'text',
    'email': 'email',
    'textarea': 'textarea',
    'select': 'select',
    'checkbox': 'checkbox',
    'radio': 'radio',
    'phone': 'tel',
    'address': 'text',
    'url': 'url',
    'date': 'date',
    'number': 'number',
    'file-upload': 'file',
    'likert': 'radio', // approximate
    'rating': 'radio', // approximate
  };
  
  Object.values(wpformsData.fields).forEach((field: any) => {
    const elementorType = typeMap[field.type] || 'text';
    
    if (!typeMap[field.type]) {
      warnings.push(`Unmapped WPForms field type: ${field.type} (mapped to text)`);
    }
    
    const options = field.choices?.map((choice: any) => choice.label || choice.value) || undefined;
    
    fields.push({
      type: elementorType,
      label: field.label || `Field ${field.id}`,
      required: field.required === '1' || field.required === true,
      placeholder: field.placeholder || field.description || '',
      options,
      id: `field_${field.id}`,
    });
  });
  
  return { fields, warnings };
}

/**
 * Convert Gravity Forms JSON export to Elementor form fields.
 * Returns object with fields and warnings.
 */
function parseGravityFormsJson(gravityData: any): { fields: Array<z.infer<typeof formFieldSchema>>; warnings: string[] } {
  const fields: Array<z.infer<typeof formFieldSchema>> = [];
  const warnings: string[] = [];
  
  if (!gravityData || !gravityData.fields) {
    throw new Error('Invalid Gravity Forms data: missing fields');
  }
  
  // Gravity Forms field type mapping
  const typeMap: Record<string, z.infer<typeof formFieldSchema>['type']> = {
    'text': 'text',
    'textarea': 'textarea',
    'select': 'select',
    'multiselect': 'select',
    'checkbox': 'checkbox',
    'radio': 'radio',
    'email': 'email',
    'phone': 'tel',
    'number': 'number',
    'date': 'date',
    'time': 'text', // No time field in Elementor
    'website': 'url',
    'fileupload': 'file',
    'list': 'textarea', // Approximate
    'hidden': 'hidden',
    'consent': 'acceptance',
  };
  
  gravityData.fields.forEach((field: any) => {
    const elementorType = typeMap[field.type] || 'text';
    
    if (!typeMap[field.type]) {
      warnings.push(`Unmapped Gravity Forms field type: ${field.type} (mapped to text)`);
    }
    
    // Handle choices/inputs for select, radio, checkbox
    let options: string[] | undefined;
    if (field.choices && Array.isArray(field.choices)) {
      options = field.choices.map((choice: any) => choice.text || choice.value);
    } else if (field.inputs && Array.isArray(field.inputs)) {
      options = field.inputs.map((input: any) => input.label || `Option ${input.id}`);
    }
    
    fields.push({
      type: elementorType,
      label: field.label || field.adminLabel || `Field ${field.id}`,
      required: field.isRequired,
      placeholder: field.placeholder || field.description || '',
      options,
      id: `field_${field.id}`,
    });
  });
  
  return { fields, warnings };
}

export function registerFormTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {

  // ------------------------------------------------------------------ //
  // create_form_light (FORM-004)
  // ------------------------------------------------------------------ //
  server.tool(
    'create_form_light',
    'Generate Elementor Form widget JSON from a form specification. Free tier form creation. Input: array of field objects with type, label, required flag, and optional options. Output is valid Elementor form widget JSON that can be inserted via update_page_data or create_template.',
    {
      site_id: z.string().optional(),
      fields: z.array(formFieldSchema).min(1).max(20)
                .describe('Form field specifications'),
      form_name: z.string().optional().default('Contact Form')
                .describe('Form name for identification'),
      email_to: z.string().email().optional()
                .describe('Email address to send submissions to (optional)'),
      redirect_url: z.string().url().optional()
                .describe('URL to redirect after submission (optional)'),
      success_message: z.string().optional()
                .describe('Custom success message (optional)'),
      note: z.string().optional()
                .describe('Optional note for queued changes (auto-queued for L2 governance)'),
      consent: z.boolean().optional()
                .describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async ({ site_id, fields, form_name, email_to, redirect_url, success_message, note, consent }) => {
      const client = getClient(site_id);
      const toolName = 'create_form_light';
      const level = GOVERNANCE_LEVELS[toolName] || 'L0';
      
      // L3 requires explicit consent
      if (level === 'L3' && consent !== true) {
        return {
          content: [{
            type: 'text',
            text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
          }],
        };
      }
      
      // Generate the form widget JSON
      const formWidget = generateFormWidget(fields, {
        formName: form_name,
        emailTo: email_to,
        redirectUrl: redirect_url,
        successMessage: success_message,
      });
      
      // For L2/L3, queue the creation
      if (level === 'L2' || level === 'L3') {
        const change = await client.createChange({
          operation: 'create_template', // We'll create a template with the form
          params: {
            title: `${form_name} (Form)`,
            type: 'widget',
            elementor_data: [formWidget],
            status: 'draft',
          },
          note: note || `Form "${form_name}" auto-queued by governance level ${level}`,
        });

        const lines = [
          `🟡 Form template queued for review (governance level ${level})`,
          `   ID: ${change.id}`,
          `   Operation: create_template`,
          `   Form name: ${form_name}`,
          `   Fields: ${fields.length} field(s)`,
          note ? `   Note: ${note}` : '',
          '',
          'Next steps:',
          '  1. review_change(change_id, "approve") — approve it',
          '  2. apply_change(change_id)             — create the form template',
          '  Or: review_change(change_id, "reject") to discard.',
          '',
          'After approval, use update_page_data to insert the form into a page.',
        ].filter(Boolean);

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
      
      // L0/L1: Return the JSON directly
      const lines = [
        `✅ Form "${form_name}" generated`,
        `   Fields: ${fields.length} field(s)`,
        `   Email notification: ${email_to ? 'Yes' : 'No'}`,
        `   Redirect: ${redirect_url || 'None'}`,
        '',
        '## Elementor Form Widget JSON',
        '```json',
        JSON.stringify([formWidget], null, 2),
        '```',
        '',
        '## Usage',
        '1. Copy the JSON above',
        '2. Use update_page_data(page_id, elementor_data: JSON) to insert into a page',
        '3. Or use create_template to save as a reusable template',
      ];

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ------------------------------------------------------------------ //
  // list_forms (FORM-008)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_forms',
    'List forms across active form plugins (Gravity Forms, Contact Form 7, WPForms, Ninja Forms).',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      plugin: z.enum(['gravityforms', 'contact-form-7', 'wpforms', 'ninja-forms', 'all']).optional().default('all').describe('Specific plugin to list forms from'),
      page: z.number().optional().default(1).describe('Page number'),
      per_page: z.number().optional().default(20).describe('Items per page'),
    },
    async ({ site_id, plugin, page, per_page }) => {
      try {
        const client = getClient(site_id);
        const forms = await client.listForms({ plugin: plugin === 'all' ? undefined : plugin, page, per_page });

        const lines: string[] = [
          '# Forms',
          `**Plugin**: ${plugin}`,
          `**Total forms**: ${forms.total || forms.length}`,
        ];

        if (forms.forms && forms.forms.length > 0) {
          lines.push('\n## Forms');
          lines.push('| ID | Title | Fields | Entries | Shortcode |');
          lines.push('|----|-------|--------|---------|-----------|');
          for (const form of forms.forms.slice(0, 20)) {
            lines.push(`| ${form.id} | ${form.title} | ${form.field_count || '—'} | ${form.entry_count || '—'} | ${form.shortcode || '—'} |`);
          }
          if (forms.forms.length > 20) {
            lines.push(`| … ${forms.forms.length - 20} more … |`);
          }
        } else {
          lines.push('\nNo forms found.');
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error listing forms: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}
      
      // Generate the advanced form widget JSON
      const formWidget = generateAdvancedFormWidget(fields, {
        formName: form_name,
        emailTo: email_to,
        redirectUrl: redirect_url,
        successMessage: success_message,
        steps,
        conditionalLogic: conditional_logic,
        marketingIntegrations: marketing_integrations,
      });
      
      // For L2/L3, queue the creation
      if (level === 'L2' || level === 'L3') {
        const change = await client.createChange({
          operation: 'create_template', // We'll create a template with the form
          params: {
            title: `${form_name} (Advanced Form)`,
            type: 'widget',
            elementor_data: [formWidget],
            status: 'draft',
          },
          note: note || `Advanced form "${form_name}" auto-queued by governance level ${level}`,
        });

        const lines = [
          `🟡 Advanced form template queued for review (governance level ${level})`,
          `   ID: ${change.id}`,
          `   Operation: create_template`,
          `   Form name: ${form_name}`,
          `   Fields: ${fields.length} field(s)`,
          steps ? `   Steps: ${steps.length} step(s)` : '',
          conditional_logic ? `   Conditional logic rules: ${conditional_logic.length}` : '',
          marketing_integrations ? `   Marketing integrations: ${marketing_integrations.length}` : '',
          note ? `   Note: ${note}` : '',
          '',
          'Next steps:',
          '  1. review_change(change_id, "approve") — approve it',
          '  2. apply_change(change_id)             — create the form template',
          '  Or: review_change(change_id, "reject") to discard.',
          '',
          'After approval, use update_page_data to insert the form into a page.',
        ].filter(Boolean);

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
      
      // L0/L1: Return the JSON directly (should not happen as advanced is L2)
      const lines = [
        `✅ Advanced form "${form_name}" generated`,
        `   Fields: ${fields.length} field(s)`,
        `   Email notification: ${email_to ? 'Yes' : 'No'}`,
        `   Redirect: ${redirect_url || 'None'}`,
        steps ? `   Steps: ${steps.length} step(s)` : '',
        conditional_logic ? `   Conditional logic rules: ${conditional_logic.length}` : '',
        marketing_integrations ? `   Marketing integrations: ${marketing_integrations.length}` : '',
        '',
        '## Elementor Advanced Form Widget JSON',
        '```json',
        JSON.stringify([formWidget], null, 2),
        '```',
        '',
        '## Usage',
        '1. Copy the JSON above',
        '2. Use update_page_data(page_id, elementor_data: JSON) to insert into a page',
        '3. Or use create_template to save as a reusable template',
      ].filter(Boolean);

       return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ------------------------------------------------------------------ //
  // list_form_templates (FORM-007)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_form_templates',
    'List pre-built Elementor form templates: Contact, Newsletter Signup, Quote Request, Booking Inquiry, Event Registration, Survey, Feedback. Each template is optimized for conversion and uses Global Typography/Colors.',
    {
      site_id: z.string().optional(),
      category: z.enum(['all', 'contact', 'lead-generation', 'feedback', 'registration']).optional().default('all')
                .describe('Filter templates by category'),
    },
    async ({ site_id, category }) => {
      const client = getClient(site_id);
      
      // Define form templates (7 minimum as per FORM-007)
      const formTemplates = [
        {
          id: 'contact-form',
          title: 'Contact Form',
          description: 'Standard contact form with name, email, message, and optional phone number',
          category: 'contact',
          fields: [
            { type: 'text', label: 'Name', required: true, placeholder: 'Your name' },
            { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
            { type: 'tel', label: 'Phone', required: false, placeholder: 'Your phone number' },
            { type: 'textarea', label: 'Message', required: true, placeholder: 'How can we help you?' },
          ],
          recommended_email_to: '{site_admin_email}',
          recommended_success_message: 'Thank you! We\'ll get back to you soon.',
        },
        {
          id: 'newsletter-signup',
          title: 'Newsletter Signup',
          description: 'Simple newsletter subscription form with email and optional name',
          category: 'lead-generation',
          fields: [
            { type: 'text', label: 'First Name', required: false, placeholder: 'First name' },
            { type: 'text', label: 'Last Name', required: false, placeholder: 'Last name' },
            { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
            { type: 'checkbox', label: 'Interests', required: false, options: ['Technology', 'Marketing', 'Design', 'Business'] },
          ],
          recommended_email_to: '{site_admin_email}',
          recommended_success_message: 'Thank you for subscribing!',
        },
        {
          id: 'quote-request',
          title: 'Quote Request',
          description: 'Detailed quote request form for service businesses',
          category: 'lead-generation',
          fields: [
            { type: 'text', label: 'Company Name', required: true, placeholder: 'Your company' },
            { type: 'text', label: 'Contact Person', required: true, placeholder: 'Your name' },
            { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
            { type: 'tel', label: 'Phone', required: true, placeholder: 'Your phone number' },
            { type: 'select', label: 'Service Type', required: true, options: ['Web Design', 'Development', 'Consulting', 'Maintenance', 'Other'] },
            { type: 'textarea', label: 'Project Details', required: true, placeholder: 'Tell us about your project...' },
            { type: 'date', label: 'Desired Start Date', required: false },
          ],
          recommended_email_to: '{site_admin_email}',
          recommended_success_message: 'Thank you! We\'ll send you a quote within 24 hours.',
        },
        {
          id: 'booking-inquiry',
          title: 'Booking Inquiry',
          description: 'Appointment or booking request form',
          category: 'registration',
          fields: [
            { type: 'text', label: 'Name', required: true, placeholder: 'Your name' },
            { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
            { type: 'tel', label: 'Phone', required: true, placeholder: 'Your phone number' },
            { type: 'date', label: 'Preferred Date', required: true },
            { type: 'select', label: 'Preferred Time', required: true, options: ['Morning (9-12)', 'Afternoon (12-5)', 'Evening (5-8)'] },
            { type: 'select', label: 'Service', required: true, options: ['Consultation', 'Demo', 'Training', 'Support'] },
            { type: 'textarea', label: 'Additional Notes', required: false, placeholder: 'Any special requirements?' },
          ],
          recommended_email_to: '{site_admin_email}',
          recommended_success_message: 'Booking request received! We\'ll confirm shortly.',
        },
        {
          id: 'event-registration',
          title: 'Event Registration',
          description: 'Event registration form with attendee details',
          category: 'registration',
          fields: [
            { type: 'text', label: 'Full Name', required: true, placeholder: 'Your full name' },
            { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
            { type: 'text', label: 'Job Title', required: false, placeholder: 'Your position' },
            { type: 'text', label: 'Company', required: false, placeholder: 'Your company' },
            { type: 'select', label: 'Ticket Type', required: true, options: ['General Admission', 'VIP', 'Student', 'Group (5+)'] },
            { type: 'number', label: 'Number of Tickets', required: true, placeholder: '1' },
            { type: 'checkbox', label: 'Dietary Requirements', required: false, options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Other'] },
          ],
          recommended_email_to: '{site_admin_email}',
          recommended_success_message: 'Registration confirmed! Check your email for details.',
        },
        {
          id: 'survey-form',
          title: 'Survey Form',
          description: 'Customer feedback or survey form',
          category: 'feedback',
          fields: [
            { type: 'text', label: 'Name', required: false, placeholder: 'Optional' },
            { type: 'email', label: 'Email', required: false, placeholder: 'Optional' },
            { type: 'select', label: 'Overall Satisfaction', required: true, options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'] },
            { type: 'radio', label: 'Would you recommend us?', required: true, options: ['Yes', 'No', 'Maybe'] },
            { type: 'textarea', label: 'What could we improve?', required: false, placeholder: 'Your suggestions...' },
            { type: 'textarea', label: 'Additional Comments', required: false, placeholder: 'Any other feedback?' },
          ],
          recommended_email_to: '{site_admin_email}',
          recommended_success_message: 'Thank you for your feedback!',
        },
        {
          id: 'feedback-form',
          title: 'Feedback Form',
          description: 'General feedback form for products or services',
          category: 'feedback',
          fields: [
            { type: 'text', label: 'Name', required: false, placeholder: 'Optional' },
            { type: 'email', label: 'Email', required: false, placeholder: 'Optional' },
            { type: 'select', label: 'Feedback Type', required: true, options: ['Bug Report', 'Feature Request', 'General Feedback', 'Complaint'] },
            { type: 'textarea', label: 'Feedback', required: true, placeholder: 'Please describe your feedback...' },
            { type: 'checkbox', label: 'Follow-up Options', required: false, options: ['Email me updates', 'Contact me for more details', 'Add me to beta testing'] },
          ],
          recommended_email_to: '{site_admin_email}',
          recommended_success_message: 'Thank you for your feedback!',
        },
      ];

      // Filter by category if specified
      const filteredTemplates = category === 'all' 
        ? formTemplates 
        : formTemplates.filter(t => t.category === category);

      // Generate output
      const lines = [
        `Form Template Library (${filteredTemplates.length} templates)`,
        '',
        ...filteredTemplates.map(t => [
          `### ${t.title}`,
          `  ID: ${t.id}`,
          `  Category: ${t.category}`,
          `  Description: ${t.description}`,
          `  Fields: ${t.fields.length} field(s)`,
          `  Recommended email: ${t.recommended_email_to}`,
          '',
          '  **Usage:**',
          `  create_form_light(fields: ${JSON.stringify(t.fields)}, form_name: "${t.title}", email_to: "${t.recommended_email_to}", success_message: "${t.recommended_success_message}")`,
          '',
        ].join('\n')),
        '',
        '**How to use:**',
        '1. Copy the create_form_light command for your chosen template',
        '2. Run it to generate Elementor form widget JSON',
        '3. Use update_page_data to insert into a page, or create_template to save as reusable template',
      ];

       return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ------------------------------------------------------------------ //
  // migrate_form (FORM-006)
  // ------------------------------------------------------------------ //
  server.tool(
    'migrate_form',
    'Migrate forms between plugins: CF7 → Elementor Forms, WPForms → Elementor Forms, Gravity Forms → Elementor Forms. Preserves field structure and settings. Reports unmappable fields as warnings.',
    {
      site_id: z.string().optional(),
      source_type: z.enum(['cf7', 'wpforms', 'gravityforms']).describe('Source form plugin type'),
      source_data: z.string().describe('Form data: CF7 shortcode or WPForms/Gravity Forms JSON'),
      form_name: z.string().optional().default('Migrated Form').describe('Name for the new Elementor form'),
      email_to: z.string().email().optional().describe('Email address to send submissions to (optional)'),
      success_message: z.string().optional().describe('Custom success message (optional)'),
      note: z.string().optional().describe('Optional note for queued changes (auto-queued for L2 governance)'),
      consent: z.boolean().optional().describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async ({ site_id, source_type, source_data, form_name, email_to, success_message, note, consent }) => {
      const client = getClient(site_id);
      const toolName = 'migrate_form';
      const level = GOVERNANCE_LEVELS[toolName] || 'L0';
      
      // L3 requires explicit consent
      if (level === 'L3' && consent !== true) {
        return {
          content: [{
            type: 'text',
            text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
          }],
        };
      }
      
      let fields: Array<z.infer<typeof formFieldSchema>> = [];
      const warnings: string[] = [];
      
      try {
        // Parse source data based on type
        switch (source_type) {
          case 'cf7':
            const cf7Result = parseCf7Shortcode(source_data);
            fields = cf7Result.fields;
            warnings.push(...cf7Result.warnings);
            break;
          case 'wpforms':
            const wpformsJson = JSON.parse(source_data);
            const wpformsResult = parseWpFormsJson(wpformsJson);
            fields = wpformsResult.fields;
            warnings.push(...wpformsResult.warnings);
            break;
          case 'gravityforms':
            const gravityJson = JSON.parse(source_data);
            const gravityResult = parseGravityFormsJson(gravityJson);
            fields = gravityResult.fields;
            warnings.push(...gravityResult.warnings);
            break;
          default:
            throw new Error(`Unsupported source type: ${source_type}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to parse ${source_type} data: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
      
      if (fields.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No fields could be extracted from the ${source_type} data.`,
          }],
          isError: true,
        };
      }
      
      // Generate Elementor form widget
      const formWidget = generateFormWidget(fields, {
        formName: form_name,
        emailTo: email_to,
        successMessage: success_message,
      });
      
      // For L2/L3, queue the creation
      if (level === 'L2' || level === 'L3') {
        const change = await client.createChange({
          operation: 'create_template',
          params: {
            title: `${form_name} (Migrated from ${source_type})`,
            type: 'widget',
            elementor_data: [formWidget],
            status: 'draft',
          },
          note: note || `Form migrated from ${source_type} auto-queued by governance level ${level}`,
        });

        const lines = [
          `🟡 Migrated form queued for review (governance level ${level})`,
          `   ID: ${change.id}`,
          `   Operation: create_template`,
          `   Form name: ${form_name}`,
          `   Source: ${source_type}`,
          `   Fields migrated: ${fields.length} field(s)`,
          warnings.length > 0 ? `   Warnings: ${warnings.length} (see details below)` : '',
          note ? `   Note: ${note}` : '',
          '',
          'Next steps:',
          '  1. review_change(change_id, "approve") — approve it',
          '  2. apply_change(change_id)             — create the form template',
          '  Or: review_change(change_id, "reject") to discard.',
          '',
          'After approval, use update_page_data to insert the form into a page.',
          '',
          ...(warnings.length > 0 ? [
            '**Migration warnings:**',
            ...warnings.map(w => `• ${w}`),
            ''
          ] : []),
        ].filter(Boolean);

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
      
      // L0/L1: Return the JSON directly
      const lines = [
        `✅ Form migrated from ${source_type}`,
        `   Form name: ${form_name}`,
        `   Fields: ${fields.length} field(s)`,
        `   Email notification: ${email_to ? 'Yes' : 'No'}`,
        warnings.length > 0 ? `   Warnings: ${warnings.length}` : '',
        '',
        '## Elementor Form Widget JSON',
        '```json',
        JSON.stringify([formWidget], null, 2),
        '```',
        '',
        '## Usage',
        '1. Copy the JSON above',
        '2. Use update_page_data(page_id, elementor_data: JSON) to insert into a page',
        '3. Or use create_template to save as a reusable template',
        '',
        ...(warnings.length > 0 ? [
          '## Migration Warnings',
          ...warnings.map(w => `• ${w}`),
          ''
        ] : []),
      ].filter(Boolean);

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );
}

export function registerFormFreeTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {

  // ------------------------------------------------------------------ //
  server.tool(
    'create_form_light',
    'Generate Elementor Form widget JSON from a form specification. Free tier form creation. Input: array of field objects with type, label, required flag, and optional options. Output is valid Elementor form widget JSON that can be inserted via update_page_data or create_template.',
    {
      site_id: z.string().optional(),
      fields: z.array(formFieldSchema).min(1).max(20)
                .describe('Form field specifications'),
      form_name: z.string().optional().default('Contact Form')
                .describe('Form name for identification'),
      email_to: z.string().email().optional()
                .describe('Email address to send submissions to (optional)'),
      redirect_url: z.string().url().optional()
                .describe('URL to redirect after submission (optional)'),
      success_message: z.string().optional()
                .describe('Custom success message (optional)'),
      note: z.string().optional()
                .describe('Optional note for queued changes (auto-queued for L2 governance)'),
      consent: z.boolean().optional()
                .describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async ({ site_id, fields, form_name, email_to, redirect_url, success_message, note, consent }) => {
      const client = getClient(site_id);
      const toolName = 'create_form_light';
      const level = GOVERNANCE_LEVELS[toolName] || 'L0';
      
      // L3 requires explicit consent
      if (level === 'L3' && consent !== true) {
        return {
          content: [{
            type: 'text',
            text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
          }],
        };
      }
      
      // Generate the form widget JSON
      const formWidget = generateFormWidget(fields, {
        formName: form_name,
        emailTo: email_to,
        redirectUrl: redirect_url,
        successMessage: success_message,
      });
      
      // For L2/L3, queue the creation
      if (level === 'L2' || level === 'L3') {
        const change = await client.createChange({
          operation: 'create_template', // We'll create a template with the form
          params: {
            title: `${form_name} (Form)`,
            type: 'widget',
            elementor_data: [formWidget],
            status: 'draft',
          },
          note: note || `Form "${form_name}" auto-queued by governance level ${level}`,
        });

        const lines = [
          `🟡 Form template queued for review (governance level ${level})`,
          `   ID: ${change.id}`,
          `   Operation: create_template`,
          `   Form name: ${form_name}`,
          `   Fields: ${fields.length} field(s)`,
          note ? `   Note: ${note}` : '',
          '',
          'Next steps:',
          '  1. review_change(change_id, "approve") — approve it',
          '  2. apply_change(change_id)             — create the form template',
          '  Or: review_change(change_id, "reject") to discard.',
          '',
          'After approval, use update_page_data to insert the form into a page.',
        ].filter(Boolean);

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
      
      // L0/L1: Return the JSON directly
      const lines = [
        `✅ Form "${form_name}" generated`,
        `   Fields: ${fields.length} field(s)`,
        `   Email notification: ${email_to ? 'Yes' : 'No'}`,
        `   Redirect: ${redirect_url || 'None'}`,
        '',
        '## Elementor Form Widget JSON',
        '```json',
        JSON.stringify([formWidget], null, 2),
        '```',
        '',
        '## Usage',
        '1. Copy the JSON above',
        '2. Use update_page_data(page_id, elementor_data: JSON) to insert into a page',
        '3. Or use create_template to save as a reusable template',
      ];

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ------------------------------------------------------------------ //
  // create_form_advanced (FORM-005)
  // ------------------------------------------------------------------ //

  // ------------------------------------------------------------------ //
  server.tool(
    'list_form_templates',
    'List pre-built Elementor form templates: Contact, Newsletter Signup, Quote Request, Booking Inquiry, Event Registration, Survey, Feedback. Each template is optimized for conversion and uses Global Typography/Colors.',
    {
      site_id: z.string().optional(),
      category: z.enum(['all', 'contact', 'lead-generation', 'feedback', 'registration']).optional().default('all')
                .describe('Filter templates by category'),
    },
    async ({ site_id, category }) => {
      const client = getClient(site_id);
      
      // Define form templates (7 minimum as per FORM-007)
      const formTemplates = [
        {
          id: 'contact-form',
          title: 'Contact Form',
          description: 'Standard contact form with name, email, message, and optional phone number',
          category: 'contact',
          fields: [
            { type: 'text', label: 'Name', required: true, placeholder: 'Your name' },
            { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
            { type: 'tel', label: 'Phone', required: false, placeholder: 'Your phone number' },
            { type: 'textarea', label: 'Message', required: true, placeholder: 'How can we help you?' },
          ],
          recommended_email_to: '{site_admin_email}',
          recommended_success_message: 'Thank you! We\'ll get back to you soon.',
        },
        {
          id: 'newsletter-signup',
          title: 'Newsletter Signup',
          description: 'Simple newsletter subscription form with email and optional name',
          category: 'lead-generation',
          fields: [
            { type: 'text', label: 'First Name', required: false, placeholder: 'First name' },
            { type: 'text', label: 'Last Name', required: false, placeholder: 'Last name' },
            { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
            { type: 'checkbox', label: 'Interests', required: false, options: ['Technology', 'Marketing', 'Design', 'Business'] },
          ],
          recommended_email_to: '{site_admin_email}',
          recommended_success_message: 'Thank you for subscribing!',
        },
        {
          id: 'quote-request',
          title: 'Quote Request',
          description: 'Detailed quote request form for service businesses',
          category: 'lead-generation',
          fields: [
            { type: 'text', label: 'Company Name', required: true, placeholder: 'Your company' },
            { type: 'text', label: 'Contact Person', required: true, placeholder: 'Your name' },
            { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
            { type: 'tel', label: 'Phone', required: true, placeholder: 'Your phone number' },
            { type: 'select', label: 'Service Type', required: true, options: ['Web Design', 'Development', 'Consulting', 'Maintenance', 'Other'] },
            { type: 'textarea', label: 'Project Details', required: true, placeholder: 'Tell us about your project...' },
            { type: 'date', label: 'Desired Start Date', required: false },
          ],
          recommended_email_to: '{site_admin_email}',
          recommended_success_message: 'Thank you! We\'ll send you a quote within 24 hours.',
        },
        {
          id: 'booking-inquiry',
          title: 'Booking Inquiry',
          description: 'Appointment or booking request form',
          category: 'registration',
          fields: [
            { type: 'text', label: 'Name', required: true, placeholder: 'Your name' },
            { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
            { type: 'tel', label: 'Phone', required: true, placeholder: 'Your phone number' },
            { type: 'date', label: 'Preferred Date', required: true },
            { type: 'select', label: 'Preferred Time', required: true, options: ['Morning (9-12)', 'Afternoon (12-5)', 'Evening (5-8)'] },
            { type: 'select', label: 'Service', required: true, options: ['Consultation', 'Demo', 'Training', 'Support'] },
            { type: 'textarea', label: 'Additional Notes', required: false, placeholder: 'Any special requirements?' },
          ],
          recommended_email_to: '{site_admin_email}',
          recommended_success_message: 'Booking request received! We\'ll confirm shortly.',
        },
        {
          id: 'event-registration',
          title: 'Event Registration',
          description: 'Event registration form with attendee details',
          category: 'registration',
          fields: [
            { type: 'text', label: 'Full Name', required: true, placeholder: 'Your full name' },
            { type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
            { type: 'text', label: 'Job Title', required: false, placeholder: 'Your position' },
            { type: 'text', label: 'Company', required: false, placeholder: 'Your company' },
            { type: 'select', label: 'Ticket Type', required: true, options: ['General Admission', 'VIP', 'Student', 'Group (5+)'] },
            { type: 'number', label: 'Number of Tickets', required: true, placeholder: '1' },
            { type: 'checkbox', label: 'Dietary Requirements', required: false, options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Other'] },
          ],
          recommended_email_to: '{site_admin_email}',
          recommended_success_message: 'Registration confirmed! Check your email for details.',
        },
        {
          id: 'survey-form',
          title: 'Survey Form',
          description: 'Customer feedback or survey form',
          category: 'feedback',
          fields: [
            { type: 'text', label: 'Name', required: false, placeholder: 'Optional' },
            { type: 'email', label: 'Email', required: false, placeholder: 'Optional' },
            { type: 'select', label: 'Overall Satisfaction', required: true, options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'] },
            { type: 'radio', label: 'Would you recommend us?', required: true, options: ['Yes', 'No', 'Maybe'] },
            { type: 'textarea', label: 'What could we improve?', required: false, placeholder: 'Your suggestions...' },
            { type: 'textarea', label: 'Additional Comments', required: false, placeholder: 'Any other feedback?' },
          ],
          recommended_email_to: '{site_admin_email}',
          recommended_success_message: 'Thank you for your feedback!',
        },
        {
          id: 'feedback-form',
          title: 'Feedback Form',
          description: 'General feedback form for products or services',
          category: 'feedback',
          fields: [
            { type: 'text', label: 'Name', required: false, placeholder: 'Optional' },
            { type: 'email', label: 'Email', required: false, placeholder: 'Optional' },
            { type: 'select', label: 'Feedback Type', required: true, options: ['Bug Report', 'Feature Request', 'General Feedback', 'Complaint'] },
            { type: 'textarea', label: 'Feedback', required: true, placeholder: 'Please describe your feedback...' },
            { type: 'checkbox', label: 'Follow-up Options', required: false, options: ['Email me updates', 'Contact me for more details', 'Add me to beta testing'] },
          ],
          recommended_email_to: '{site_admin_email}',
          recommended_success_message: 'Thank you for your feedback!',
        },
      ];

      // Filter by category if specified
      const filteredTemplates = category === 'all' 
        ? formTemplates 
        : formTemplates.filter(t => t.category === category);

      // Generate output
      const lines = [
        `Form Template Library (${filteredTemplates.length} templates)`,
        '',
        ...filteredTemplates.map(t => [
          `### ${t.title}`,
          `  ID: ${t.id}`,
          `  Category: ${t.category}`,
          `  Description: ${t.description}`,
          `  Fields: ${t.fields.length} field(s)`,
          `  Recommended email: ${t.recommended_email_to}`,
          '',
          '  **Usage:**',
          `  create_form_light(fields: ${JSON.stringify(t.fields)}, form_name: "${t.title}", email_to: "${t.recommended_email_to}", success_message: "${t.recommended_success_message}")`,
          '',
        ].join('\n')),
        '',
        '**How to use:**',
        '1. Copy the create_form_light command for your chosen template',
        '2. Run it to generate Elementor form widget JSON',
        '3. Use update_page_data to insert into a page, or create_template to save as reusable template',
      ];

       return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ------------------------------------------------------------------ //
  // migrate_form (FORM-006)
  // ------------------------------------------------------------------ //
}


export function registerFormAdvancedTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {

  // ------------------------------------------------------------------ //
  server.tool(
    'create_form_advanced',
    'Generate advanced Elementor Form widget JSON with multi-step support, conditional logic, and marketing integrations. Advanced tier form creation.',
    {
      site_id: z.string().optional(),
      fields: z.array(formFieldSchema).min(1).max(20)
                .describe('Form field specifications (supports file, hidden, acceptance types)'),
      form_name: z.string().optional().default('Advanced Form')
                .describe('Form name for identification'),
      email_to: z.string().email().optional()
                .describe('Email address to send submissions to (optional)'),
      redirect_url: z.string().url().optional()
                .describe('URL to redirect after submission (optional)'),
      success_message: z.string().optional()
                .describe('Custom success message (optional)'),
      steps: z.array(stepSchema).optional()
                .describe('Multi-step form steps (optional)'),
      conditional_logic: z.array(conditionalLogicSchema).optional()
                .describe('Conditional logic rules (optional)'),
      marketing_integrations: z.array(marketingIntegrationSchema).optional()
                .describe('Marketing integrations (Mailchimp, HubSpot, webhook)'),
      note: z.string().optional()
                .describe('Optional note for queued changes (auto-queued for L2 governance)'),
      consent: z.boolean().optional()
                .describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async ({ site_id, fields, form_name, email_to, redirect_url, success_message, steps, conditional_logic, marketing_integrations, note, consent }) => {
      const client = getClient(site_id);
      const toolName = 'create_form_advanced';
      const level = GOVERNANCE_LEVELS[toolName] || 'L0';
      
      // L3 requires explicit consent
      if (level === 'L3' && consent !== true) {
        return {
          content: [{
            type: 'text',
            text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
          }],
        };
      }
      
      // Generate the advanced form widget JSON
      const formWidget = generateAdvancedFormWidget(fields, {
        formName: form_name,
        emailTo: email_to,
        redirectUrl: redirect_url,
        successMessage: success_message,
        steps,
        conditionalLogic: conditional_logic,
        marketingIntegrations: marketing_integrations,
      });
      
      // For L2/L3, queue the creation
      if (level === 'L2' || level === 'L3') {
        const change = await client.createChange({
          operation: 'create_template', // We'll create a template with the form
          params: {
            title: `${form_name} (Advanced Form)`,
            type: 'widget',
            elementor_data: [formWidget],
            status: 'draft',
          },
          note: note || `Advanced form "${form_name}" auto-queued by governance level ${level}`,
        });

        const lines = [
          `🟡 Advanced form template queued for review (governance level ${level})`,
          `   ID: ${change.id}`,
          `   Operation: create_template`,
          `   Form name: ${form_name}`,
          `   Fields: ${fields.length} field(s)`,
          steps ? `   Steps: ${steps.length} step(s)` : '',
          conditional_logic ? `   Conditional logic rules: ${conditional_logic.length}` : '',
          marketing_integrations ? `   Marketing integrations: ${marketing_integrations.length}` : '',
          note ? `   Note: ${note}` : '',
          '',
          'Next steps:',
          '  1. review_change(change_id, "approve") — approve it',
          '  2. apply_change(change_id)             — create the form template',
          '  Or: review_change(change_id, "reject") to discard.',
          '',
          'After approval, use update_page_data to insert the form into a page.',
        ].filter(Boolean);

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
      
      // L0/L1: Return the JSON directly (should not happen as advanced is L2)
      const lines = [
        `✅ Advanced form "${form_name}" generated`,
        `   Fields: ${fields.length} field(s)`,
        `   Email notification: ${email_to ? 'Yes' : 'No'}`,
        `   Redirect: ${redirect_url || 'None'}`,
        steps ? `   Steps: ${steps.length} step(s)` : '',
        conditional_logic ? `   Conditional logic rules: ${conditional_logic.length}` : '',
        marketing_integrations ? `   Marketing integrations: ${marketing_integrations.length}` : '',
        '',
        '## Elementor Advanced Form Widget JSON',
        '```json',
        JSON.stringify([formWidget], null, 2),
        '```',
        '',
        '## Usage',
        '1. Copy the JSON above',
        '2. Use update_page_data(page_id, elementor_data: JSON) to insert into a page',
        '3. Or use create_template to save as a reusable template',
      ].filter(Boolean);

       return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ------------------------------------------------------------------ //
  // list_form_templates (FORM-007)
  // ------------------------------------------------------------------ //

  // ------------------------------------------------------------------ //
  server.tool(
    'migrate_form',
    'Migrate forms between plugins: CF7 → Elementor Forms, WPForms → Elementor Forms, Gravity Forms → Elementor Forms. Preserves field structure and settings. Reports unmappable fields as warnings.',
    {
      site_id: z.string().optional(),
      source_type: z.enum(['cf7', 'wpforms', 'gravityforms']).describe('Source form plugin type'),
      source_data: z.string().describe('Form data: CF7 shortcode or WPForms/Gravity Forms JSON'),
      form_name: z.string().optional().default('Migrated Form').describe('Name for the new Elementor form'),
      email_to: z.string().email().optional().describe('Email address to send submissions to (optional)'),
      success_message: z.string().optional().describe('Custom success message (optional)'),
      note: z.string().optional().describe('Optional note for queued changes (auto-queued for L2 governance)'),
      consent: z.boolean().optional().describe('Explicit consent required for L3 operations (not needed for L2 auto-queue)'),
    },
    async ({ site_id, source_type, source_data, form_name, email_to, success_message, note, consent }) => {
      const client = getClient(site_id);
      const toolName = 'migrate_form';
      const level = GOVERNANCE_LEVELS[toolName] || 'L0';
      
      // L3 requires explicit consent
      if (level === 'L3' && consent !== true) {
        return {
          content: [{
            type: 'text',
            text: `Operation "${toolName}" requires explicit consent (governance level L3). Please provide consent: true to proceed.`,
          }],
        };
      }
      
      let fields: Array<z.infer<typeof formFieldSchema>> = [];
      const warnings: string[] = [];
      
      try {
        // Parse source data based on type
        switch (source_type) {
          case 'cf7':
            const cf7Result = parseCf7Shortcode(source_data);
            fields = cf7Result.fields;
            warnings.push(...cf7Result.warnings);
            break;
          case 'wpforms':
            const wpformsJson = JSON.parse(source_data);
            const wpformsResult = parseWpFormsJson(wpformsJson);
            fields = wpformsResult.fields;
            warnings.push(...wpformsResult.warnings);
            break;
          case 'gravityforms':
            const gravityJson = JSON.parse(source_data);
            const gravityResult = parseGravityFormsJson(gravityJson);
            fields = gravityResult.fields;
            warnings.push(...gravityResult.warnings);
            break;
          default:
            throw new Error(`Unsupported source type: ${source_type}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to parse ${source_type} data: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
      
      if (fields.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No fields could be extracted from the ${source_type} data.`,
          }],
          isError: true,
        };
      }
      
      // Generate Elementor form widget
      const formWidget = generateFormWidget(fields, {
        formName: form_name,
        emailTo: email_to,
        successMessage: success_message,
      });
      
      // For L2/L3, queue the creation
      if (level === 'L2' || level === 'L3') {
        const change = await client.createChange({
          operation: 'create_template',
          params: {
            title: `${form_name} (Migrated from ${source_type})`,
            type: 'widget',
            elementor_data: [formWidget],
            status: 'draft',
          },
          note: note || `Form migrated from ${source_type} auto-queued by governance level ${level}`,
        });

        const lines = [
          `🟡 Migrated form queued for review (governance level ${level})`,
          `   ID: ${change.id}`,
          `   Operation: create_template`,
          `   Form name: ${form_name}`,
          `   Source: ${source_type}`,
          `   Fields migrated: ${fields.length} field(s)`,
          warnings.length > 0 ? `   Warnings: ${warnings.length} (see details below)` : '',
          note ? `   Note: ${note}` : '',
          '',
          'Next steps:',
          '  1. review_change(change_id, "approve") — approve it',
          '  2. apply_change(change_id)             — create the form template',
          '  Or: review_change(change_id, "reject") to discard.',
          '',
          'After approval, use update_page_data to insert the form into a page.',
          '',
          ...(warnings.length > 0 ? [
            '**Migration warnings:**',
            ...warnings.map(w => `• ${w}`),
            ''
          ] : []),
        ].filter(Boolean);

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
      
      // L0/L1: Return the JSON directly
      const lines = [
        `✅ Form migrated from ${source_type}`,
        `   Form name: ${form_name}`,
        `   Fields: ${fields.length} field(s)`,
        `   Email notification: ${email_to ? 'Yes' : 'No'}`,
        warnings.length > 0 ? `   Warnings: ${warnings.length}` : '',
        '',
        '## Elementor Form Widget JSON',
        '```json',
        JSON.stringify([formWidget], null, 2),
        '```',
        '',
        '## Usage',
        '1. Copy the JSON above',
        '2. Use update_page_data(page_id, elementor_data: JSON) to insert into a page',
        '3. Or use create_template to save as a reusable template',
        '',
        ...(warnings.length > 0 ? [
          '## Migration Warnings',
          ...warnings.map(w => `• ${w}`),
          ''
        ] : []),
      ].filter(Boolean);

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );
}

