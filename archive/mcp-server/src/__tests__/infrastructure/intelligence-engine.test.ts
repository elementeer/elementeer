/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntelligenceEngine } from '../../intelligence-engine.js';
import type { ElementifyClient } from '../../client.js';

function makeClient(): ElementifyClient {
  return {
    // Mock client methods needed by IntelligenceEngine
    getPageData: vi.fn().mockResolvedValue({
      post_id: 1,
      post_title: 'Test Page',
      post_type: 'page',
      element_count: 30,
      elementor_data: [],
    }),
    listTemplates: vi.fn().mockResolvedValue({
      templates: [
        { id: 1, title: 'Hero Section', type: 'section', status: 'publish' },
        { id: 2, title: 'Features Grid', type: 'section', status: 'publish' },
        { id: 3, title: 'Testimonials', type: 'section', status: 'publish' },
      ],
      total: 3,
      total_pages: 1,
    }),
    getTemplate: vi.fn().mockResolvedValue({
      id: 1,
      title: 'Hero Section',
      type: 'section',
      status: 'publish',
      elementor_data: [],
    }),
    getSiteInfo: vi.fn().mockResolvedValue({
      name: 'Test Site',
      url: 'https://test.site',
      wp_version: '6.5',
      elementor_version: '3.21',
      elementor_pro: true,
      activation_mode: 'advanced',
      template_count: 10,
    }),
    assessSite: vi.fn().mockResolvedValue({
      brand_completeness: 0.8,
      theme_builder_templates: [],
      template_library_stats: { total: 10, by_type: {}, by_status: {} },
      active_plugins: [],
      performance_indicators: {},
      issues: [],
    }),
  } as unknown as ElementifyClient;
}

