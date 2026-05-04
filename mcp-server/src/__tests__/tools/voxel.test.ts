import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerVoxelTools } from '../../tools/voxel.js';
import type { ElementifyClient, VoxelStatus, VoxelPostTypeList, VoxelPostTypeDetail, VoxelTaxonomyList, VoxelProductTypeList, VoxelSettings, VoxelHealth } from '../../client.js';

function makeVoxelStatus(overrides: Partial<VoxelStatus> = {}): VoxelStatus {
  return {
    voxel_available: true,
    version: '1.3.20',
    post_type_count: 3,
    taxonomy_count: 5,
    product_type_count: 2,
    ...overrides,
  };
}

function makeVoxelPostTypeList(overrides: Partial<VoxelPostTypeList> = {}): VoxelPostTypeList {
  return {
    post_types: [
      { key: 'profile', label: 'Profiles', singular: 'Profile', is_public: true, is_editable: true },
      { key: 'listing', label: 'Listings', singular: 'Listing', is_public: true, is_editable: true },
    ],
    total: 2,
    ...overrides,
  };
}

function makeVoxelPostTypeDetail(overrides: Partial<VoxelPostTypeDetail> = {}): VoxelPostTypeDetail {
  return {
    key: 'profile',
    label: 'Profiles',
    singular: 'Profile',
    is_public: true,
    is_editable: true,
    fields: [
      { key: 'name', type: 'text', label: 'Name' },
      { key: 'bio', type: 'textarea', label: 'Biography' },
    ],
    ...overrides,
  };
}

function makeVoxelTaxonomyList(overrides: Partial<VoxelTaxonomyList> = {}): VoxelTaxonomyList {
  return {
    taxonomies: [
      { key: 'category', label: 'Categories', singular: 'Category', post_type: 'listing' },
      { key: 'tag', label: 'Tags', singular: 'Tag', post_type: 'listing' },
    ],
    total: 2,
    ...overrides,
  };
}

function makeVoxelSettings(overrides: Partial<VoxelSettings> = {}): VoxelSettings {
  return {
    settings: {
      general: { site_name: 'My Community' },
      email: { sender_name: 'Admin', sender_email: 'admin@example.com' },
    },
    ...overrides,
  };
}

function makeVoxelProductTypeList(overrides: Partial<VoxelProductTypeList> = {}): VoxelProductTypeList {
  return {
    product_types: [
      { key: 'subscription', label: 'Subscription' },
      { key: 'booking', label: 'Booking' },
    ],
    total: 2,
    ...overrides,
  };
}

function makeVoxelHealth(overrides: Partial<VoxelHealth> = {}): VoxelHealth {
  return {
    healthy: true,
    issues: [],
    rest_reachable: true,
    tables_healthy: true,
    memory_usage_mb: 45.2,
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    getVoxelStatus: vi.fn().mockResolvedValue(makeVoxelStatus()),
    listVoxelPostTypes: vi.fn().mockResolvedValue(makeVoxelPostTypeList()),
    getVoxelPostType: vi.fn().mockResolvedValue(makeVoxelPostTypeDetail()),
    listVoxelTaxonomies: vi.fn().mockResolvedValue(makeVoxelTaxonomyList()),
    listVoxelProductTypes: vi.fn().mockResolvedValue(makeVoxelProductTypeList()),
    getVoxelSettings: vi.fn().mockResolvedValue(makeVoxelSettings()),
    getVoxelHealth: vi.fn().mockResolvedValue(makeVoxelHealth()),
    assessSite: vi.fn(),
    getSiteInfo: vi.fn(),
    getSiteContext: vi.fn(),
    listTemplates: vi.fn(),
    ...overrides,
  } as unknown as ElementifyClient;
}

