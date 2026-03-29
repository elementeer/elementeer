import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';
import { registerLibraryTools } from './library.js';
import { registerContentTools } from './content.js';
import { registerOrganizationTools } from './organization.js';
import { registerSiteTools } from './site.js';

export function registerAllTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {
  registerLibraryTools(server, getClient);
  registerContentTools(server, getClient);
  registerOrganizationTools(server, getClient);
  registerSiteTools(server, getClient);
}
