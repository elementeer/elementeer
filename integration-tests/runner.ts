/**
 * Elementify MCP Integration Test Runner (Proof of Concept)
 * 
 * This runner demonstrates how to simulate MCP tool calls against a live
 * WordPress site with Elementify plugin.
 * 
 * Usage: tsx runner.ts (or compile to JS and run with node)
 */

interface TestConfig {
  siteUrl: string;
  apiKey: string;
  verbose: boolean;
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  data?: any;
}

class ElementifyTestRunner {
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = config;
  }

  async makeRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const url = `${this.config.siteUrl}/wp-json/elementify/v1/${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    if (this.config.verbose) {
      console.log(`→ ${method} ${url}`);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    return data;
  }

  async testListTemplates(): Promise<TestResult> {
    const start = Date.now();
    try {
      const data = await this.makeRequest('templates');
      const passed = Array.isArray(data.templates) && typeof data.total === 'number';
      return {
        name: 'TC‑001: list_templates',
        passed,
        duration: Date.now() - start,
        data: { count: data.templates?.length, total: data.total },
      };
    } catch (error: any) {
      return {
        name: 'TC‑001: list_templates',
        passed: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  async testCreateTemplate(): Promise<TestResult> {
    const start = Date.now();
    try {
      const data = await this.makeRequest('templates', 'POST', {
        title: `Integration Test ${Date.now()}`,
        type: 'section',
        status: 'draft',
      });
      const passed = data.template && data.template.id && data.template.title;
      return {
        name: 'TC‑002: create_template',
        passed,
        duration: Date.now() - start,
        data: { id: data.template?.id },
      };
    } catch (error: any) {
      return {
        name: 'TC‑002: create_template',
        passed: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  async testGetTemplateData(): Promise<TestResult> {
    const start = Date.now();
    try {
      // First create a template to get its ID
      const create = await this.makeRequest('templates', 'POST', {
        title: `Data Test ${Date.now()}`,
        type: 'section',
        status: 'draft',
      });
      const templateId = create.template?.id;
      if (!templateId) {
        throw new Error('Failed to create template for data test');
      }

      // Get its data
      const data = await this.makeRequest(`templates/${templateId}/data`);
      const passed = data.elementor_data !== undefined;
      return {
        name: 'TC‑003: get_template_data',
        passed,
        duration: Date.now() - start,
        data: { id: templateId, has_data: passed },
      };
    } catch (error: any) {
      return {
        name: 'TC‑003: get_template_data',
        passed: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  async runAll(): Promise<TestResult[]> {
    console.log('🚀 Elementify Integration Test Runner');
    console.log(`🔗 Site: ${this.config.siteUrl}`);
    console.log('---');

    const tests = [
      () => this.testListTemplates(),
      () => this.testCreateTemplate(),
      () => this.testGetTemplateData(),
    ];

    const results: TestResult[] = [];
    for (const test of tests) {
      results.push(await test());
    }

    console.log('\n📊 Results:');
    results.forEach(r => {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} ${r.name} (${r.duration}ms)`);
      if (!r.passed && r.error) {
        console.log(`   Error: ${r.error}`);
      }
      if (r.data && this.config.verbose) {
        console.log(`   Data: ${JSON.stringify(r.data)}`);
      }
    });

    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`\n🎯 Passed: ${passed}/${total}`);

    return results;
  }
}

// Example configuration (would normally come from environment variables)
const config: TestConfig = {
  siteUrl: process.env.ELEMENTIFY_TEST_SITE || 'https://example.com',
  apiKey: process.env.ELEMENTIFY_API_KEY || 'test-key',
  verbose: process.env.VERBOSE === 'true',
};

// If this file is run directly
if (require.main === module) {
  const runner = new ElementifyTestRunner(config);
  runner.runAll().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { ElementifyTestRunner, TestConfig, TestResult };