describe('Voxel tools', () => {
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
      const handler = args[args.length - 1] as (args: Record<string, unknown>) => Promise<unknown>;
      toolHandlers.set(name, handler);
      return server as any;
    });

    registerVoxelTools(server, getClient);
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const handler = toolHandlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(args) as Promise<any>;
  }

  describe('get_voxel_status', () => {
    it('calls getVoxelStatus and returns formatted output', async () => {
      const result = await callTool('get_voxel_status', { site_id: 'test-site' });
      expect(client.getVoxelStatus).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Voxel Status');
      expect(result.content[0].text).toContain('**Voxel available**: Yes');
      expect(result.content[0].text).toContain('**Version**: 1.3.20');
      expect(result.content[0].text).toContain('**Post types**: 3');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getVoxelStatus).mockRejectedValueOnce(new Error('Network error'));
      const result = await callTool('get_voxel_status', {});
      expect(result.content[0].text).toContain('Error getting Voxel status');
    });

    it('shows missing plugin message when Voxel not available', async () => {
      vi.mocked(client.getVoxelStatus).mockResolvedValueOnce(makeVoxelStatus({ voxel_available: false }));
      const result = await callTool('get_voxel_status', {});
      expect(result.content[0].text).toContain('Voxel plugin is not detected');
    });
  });

  describe('list_voxel_post_types', () => {
    it('calls listVoxelPostTypes and returns table', async () => {
      const result = await callTool('list_voxel_post_types', {});
      expect(client.listVoxelPostTypes).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Voxel Post Types');
      expect(result.content[0].text).toContain('**Total**: 2');
      expect(result.content[0].text).toContain('| profile | Profiles | Profile | Yes | Yes |');
    });

    it('handles empty list', async () => {
      vi.mocked(client.listVoxelPostTypes).mockResolvedValueOnce(makeVoxelPostTypeList({ post_types: [] }));
      const result = await callTool('list_voxel_post_types', {});
      expect(result.content[0].text).toContain('No post types found.');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.listVoxelPostTypes).mockRejectedValueOnce(new Error('API error'));
      const result = await callTool('list_voxel_post_types', {});
      expect(result.content[0].text).toContain('Error listing Voxel post types');
    });
  });

  describe('get_voxel_post_type', () => {
    it('calls getVoxelPostType with the post type key', async () => {
      const result = await callTool('get_voxel_post_type', { post_type: 'profile' });
      expect(client.getVoxelPostType).toHaveBeenCalledWith('profile');
      expect(result.content[0].text).toContain('Post Type: Profiles');
      expect(result.content[0].text).toContain('**Singular**: Profile');
      expect(result.content[0].text).toContain('| name | text | Name |');
    });

    it('shows error when post type not found', async () => {
      vi.mocked(client.getVoxelPostType).mockResolvedValueOnce(makeVoxelPostTypeDetail({ error: 'Post type not found' }));
      const result = await callTool('get_voxel_post_type', { post_type: 'nonexistent' });
      expect(result.content[0].text).toContain('Error: Post type not found');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getVoxelPostType).mockRejectedValueOnce(new Error('Not found'));
      const result = await callTool('get_voxel_post_type', { post_type: 'profile' });
      expect(result.content[0].text).toContain('Error getting Voxel post type');
    });
  });

  describe('list_voxel_taxonomies', () => {
    it('calls listVoxelTaxonomies and returns table', async () => {
      const result = await callTool('list_voxel_taxonomies', {});
      expect(client.listVoxelTaxonomies).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Voxel Taxonomies');
      expect(result.content[0].text).toContain('| category | Categories | Category | listing |');
    });

    it('handles empty list', async () => {
      vi.mocked(client.listVoxelTaxonomies).mockResolvedValueOnce(makeVoxelTaxonomyList({ taxonomies: [] }));
      const result = await callTool('list_voxel_taxonomies', {});
      expect(result.content[0].text).toContain('No taxonomies found.');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.listVoxelTaxonomies).mockRejectedValueOnce(new Error('API error'));
      const result = await callTool('list_voxel_taxonomies', {});
      expect(result.content[0].text).toContain('Error listing Voxel taxonomies');
    });
  });

  describe('list_voxel_product_types', () => {
    it('calls listVoxelProductTypes and returns table', async () => {
      const result = await callTool('list_voxel_product_types', {});
      expect(client.listVoxelProductTypes).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Voxel Product Types');
      expect(result.content[0].text).toContain('**Total**: 2');
      expect(result.content[0].text).toContain('| subscription | Subscription |');
    });

    it('handles empty list', async () => {
      vi.mocked(client.listVoxelProductTypes).mockResolvedValueOnce(makeVoxelProductTypeList({ product_types: [] }));
      const result = await callTool('list_voxel_product_types', {});
      expect(result.content[0].text).toContain('No product types found.');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.listVoxelProductTypes).mockRejectedValueOnce(new Error('API error'));
      const result = await callTool('list_voxel_product_types', {});
      expect(result.content[0].text).toContain('Error listing Voxel product types');
    });
  });

  describe('get_voxel_settings', () => {
    it('calls getVoxelSettings and returns settings', async () => {
      const result = await callTool('get_voxel_settings', {});
      expect(client.getVoxelSettings).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Voxel Settings');
      expect(result.content[0].text).toContain('**general**');
      expect(result.content[0].text).toContain('**email**');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getVoxelSettings).mockRejectedValueOnce(new Error('API error'));
      const result = await callTool('get_voxel_settings', {});
      expect(result.content[0].text).toContain('Error getting Voxel settings');
    });
  });

  describe('get_voxel_health', () => {
    it('calls getVoxelHealth and returns health report', async () => {
      const result = await callTool('get_voxel_health', {});
      expect(client.getVoxelHealth).toHaveBeenCalledWith();
      expect(result.content[0].text).toContain('# Voxel Health Check');
      expect(result.content[0].text).toContain('**Healthy**: Yes');
      expect(result.content[0].text).toContain('**REST API reachable**: Yes');
      expect(result.content[0].text).toContain('**Tables healthy**: Yes');
      expect(result.content[0].text).toContain('**Memory usage**: 45.2 MB');
    });

    it('lists issues when unhealthy', async () => {
      vi.mocked(client.getVoxelHealth).mockResolvedValueOnce(makeVoxelHealth({
        healthy: false,
        issues: ['REST API endpoint not reachable', 'Missing voxel_posts table'],
      }));
      const result = await callTool('get_voxel_health', {});
      expect(result.content[0].text).toContain('**Healthy**: No');
      expect(result.content[0].text).toContain('REST API endpoint not reachable');
      expect(result.content[0].text).toContain('Missing voxel_posts table');
    });

    it('handles errors gracefully', async () => {
      vi.mocked(client.getVoxelHealth).mockRejectedValueOnce(new Error('Health check failed'));
      const result = await callTool('get_voxel_health', {});
      expect(result.content[0].text).toContain('Error running Voxel health check');
    });
  });
});
