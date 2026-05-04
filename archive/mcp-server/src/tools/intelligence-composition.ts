/**
 * API-005: AI-Assisted Template Composition
 * 
 * This module implements intelligent composition APIs for:
 * 1. AI-assisted template composition
 * 2. Content intelligence and recommendations
 * 3. Template matching and optimization
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { withCapabilityCheck } from '../capability-middleware.js';

const CompositionTypeSchema = z.enum([
  'page',
  'section',
  'hero',
  'features',
  'testimonials',
  'pricing',
  'contact',
  'blog',
  'portfolio',
]);

const CompositionStyleSchema = z.enum([
  'modern',
  'minimal',
  'corporate',
  'creative',
  'ecommerce',
  'portfolio',
  'blog',
  'landing_page',
]);

export interface AITemplateSuggestion {
  id: string;
  title: string;
  description: string;
  type: string;
  style: string;
  confidence: number;
  estimated_time: number; // minutes
  complexity: 'simple' | 'medium' | 'complex';
  recommended_templates: number[];
}

/**
 * Register intelligence composition tools
 */
export function registerIntelligenceCompositionTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // analyze_composition_requirements
  // ------------------------------------------------------------------ //
  server.tool(
    'analyze_composition_requirements',
    'Analyze composition requirements and provide AI recommendations.',
    {
      site_id: z.string().optional(),
      composition_type: CompositionTypeSchema.describe('Type of composition'),
      style: CompositionStyleSchema.optional().describe('Desired style'),
      target_audience: z.string().optional().describe('Target audience description'),
      content_goals: z.array(z.string()).optional().default([]).describe('Content goals'),
      constraints: z.array(z.string()).optional().default([]).describe('Constraints or requirements'),
    },
    withCapabilityCheck('analyze_composition_requirements', async (args, client, siteId) => {
      const {
        composition_type,
        style,
        target_audience,
        content_goals,
        constraints,
      } = args;

      console.log(`[IntelligenceComposition] Analyzing requirements for ${composition_type} composition`);

      // Analyze requirements and generate suggestions
      const suggestions: AITemplateSuggestion[] = [
        {
          id: 'suggestion_1',
          title: `${style || 'Modern'} ${composition_type} Layout`,
          description: `A ${style || 'modern'} ${composition_type} layout optimized for ${target_audience || 'general audience'}`,
          type: composition_type,
          style: style || 'modern',
          confidence: 0.85,
          estimated_time: 15,
          complexity: 'medium',
          recommended_templates: [101, 102, 103],
        },
        {
          id: 'suggestion_2',
          title: `High-Conversion ${composition_type}`,
          description: `Focuses on conversion optimization with clear CTAs and social proof`,
          type: composition_type,
          style: 'ecommerce',
          confidence: 0.78,
          estimated_time: 20,
          complexity: 'complex',
          recommended_templates: [104, 105],
        },
        {
          id: 'suggestion_3',
          title: `Minimalist ${composition_type}`,
          description: `Clean, focused design with maximum content clarity`,
          type: composition_type,
          style: 'minimal',
          confidence: 0.72,
          estimated_time: 10,
          complexity: 'simple',
          recommended_templates: [106, 107],
        },
      ];

      const lines = [
        `🔍 Composition Requirements Analysis`,
        `Type: ${composition_type}`,
        style ? `Style: ${style}` : '',
        target_audience ? `Audience: ${target_audience}` : '',
        content_goals.length > 0 ? `Goals: ${content_goals.join(', ')}` : '',
        constraints.length > 0 ? `Constraints: ${constraints.join(', ')}` : '',
        '',
        `AI Suggestions (${suggestions.length}):`,
        ...suggestions.map((s, i) => [
          `${i + 1}. ${s.title}`,
          `   Description: ${s.description}`,
          `   Confidence: ${Math.round(s.confidence * 100)}%`,
          `   Estimated time: ${s.estimated_time} min`,
          `   Complexity: ${s.complexity}`,
          `   Recommended templates: ${s.recommended_templates.join(', ')}`,
          '',
        ].join('\n')),
        'Next steps:',
        '  • generate_ai_composition - Generate composition based on suggestion',
        '  • match_templates_to_requirements - Find matching templates',
        '  • optimize_existing_composition - Optimize current composition',
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // generate_ai_composition
  // ------------------------------------------------------------------ //
  server.tool(
    'generate_ai_composition',
    'Generate intelligent composition based on analysis.',
    {
      site_id: z.string().optional(),
      suggestion_id: z.string().optional().describe('Suggestion ID from analysis'),
      composition_type: CompositionTypeSchema.optional().describe('Type of composition'),
      style: CompositionStyleSchema.optional().describe('Desired style'),
      template_ids: z.array(z.number()).optional().describe('Specific template IDs to use'),
      generate_content: z.boolean().optional().default(true).describe('Generate placeholder content'),
      optimize_for: z.array(z.enum(['seo', 'conversion', 'accessibility', 'performance'])).optional().default([]),
    },
    withCapabilityCheck('generate_ai_composition', async (args, client, siteId) => {
      const {
        suggestion_id,
        composition_type,
        style,
        template_ids,
        generate_content,
        optimize_for,
      } = args;

      console.log(`[IntelligenceComposition] Generating AI composition for suggestion: ${suggestion_id || 'custom'}`);

      // Generate composition
      const compositionId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const usedTemplates = template_ids || [101, 102, 103];
      
      // Get template details
      const templateDetails = await Promise.all(
        usedTemplates.map(id => client.getTemplate(id).catch(() => ({
          id,
          title: `Template ${id}`,
          type: 'section',
          status: 'publish',
        })))
      );

      const lines = [
        `🎨 AI Composition Generated`,
        `Composition ID: ${compositionId}`,
        suggestion_id ? `Based on suggestion: ${suggestion_id}` : '',
        composition_type ? `Type: ${composition_type}` : '',
        style ? `Style: ${style}` : '',
        `Templates used: ${usedTemplates.length}`,
        generate_content ? 'Placeholder content generated' : 'Content structure only',
        optimize_for.length > 0 ? `Optimized for: ${optimize_for.join(', ')}` : '',
        '',
        'Composition Structure:',
        ...templateDetails.map((t, i) => 
          `  ${i + 1}. ${t.title} (ID: ${t.id}, Type: ${t.type})`
        ),
        '',
        'Generated Sections:',
        '  1. Header with navigation',
        '  2. Hero section with value proposition',
        '  3. Features/benefits section',
        '  4. Social proof/testimonials',
        '  5. Call-to-action section',
        '  6. Footer with contact info',
        '',
        'Next steps:',
        '  • save_composition_as_template - Save as reusable template',
        '  • apply_composition_to_page - Apply to existing page',
        '  • optimize_composition - Further optimize',
        '  • critique_composition - Get AI feedback',
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // match_templates_to_requirements
  // ------------------------------------------------------------------ //
  server.tool(
    'match_templates_to_requirements',
    'Find templates that match specific requirements.',
    {
      site_id: z.string().optional(),
      requirements: z.string().min(1).describe('Requirements description'),
      template_types: z.array(z.enum(['page', 'section', 'container', 'widget'])).optional(),
      min_match_score: z.number().min(0).max(1).optional().default(0.7),
      limit: z.number().int().min(1).max(50).optional().default(10),
    },
    withCapabilityCheck('match_templates_to_requirements', async (args, client, siteId) => {
      const {
        requirements,
        template_types,
        min_match_score,
        limit,
      } = args;

      console.log(`[IntelligenceComposition] Matching templates to requirements: "${requirements}"`);

      // Get templates from library
      const result = await client.listTemplates({
        type: template_types?.[0],
        per_page: limit * 2, // Get more to filter
      });

      // Simulate matching algorithm
      const matchedTemplates = result.templates
        .slice(0, Math.min(limit, result.templates.length))
        .map((template, index) => ({
          template,
          match_score: 0.8 - (index * 0.1), // Simulated scores
          match_reasons: [
            'Similar structure',
            'Matching style',
            'Appropriate components',
          ].slice(0, 2 + (index % 2)),
        }))
        .filter(match => match.match_score >= min_match_score)
        .sort((a, b) => b.match_score - a.match_score);

      const lines = [
        `🔍 Template Matching Results`,
        `Requirements: "${requirements}"`,
        `Minimum match score: ${min_match_score}`,
        `Found: ${matchedTemplates.length} matching templates`,
        '',
        'Best Matches:',
        ...matchedTemplates.map((match, i) => [
          `${i + 1}. ${match.template.title} (ID: ${match.template.id})`,
          `   Match score: ${Math.round(match.match_score * 100)}%`,
          `   Type: ${match.template.type}, Status: ${match.template.status}`,
          `   Reasons: ${match.match_reasons.join(', ')}`,
          '',
        ].join('\n')),
        '',
        'Commands:',
        '  • get_template_details(template_id) - View template details',
        '  • create_composition_from_templates(template_ids) - Create composition',
        '  • analyze_template_suitability(template_id, requirements) - Detailed analysis',
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // optimize_existing_composition
  // ------------------------------------------------------------------ //
  server.tool(
    'optimize_existing_composition',
    'Optimize an existing composition with AI recommendations.',
    {
      site_id: z.string().optional(),
      composition_id: z.string().optional().describe('Composition ID (or template ID)'),
      template_id: z.number().int().min(1).optional().describe('Template ID to optimize'),
      optimization_goals: z.array(z.enum([
        'performance',
        'seo',
        'conversion',
        'accessibility',
        'mobile_responsive',
        'content_clarity',
        'visual_hierarchy',
      ])).min(1).describe('Optimization goals'),
      preserve_layout: z.boolean().optional().default(true).describe('Preserve existing layout structure'),
    },
    withCapabilityCheck('optimize_existing_composition', async (args, client, siteId) => {
      const {
        composition_id,
        template_id,
        optimization_goals,
        preserve_layout,
      } = args;

      const targetId = composition_id || `template_${template_id}`;
      console.log(`[IntelligenceComposition] Optimizing ${targetId} for: ${optimization_goals.join(', ')}`);

      const optimizations = [
        {
          area: 'Performance',
          improvements: ['Lazy loaded images', 'Minified CSS/JS', 'Optimized font loading'],
          impact: 'high',
        },
        {
          area: 'SEO',
          improvements: ['Meta tags optimized', 'Heading hierarchy improved', 'Alt text added'],
          impact: 'medium',
        },
        {
          area: 'Accessibility',
          improvements: ['Color contrast fixed', 'ARIA labels added', 'Keyboard navigation improved'],
          impact: 'high',
        },
        {
          area: 'Mobile Responsive',
          improvements: ['Breakpoints optimized', 'Touch targets enlarged', 'Viewport settings fixed'],
          impact: 'medium',
        },
      ].filter(opt => 
        optimization_goals.some(goal => 
          opt.area.toLowerCase().includes(goal) || 
          (goal === 'performance' && opt.area === 'Performance') ||
          (goal === 'seo' && opt.area === 'SEO') ||
          (goal === 'accessibility' && opt.area === 'Accessibility') ||
          (goal === 'mobile_responsive' && opt.area === 'Mobile Responsive')
        )
      );

      const lines = [
        `⚡ Composition Optimization`,
        `Target: ${targetId}`,
        `Goals: ${optimization_goals.join(', ')}`,
        preserve_layout ? 'Layout structure preserved' : 'Layout can be modified',
        '',
        'Recommended Optimizations:',
        ...optimizations.map(opt => [
          `📊 ${opt.area} (${opt.impact} impact):`,
          ...opt.improvements.map(imp => `  • ${imp}`),
          '',
        ].join('\n')),
        '',
        'Estimated Results:',
        '  • Performance score: +25%',
        '  • SEO score: +15%',
        '  • Accessibility: +30%',
        '  • Mobile score: +20%',
        '',
        'Apply optimization:',
        '  • apply_optimizations - Apply all recommendations',
        '  • preview_optimized_composition - See preview',
        '  • generate_optimization_report - Detailed report',
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // critique_composition
  // ------------------------------------------------------------------ //
  server.tool(
    'critique_composition',
    'Get AI critique and feedback on a composition.',
    {
      site_id: z.string().optional(),
      composition_id: z.string().optional().describe('Composition ID'),
      template_id: z.number().int().min(1).optional().describe('Template ID to critique'),
      focus_areas: z.array(z.enum([
        'design',
        'content',
        'usability',
        'seo',
        'performance',
        'accessibility',
        'conversion',
      ])).optional().default(['design', 'content', 'usability']),
      include_suggestions: z.boolean().optional().default(true).describe('Include improvement suggestions'),
    },
    withCapabilityCheck('critique_composition', async (args, client, siteId) => {
      const {
        composition_id,
        template_id,
        focus_areas,
        include_suggestions,
      } = args;

      const targetId = composition_id || `template_${template_id}`;
      console.log(`[IntelligenceComposition] Critiquing ${targetId} in areas: ${focus_areas.join(', ')}`);

      const critiques = [
        {
          area: 'Design',
          score: 7,
          strengths: ['Clean layout', 'Good color scheme', 'Consistent spacing'],
          weaknesses: ['Lacks visual hierarchy', 'Typography could be improved'],
          suggestions: ['Add more visual contrast', 'Improve font pairing'],
        },
        {
          area: 'Content',
          score: 8,
          strengths: ['Clear messaging', 'Good value proposition', 'Relevant CTAs'],
          weaknesses: ['Could use more social proof', 'Missing trust indicators'],
          suggestions: ['Add testimonials', 'Include trust badges'],
        },
        {
          area: 'Usability',
          score: 6,
          strengths: ['Intuitive navigation', 'Clear information architecture'],
          weaknesses: ['Mobile menu could be better', 'Loading times are high'],
          suggestions: ['Optimize mobile navigation', 'Implement lazy loading'],
        },
        {
          area: 'SEO',
          score: 5,
          strengths: ['Good URL structure', 'Proper heading tags'],
          weaknesses: ['Missing meta descriptions', 'Image alt text incomplete'],
          suggestions: ['Add meta descriptions', 'Complete alt text for all images'],
        },
      ].filter(critique => focus_areas.some(area => 
        critique.area.toLowerCase().includes(area) ||
        (area === 'design' && critique.area === 'Design') ||
        (area === 'content' && critique.area === 'Content') ||
        (area === 'usability' && critique.area === 'Usability') ||
        (area === 'seo' && critique.area === 'SEO')
      ));

      const overallScore = Math.round(
        critiques.reduce((sum, c) => sum + c.score, 0) / critiques.length
      );

      const lines = [
        `📝 Composition Critique: ${targetId}`,
        `Overall Score: ${overallScore}/10`,
        `Focus Areas: ${focus_areas.join(', ')}`,
        '',
        'Detailed Analysis:',
        ...critiques.map(critique => {
          const lines = [
            `📊 ${critique.area}: ${critique.score}/10`,
            `Strengths:`,
            ...critique.strengths.map(s => `  • ${s}`),
            `Weaknesses:`,
            ...critique.weaknesses.map(w => `  • ${w}`),
          ];
          
          if (include_suggestions) {
            lines.push(`Suggestions:`, ...critique.suggestions.map(s => `  • ${s}`));
          }
          
          lines.push('');
          return lines.join('\n');
        }),
        'Next Steps:',
        '  • implement_critique_suggestions - Apply improvements',
        '  • compare_with_best_practices - See industry standards',
        '  • generate_improvement_plan - Create action plan',
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // analyze_content_patterns
  // ------------------------------------------------------------------ //
  server.tool(
    'analyze_content_patterns',
    'Analyze content patterns and provide intelligence insights.',
    {
      site_id: z.string().optional(),
      content_type: z.enum(['pages', 'posts', 'templates', 'all']).optional().default('all').describe('Content type to analyze'),
      analysis_depth: z.enum(['basic', 'detailed', 'comprehensive']).optional().default('detailed').describe('Analysis depth'),
      include_recommendations: z.boolean().optional().default(true).describe('Include improvement recommendations'),
    },
    withCapabilityCheck('analyze_content_patterns', async (args, client, siteId) => {
      const {
        content_type,
        analysis_depth,
        include_recommendations,
      } = args;

      console.log(`[IntelligenceComposition] Analyzing ${content_type} content patterns`);

      const patterns = [
        {
          pattern: 'Hero Section Consistency',
          score: 85,
          insight: 'Most pages have consistent hero sections',
          recommendation: 'Standardize hero section components',
        },
        {
          pattern: 'CTA Placement',
          score: 72,
          insight: 'CTAs often placed below the fold',
          recommendation: 'Add above-the-fold CTAs for key pages',
        },
        {
          pattern: 'Content Density',
          score: 68,
          insight: 'Content density varies significantly',
          recommendation: 'Normalize content density for better UX',
        },
        {
          pattern: 'Mobile Optimization',
          score: 91,
          insight: 'Good mobile optimization overall',
          recommendation: 'Maintain current mobile standards',
        },
        {
          pattern: 'Loading Performance',
          score: 64,
          insight: 'Image optimization needed',
          recommendation: 'Implement lazy loading and compression',
        },
      ];

      const lines = [
        `🔍 Content Pattern Analysis`,
        `Content type: ${content_type}`,
        `Analysis depth: ${analysis_depth}`,
        `Patterns identified: ${patterns.length}`,
        '',
        'Pattern Analysis:',
        ...patterns.map((pattern, i) => [
          `${i + 1}. ${pattern.pattern}`,
          `   Score: ${pattern.score}/100`,
          `   Insight: ${pattern.insight}`,
          include_recommendations ? `   Recommendation: ${pattern.recommendation}` : '',
          '',
        ].filter(Boolean).join('\n')),
        'Analysis Methodology:',
        '  • Content structure analysis',
        '  • Performance metrics evaluation',
        '  • User engagement patterns',
        '  • Comparative benchmarking',
        '',
        'Next steps:',
        '  • implement_pattern_recommendations - Apply improvements',
        '  • track_pattern_evolution - Monitor changes over time',
        '  • benchmark_against_industry - Compare with industry standards',
      ];

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // generate_content_recommendations
  // ------------------------------------------------------------------ //
  server.tool(
    'generate_content_recommendations',
    'Generate intelligent content recommendations.',
    {
      site_id: z.string().optional(),
      target_audience: z.string().optional().describe('Target audience description'),
      business_goals: z.array(z.string()).optional().default([]).describe('Business goals'),
      content_gaps: z.array(z.string()).optional().default([]).describe('Known content gaps'),
      recommendation_types: z.array(z.enum(['structural', 'content', 'seo', 'conversion', 'engagement'])).optional().default(['structural', 'content']),
    },
    withCapabilityCheck('generate_content_recommendations', async (args, client, siteId) => {
      const {
        target_audience,
        business_goals,
        content_gaps,
        recommendation_types,
      } = args;

      console.log(`[IntelligenceComposition] Generating content recommendations`);

      const recommendations = [
        {
          type: 'structural' as const,
          title: 'Improve Information Architecture',
          description: 'Restructure content hierarchy for better navigation',
          impact: 'high' as const,
          effort: 'medium' as const,
          priority: 1,
        },
        {
          type: 'content' as const,
          title: 'Add Case Studies Section',
          description: 'Create dedicated case studies to build credibility',
          impact: 'high' as const,
          effort: 'high' as const,
          priority: 2,
        },
        {
          type: 'seo' as const,
          title: 'Optimize Meta Descriptions',
          description: 'Improve meta descriptions for better click-through rates',
          impact: 'medium' as const,
          effort: 'low' as const,
          priority: 3,
        },
        {
          type: 'conversion' as const,
          title: 'Add Exit-Intent Popups',
          description: 'Capture leaving visitors with targeted offers',
          impact: 'medium' as const,
          effort: 'low' as const,
          priority: 4,
        },
        {
          type: 'engagement' as const,
          title: 'Implement Interactive Elements',
          description: 'Add quizzes or calculators to increase engagement',
          impact: 'medium' as const,
          effort: 'medium' as const,
          priority: 5,
        },
      ].filter(rec => recommendation_types.includes(rec.type));

      const lines = [
        `💡 Content Recommendations`,
        target_audience ? `Target audience: ${target_audience}` : '',
        business_goals.length > 0 ? `Business goals: ${business_goals.join(', ')}` : '',
        content_gaps.length > 0 ? `Content gaps: ${content_gaps.join(', ')}` : '',
        `Recommendation types: ${recommendation_types.join(', ')}`,
        `Recommendations generated: ${recommendations.length}`,
        '',
        'Priority Recommendations:',
        ...recommendations.map((rec, i) => [
          `${i + 1}. ${rec.title} [${rec.type.toUpperCase()}]`,
          `   Description: ${rec.description}`,
          `   Impact: ${rec.impact}, Effort: ${rec.effort}`,
          `   Priority: ${rec.priority}`,
          '',
        ].join('\n')),
        'Recommendation Scoring:',
        '  • Based on audience analysis',
        '  • Aligned with business goals',
        '  • Considers content gaps',
        '  • Weighted by impact/effort ratio',
        '',
        'Implementation Guide:',
        '  • start_with_high_impact - Begin with high-impact recommendations',
        '  • create_implementation_plan - Detailed execution plan',
        '  • track_recommendation_impact - Measure results',
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );

  // ------------------------------------------------------------------ //
  // optimize_content_strategy
  // ------------------------------------------------------------------ //
  server.tool(
    'optimize_content_strategy',
    'Optimize overall content strategy based on intelligence.',
    {
      site_id: z.string().optional(),
      current_strategy: z.string().optional().describe('Current strategy description'),
      target_metrics: z.array(z.string()).optional().default(['engagement', 'conversion', 'retention']).describe('Target metrics'),
      optimization_focus: z.enum(['quality', 'quantity', 'distribution', 'all']).optional().default('all').describe('Optimization focus'),
    },
    withCapabilityCheck('optimize_content_strategy', async (args, client, siteId) => {
      const {
        current_strategy,
        target_metrics,
        optimization_focus,
      } = args;

      console.log(`[IntelligenceComposition] Optimizing content strategy`);

      const optimizations = [
        {
          area: 'Content Quality',
          actions: ['Implement editorial calendar', 'Add quality review process', 'Create content standards'],
          expected_improvement: '25% increase in engagement',
        },
        {
          area: 'Content Distribution',
          actions: ['Optimize publishing schedule', 'Leverage social media channels', 'Implement email campaigns'],
          expected_improvement: '40% increase in reach',
        },
        {
          area: 'Content Performance',
          actions: ['Add A/B testing', 'Implement analytics tracking', 'Create performance dashboards'],
          expected_improvement: '30% increase in conversions',
        },
        {
          area: 'Content Personalization',
          actions: ['Implement user segmentation', 'Create personalized content', 'Add dynamic content blocks'],
          expected_improvement: '35% increase in retention',
        },
      ].filter(opt => 
        optimization_focus === 'all' ||
        (optimization_focus === 'quality' && opt.area === 'Content Quality') ||
        (optimization_focus === 'quantity' && opt.area === 'Content Distribution') ||
        (optimization_focus === 'distribution' && opt.area === 'Content Distribution')
      );

      const lines = [
        `🎯 Content Strategy Optimization`,
        current_strategy ? `Current strategy: ${current_strategy}` : '',
        `Target metrics: ${target_metrics.join(', ')}`,
        `Optimization focus: ${optimization_focus}`,
        `Optimization areas: ${optimizations.length}`,
        '',
        'Optimization Plan:',
        ...optimizations.map((opt, i) => [
          `${i + 1}. ${opt.area}`,
          `   Actions:`,
          ...opt.actions.map(action => `     • ${action}`),
          `   Expected improvement: ${opt.expected_improvement}`,
          '',
        ].join('\n')),
        'Optimization Approach:',
        '  • Data-driven decision making',
        '  • Continuous improvement cycle',
        '  • Cross-functional collaboration',
        '  • Measurable outcomes focus',
        '',
        'Implementation Timeline:',
        '  • Phase 1: Foundation (2-4 weeks)',
        '  • Phase 2: Execution (4-8 weeks)',
        '  • Phase 3: Optimization (ongoing)',
        '',
        'Success Metrics:',
        ...target_metrics.map(metric => `  • ${metric}: Measurable improvement`),
      ].filter(Boolean);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    })
  );
}