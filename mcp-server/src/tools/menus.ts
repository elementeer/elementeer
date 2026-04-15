import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElementifyClient } from '../client.js';

export function registerMenuTools(
  server: McpServer,
  getClient: (siteId?: string) => ElementifyClient,
): void {

  // list_menus
  server.tool(
    'list_menus',
    'List all navigation menus on the WordPress site. Use this to see existing menus and their IDs.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const result = await client.listMenus();
      const rows = result.menus.map(menu =>
        `  [${menu.id}] ${menu.name} — ${menu.count} items, slug: ${menu.slug}`
      );
      return {
        content: [{ type: 'text', text: `Menus (${result.total} total):\n${rows.join('\n')}` }],
      };
    },
  );

  // create_menu
  server.tool(
    'create_menu',
    'Create a new navigation menu. Provide a name for the menu.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      name: z.string().describe('Name of the new menu'),
    },
    async ({ site_id, name }) => {
      const client = getClient(site_id);
      const result = await client.createMenu({ name });
      return {
        content: [{
          type: 'text',
          text: `Menu "${result.menu.name}" created with ID ${result.menu.id}.\n${result.message}`,
        }],
      };
    },
  );

  // delete_menu
  server.tool(
    'delete_menu',
    'Delete a navigation menu by ID. Note: This will also delete all menu items in the menu.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      id: z.number().int().describe('Menu ID to delete'),
    },
    async ({ site_id, id }) => {
      const client = getClient(site_id);
      const result = await client.deleteMenu(id);
      return {
        content: [{ type: 'text', text: result.message }],
      };
    },
  );

  // list_menu_items
  server.tool(
    'list_menu_items',
    'List all menu items in a specific menu. Use this to see the structure of a menu.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      menu_id: z.number().int().describe('Menu ID'),
    },
    async ({ site_id, menu_id }) => {
      const client = getClient(site_id);
      const result = await client.listMenuItems({ menu_id });
      const rows = result.items.map(item =>
        `  [${item.id}] ${item.label} → ${item.url} (parent: ${item.parent}, position: ${item.position})`
      );
      return {
        content: [{ type: 'text', text: `Menu Items (${result.total} total):\n${rows.join('\n')}` }],
      };
    },
  );

  // create_menu_item
  server.tool(
    'create_menu_item',
    'Create a new menu item in a menu. Provide label, URL, optional parent ID and position.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      menu_id: z.number().int().describe('Menu ID'),
      label: z.string().describe('Display label for the menu item'),
      url: z.string().describe('URL the menu item links to'),
      parent: z.number().int().optional().describe('Parent menu item ID (for nested menus)'),
      position: z.number().int().optional().describe('Position in the menu (0 for first)'),
    },
    async ({ site_id, menu_id, label, url, parent, position }) => {
      const client = getClient(site_id);
      const result = await client.createMenuItem({ menu_id, label, url, parent, position });
      return {
        content: [{
          type: 'text',
          text: `Menu item "${result.item.label}" created with ID ${result.item.id}.\n${result.message}`,
        }],
      };
    },
  );

  // update_menu_item
  server.tool(
    'update_menu_item',
    'Update an existing menu item. You can change label, URL, parent, or position.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      id: z.number().int().describe('Menu item ID to update'),
      menu_id: z.number().int().describe('Menu ID (required for update)'),
      label: z.string().optional().describe('New label'),
      url: z.string().optional().describe('New URL'),
      parent: z.number().int().optional().describe('New parent ID'),
      position: z.number().int().optional().describe('New position'),
    },
    async ({ site_id, id, menu_id, label, url, parent, position }) => {
      const client = getClient(site_id);
      const result = await client.updateMenuItem({ id, menu_id, label, url, parent, position });
      return {
        content: [{
          type: 'text',
          text: `Menu item ${result.item.id} updated.\n${result.message}`,
        }],
      };
    },
  );

  // delete_menu_item
  server.tool(
    'delete_menu_item',
    'Delete a menu item by ID.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      id: z.number().int().describe('Menu item ID to delete'),
    },
    async ({ site_id, id }) => {
      const client = getClient(site_id);
      const result = await client.deleteMenuItem(id);
      return {
        content: [{ type: 'text', text: result.message }],
      };
    },
  );

  // list_menu_locations
  server.tool(
    'list_menu_locations',
    'List all available theme menu locations and which menu is assigned to each.',
    {
      site_id: z.string().optional().describe('Site ID from config'),
    },
    async ({ site_id }) => {
      const client = getClient(site_id);
      const result = await client.listMenuLocations();
      const rows = result.locations.map(loc =>
        `  ${loc.location}: ${loc.description} → Menu ID: ${loc.menu_id ?? 'none'}`
      );
      return {
        content: [{ type: 'text', text: `Menu Locations (${result.total} total):\n${rows.join('\n')}` }],
      };
    },
  );

  // assign_menu_location
  server.tool(
    'assign_menu_location',
    'Assign a menu to a theme location (e.g., "primary", "footer").',
    {
      site_id: z.string().optional().describe('Site ID from config'),
      menu_id: z.number().int().describe('Menu ID to assign'),
      location: z.string().describe('Theme location slug (e.g., "primary", "footer")'),
    },
    async ({ site_id, menu_id, location }) => {
      const client = getClient(site_id);
      const result = await client.assignMenuLocation({ menu_id, location });
      return {
        content: [{ type: 'text', text: `${result.message}\nLocation: ${result.location}, Menu ID: ${result.menu_id}` }],
      };
    },
  );
}