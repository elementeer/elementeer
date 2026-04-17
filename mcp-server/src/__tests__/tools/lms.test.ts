import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerLmsTools } from '../../tools/lms.js';
import type { ElementifyClient, LmsStatus, LmsCourseList, LmsCourseStructure } from '../../client.js';

function makeLmsStatus(overrides: Partial<LmsStatus> = {}): LmsStatus {
  return {
    lms_available: true,
    plugin: 'LearnDash',
    version: '4.0',
    course_count: 12,
    ...overrides,
  };
}

function makeLmsCourseList(overrides: Partial<LmsCourseList> = {}): LmsCourseList {
  return {
    courses: [
      {
        id: 1,
        title: 'Introduction to Web Development',
        slug: 'intro-web-dev',
        status: 'publish',
        url: 'https://example.com/courses/intro-web-dev',
        description: 'Learn the basics of HTML, CSS, and JavaScript.',
        price: '49.99',
        students_count: 150,
      },
      {
        id: 2,
        title: 'Advanced JavaScript Patterns',
        slug: 'advanced-js-patterns',
        status: 'publish',
        url: 'https://example.com/courses/advanced-js-patterns',
        description: 'Master advanced JavaScript concepts and design patterns.',
        price: '79.99',
        students_count: 85,
      },
    ],
    total: 2,
    page: 1,
    per_page: 20,
    total_pages: 1,
    ...overrides,
  };
}

function makeLmsCourseStructure(overrides: Partial<LmsCourseStructure> = {}): LmsCourseStructure {
  return {
    course_id: 1,
    title: 'Introduction to Web Development',
    sections: [
      {
        id: 101,
        title: 'Getting Started',
        order: 1,
        lessons: [
          {
            id: 1001,
            title: 'Welcome to the Course',
            order: 1,
            content_type: 'video',
            duration: '5:30',
            completed: false,
          },
          {
            id: 1002,
            title: 'Setting Up Your Environment',
            order: 2,
            content_type: 'text',
            duration: '10:00',
            completed: false,
          },
        ],
        quizzes: [
          {
            id: 2001,
            title: 'Chapter 1 Quiz',
            order: 1,
            question_count: 10,
          },
        ],
      },
      {
        id: 102,
        title: 'HTML Fundamentals',
        order: 2,
        lessons: [
          {
            id: 1003,
            title: 'HTML Document Structure',
            order: 1,
            content_type: 'video',
            duration: '15:20',
            completed: false,
          },
        ],
        quizzes: [],
      },
    ],
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    getLmsStatus: vi.fn().mockResolvedValue(makeLmsStatus()),
    listLmsCourses: vi.fn().mockResolvedValue(makeLmsCourseList()),
    getLmsCourseStructure: vi.fn().mockResolvedValue(makeLmsCourseStructure()),
    // Add other client methods that may be called (minimal set)
    assessSite: vi.fn(),
    getSiteInfo: vi.fn(),
    getSiteContext: vi.fn(),
    listTemplates: vi.fn(),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('LMS tools', () => {
  let server: McpServer;
  let client: ElementifyClient;
  let getClient: (siteId?: string) => ElementifyClient;
  let toolHandlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>>;

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    client = makeClient();
    getClient = vi.fn().mockReturnValue(client);

    toolHandlers = new Map();
    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      const name = args[0] as string;
      // The callback is always the last argument
      const handler = args[args.length - 1] as (args: Record<string, unknown>) => Promise<unknown>;
      toolHandlers.set(name, handler);
      return server as any;
    });

    registerLmsTools(server, getClient);
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(args) as Promise<any>;
  }

  describe('get_lms_status', () => {
    it('calls getLmsStatus and returns formatted output', async () => {
      const result = await callTool('get_lms_status', { site_id: 'test-site' });
      expect(client.getLmsStatus).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# LMS Status');
      expect(result.content[0].text).toContain('**LMS available**: Yes');
      expect(result.content[0].text).toContain('**Plugin**: LearnDash');
      expect(result.content[0].text).toContain('**Version**: 4.0');
      expect(result.content[0].text).toContain('**Course count**: 12');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getLmsStatus).mockRejectedValueOnce(new Error('Network error'));
      const result = await callTool('get_lms_status', {});
      expect(result.content[0].text).toContain('❌ Error getting LMS status');
    });

    it('shows missing plugin message when LMS not available', async () => {
      vi.mocked(client.getLmsStatus).mockResolvedValueOnce(makeLmsStatus({ lms_available: false }));
      const result = await callTool('get_lms_status', {});
      expect(result.content[0].text).toContain('No active LMS plugin detected');
    });
  });

  describe('list_lms_courses', () => {
    it('calls listLmsCourses with pagination parameters', async () => {
      const result = await callTool('list_lms_courses', { page: 2, per_page: 10 });
      expect(client.listLmsCourses).toHaveBeenCalledWith({ page: 2, per_page: 10 });
      expect(result.content[0].text).toContain('# LMS Courses');
      expect(result.content[0].text).toContain('**Total courses**: 2');
      expect(result.content[0].text).toContain('**Page**: 1 of 1');
    });

    it('formats courses as a markdown table', async () => {
      const result = await callTool('list_lms_courses', {});
      expect(result.content[0].text).toContain('| ID | Title | Status | Price | Students | URL |');
      expect(result.content[0].text).toContain('| 1 | Introduction to Web Development | publish | 49.99 | 150 |');
      expect(result.content[0].text).toContain('| 2 | Advanced JavaScript Patterns | publish | 79.99 | 85 |');
    });

    it('handles empty courses list', async () => {
      vi.mocked(client.listLmsCourses).mockResolvedValueOnce(makeLmsCourseList({ courses: [] }));
      const result = await callTool('list_lms_courses', {});
      expect(result.content[0].text).toContain('No courses found.');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.listLmsCourses).mockRejectedValueOnce(new Error('API error'));
      const result = await callTool('list_lms_courses', {});
      expect(result.content[0].text).toContain('❌ Error listing LMS courses');
    });
  });

  describe('get_lms_course_structure', () => {
    it('calls getLmsCourseStructure with course_id', async () => {
      const result = await callTool('get_lms_course_structure', { course_id: 1 });
      expect(client.getLmsCourseStructure).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toContain('# Course Structure: Introduction to Web Development');
      expect(result.content[0].text).toContain('**Course ID**: 1');
      expect(result.content[0].text).toContain('## Getting Started (ID: 101, Order: 1)');
      expect(result.content[0].text).toContain('### Lessons');
      expect(result.content[0].text).toContain('- Welcome to the Course (ID: 1001, Order: 1) — 5:30');
    });

    it('handles empty sections', async () => {
      vi.mocked(client.getLmsCourseStructure).mockResolvedValueOnce(makeLmsCourseStructure({ sections: [] }));
      const result = await callTool('get_lms_course_structure', { course_id: 1 });
      expect(result.content[0].text).toContain('No sections found.');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getLmsCourseStructure).mockRejectedValueOnce(new Error('Structure error'));
      const result = await callTool('get_lms_course_structure', { course_id: 1 });
      expect(result.content[0].text).toContain('❌ Error getting LMS course structure');
    });
  });
});