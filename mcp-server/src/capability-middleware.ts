import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function withCapabilityCheck(
  toolName: string,
  handler: (args: any, client: any, siteId?: string) => Promise<any>,
) {
  return async (args: any, extra: any) => {
    try {
      return await handler(args, extra.client, extra.siteId);
    } catch (err: any) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  };
}

export type CapabilityMiddleware = typeof withCapabilityCheck;