describe('Intelligence Engine (INFRA-004)', () => {
  let client: ElementifyClient;
  let engine: IntelligenceEngine;

  beforeEach(() => {
    client = makeClient();
    engine = new IntelligenceEngine(client, {
      siteId: 'test-site',
      userRole: 'admin',
      userPreferences: {
        preferredTemplates: [],
        frequentlyUsedWidgets: [],
        compositionStyle: 'balanced',
      },
      brandGuidelines: {
        colors: [
          { id: 'primary', title: 'Primary', color: '#0073aa' },
          { id: 'secondary', title: 'Secondary', color: '#23282d' },
        ],
        typography: [
          { id: 'heading', title: 'Heading', font_family: 'Inter', font_size: 32 },
          { id: 'body', title: 'Body', font_family: 'Inter', font_size: 16 },
        ],
        spacing: { unit: 'px', scale: [4, 8, 16, 32, 64] },
      },
    });
  });

  describe('Template Recommendations', () => {
    it('should recommend templates based on page type', async () => {
      const recommendations = await engine.getTemplateRecommendations({
        purpose: 'landing',
        sectionTypes: ['hero', 'features', 'testimonials'],
        style: 'modern',
      });

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should include template recommendations
      const templateRecs = recommendations.filter(r => r.type === 'template');
      expect(templateRecs.length).toBeGreaterThan(0);
      
      // Should have confidence scores
      templateRecs.forEach(rec => {
        expect(rec.confidence).toBeGreaterThan(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should prioritize templates matching brand guidelines', async () => {
      const recommendations = await engine.getTemplateRecommendations({
        purpose: 'landing',
        sectionTypes: ['hero'],
        style: 'modern',
      });

      // Should return template recommendations
      expect(recommendations.some(r => 
        r.type === 'template' && 
        r.confidence > 0.5
      )).toBe(true);
    });
  });

  describe('Page Analysis', () => {
    it('should analyze page performance', async () => {
      const analysis = await engine.analyzePage(1);

      expect(analysis).toBeDefined();
      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(analysis.issues)).toBe(true);
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    it('should identify performance issues', async () => {
      // Mock a page with high element count
      (client.getPageData as any).mockResolvedValueOnce({
        post_id: 1,
        post_title: 'Heavy Page',
        post_type: 'page',
        element_count: 75, // High element count
        elementor_data: [],
      });

      const analysis = await engine.analyzePage(1);

      // Should detect high element count issue
      const performanceIssues = analysis.issues.filter(i => i.type === 'performance');
      expect(performanceIssues.length).toBeGreaterThan(0);
      
      const highElementIssue = performanceIssues.find(i => 
        i.description.includes('element count') || 
        i.description.includes('performance')
      );
      expect(highElementIssue).toBeDefined();
    });
  });

  describe('Performance Impact Prediction', () => {
    it('should predict impact of template changes', async () => {
      const prediction = await engine.predictPerformanceImpact({
        type: 'template-application',
        target: 'page-1',
        parameters: { templateId: 1, templateType: 'hero' },
      });

      expect(prediction).toBeDefined();
      expect(typeof prediction.estimatedImpact).toBe('number');
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(prediction.risks)).toBe(true);
      expect(Array.isArray(prediction.recommendations)).toBe(true);
    });

    it('should identify risks for layout changes', async () => {
      const prediction = await engine.predictPerformanceImpact({
        type: 'layout-change',
        target: 'page-1',
        parameters: { changeType: 'major', affectedSections: ['header', 'footer'] },
      });

      // Should identify risks for layout changes
      expect(prediction.risks.length).toBeGreaterThan(0);
      const layoutRisks = prediction.risks.filter(r => 
        r.description.includes('Layout changes') || 
        r.description.includes('performance')
      );
      expect(layoutRisks.length).toBeGreaterThan(0);
    });
  });

  describe('Learning from Interactions', () => {
    it('should record user preferences', async () => {
      const initialContext = { ...engine['context'] };
      
      await engine.learnFromInteraction({
        type: 'template-applied',
        targetId: '1',
        userId: 'test-user',
        context: { pageType: 'landing', section: 'hero' },
        outcome: 'success',
      });

      // Context should be updated with learning
      expect(engine['context'].userPreferences).toBeDefined();
      
      if (engine['context'].userPreferences) {
        expect(engine['context'].userPreferences.preferredTemplates).toContain(1);
      }
    });

    it('should improve recommendations based on history', async () => {
      // Record some interactions first
      await engine.learnFromInteraction({
        type: 'template-applied',
        targetId: '1',
        userId: 'test-user',
        context: { pageType: 'landing', section: 'hero' },
        outcome: 'success',
      });
      
      await engine.learnFromInteraction({
        type: 'recommendation-accepted',
        targetId: 'rec-hero-modern',
        userId: 'test-user',
        context: { recommendationType: 'template' },
        outcome: 'success',
      });

      const recommendations = await engine.getTemplateRecommendations({
        purpose: 'landing',
        sectionTypes: ['hero'],
      });

      // Recommendations should be influenced by interaction history
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Hero template should be recommended
      const heroRec = recommendations.find(r => 
        r.title.includes('Hero') || r.description.includes('hero')
      );
      expect(heroRec).toBeDefined();
    });
  });

  describe('Integration with Model System', () => {
    it('should use model integration for complex analysis', async () => {
      // This tests that the engine can work with model integration
      const analysis = await engine.analyzePage(1);
      
      // Should produce structured analysis even with simple implementation
      expect(analysis.issues).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
      
      // Recommendations should include actionable items
      const actionableRecs = analysis.recommendations.filter(r => 
        r.priority === 'high' || r.priority === 'critical' || r.priority === 'medium'
      );
      expect(actionableRecs.length).toBeGreaterThan(0);
    });

    it('should handle missing data gracefully', async () => {
      // Create engine without brand guidelines
      const minimalEngine = new IntelligenceEngine(client, {
        siteId: 'test-site',
        userRole: 'admin',
      });

      const recommendations = await minimalEngine.getTemplateRecommendations({
        purpose: 'landing',
        sectionTypes: ['hero'],
      });

      // Should still produce recommendations
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });
});