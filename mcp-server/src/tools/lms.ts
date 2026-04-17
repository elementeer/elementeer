import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

export function registerLmsTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  // ------------------------------------------------------------------ //
  // get_lms_status (LMS-001)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_lms_status',
    'Detect active LMS plugin (LearnDash, Tutor LMS, LifterLMS). Returns plugin name, version, course count.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
    },
    async ({ site_id }) => {
      try {
        const client = getClient(site_id);
        const status = await client.getLmsStatus();

        const lines: string[] = [
          '# LMS Status',
          `**LMS available**: ${status.lms_available ? 'Yes' : 'No'}`,
        ];

        if (status.lms_available) {
          lines.push(`**Plugin**: ${status.plugin}`);
          lines.push(`**Version**: ${status.version}`);
          lines.push(`**Course count**: ${status.course_count}`);
        } else {
          lines.push('\nNo active LMS plugin detected (LearnDash, Tutor LMS, or LifterLMS).');
          lines.push('Consider installing an LMS plugin for course management.');
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
            text: `❌ Error getting LMS status: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // list_lms_courses (LMS-002)
  // ------------------------------------------------------------------ //
  server.tool(
    'list_lms_courses',
    'List courses from the active LMS plugin with pagination. Includes title, status, price, student count.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      page: z.number().optional().default(1).describe('Page number'),
      per_page: z.number().optional().default(20).describe('Items per page (max 100)'),
    },
    async ({ site_id, page, per_page }) => {
      try {
        const client = getClient(site_id);
        const courses = await client.listLmsCourses({ page, per_page });

        const lines: string[] = [
          '# LMS Courses',
          `**Total courses**: ${courses.total}`,
          `**Page**: ${courses.page} of ${courses.total_pages}`,
          `**Per page**: ${courses.per_page}`,
        ];

        if (courses.courses.length === 0) {
          lines.push('\nNo courses found.');
        } else {
          lines.push('\n## Courses');
          lines.push('| ID | Title | Status | Price | Students | URL |');
          lines.push('|----|-------|--------|-------|----------|-----|');
          for (const course of courses.courses.slice(0, 20)) {
            lines.push(`| ${course.id} | ${course.title.substring(0, 40)}${course.title.length > 40 ? '…' : ''} | ${course.status} | ${course.price ?? '—'} | ${course.students_count ?? '—'} | ${course.url.substring(0, 30)}… |`);
          }
          if (courses.courses.length > 20) {
            lines.push(`| … ${courses.courses.length - 20} more … |`);
          }
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
            text: `❌ Error listing LMS courses: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );

  // ------------------------------------------------------------------ //
  // get_lms_course_structure (LMS-002 extended)
  // ------------------------------------------------------------------ //
  server.tool(
    'get_lms_course_structure',
    'Get detailed structure of a course: sections, lessons, quizzes.',
    {
      site_id: z.string().optional().describe('Site ID from config (defaults to active site)'),
      course_id: z.number().describe('Course ID'),
    },
    async ({ site_id, course_id }) => {
      try {
        const client = getClient(site_id);
        const structure = await client.getLmsCourseStructure(course_id);

        const lines: string[] = [
          `# Course Structure: ${structure.title}`,
          `**Course ID**: ${structure.course_id}`,
        ];

        if (structure.sections.length === 0) {
          lines.push('\nNo sections found.');
        } else {
          lines.push(`\n**Sections**: ${structure.sections.length}`);
          for (const section of structure.sections) {
            lines.push(`\n## ${section.title} (ID: ${section.id}, Order: ${section.order})`);
            if (section.lessons.length > 0) {
              lines.push('### Lessons');
              for (const lesson of section.lessons) {
                lines.push(`- ${lesson.title} (ID: ${lesson.id}, Order: ${lesson.order}) ${lesson.duration ? `— ${lesson.duration}` : ''}`);
              }
            }
            if (section.quizzes && section.quizzes.length > 0) {
              lines.push('### Quizzes');
              for (const quiz of section.quizzes) {
                lines.push(`- ${quiz.title} (ID: ${quiz.id}, Order: ${quiz.order}) ${quiz.question_count ? `— ${quiz.question_count} questions` : ''}`);
              }
            }
          }
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
            text: `❌ Error getting LMS course structure: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    },
  );
}