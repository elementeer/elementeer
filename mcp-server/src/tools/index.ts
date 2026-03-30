import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { registerLibraryTools } from './library.js';
import { registerContentTools } from './content.js';
import { registerOrganizationTools } from './organization.js';
import { registerSiteTools } from './site.js';
import { registerPageTools } from './pages.js';
import { registerAssessmentTools } from './assessment.js';
import { registerRecommendationTools } from './recommendations.js';
import { registerGlobalStylesTools } from './global-styles.js';
import { registerWizardTools } from './wizard.js';
import { registerStockImageTools } from './stock-images.js';
import { registerChangeQueueTools } from './change-queue.js';

export function registerAllTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  registerLibraryTools(server, getClient);
  registerContentTools(server, getClient);
  registerOrganizationTools(server, getClient);
  registerSiteTools(server, getClient);
  registerPageTools(server, getClient);
  registerAssessmentTools(server, getClient);
  registerRecommendationTools(server, getClient);
  registerGlobalStylesTools(server, getClient);
  registerWizardTools(server, getClient);
  registerStockImageTools(server, getClient);
  registerChangeQueueTools(server, getClient);
}
