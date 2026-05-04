import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerChangeQueueTools } from '../../tools/change-queue.js';
import type { ElementifyClient, QueuedChange } from '../../client.js';

// ------------------------------------------------------------------ //
// Fixtures
// ------------------------------------------------------------------ //

function makeChange(overrides: Partial<QueuedChange> = {}): QueuedChange {
  return {
    id:           'chg_abc123',
    created_at:   '2026-03-30T10:00:00+00:00',
    status:       'pending',
    operation:    'set_global_colors',
    params:       { colors: [{ title: 'Primary', color: '#1A56DB' }], slot: 'system' },
    note:         'Update brand color',
    before_state: { colors: [{ title: 'Primary', color: '#000000' }] },
    reviewed_at:  null,
    review_note:  null,
    applied_at:   null,
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<keyof ElementifyClient, unknown>> = {}): ElementifyClient {
  return {
    createChange:         vi.fn().mockResolvedValue(makeChange()),
    listChanges:          vi.fn().mockResolvedValue({ changes: [makeChange()], total: 1 }),
    getChange:            vi.fn().mockResolvedValue(makeChange({ status: 'approved' })),
    updateChangeStatus:   vi.fn().mockResolvedValue(makeChange({ status: 'approved' })),
    setGlobalColors:      vi.fn().mockResolvedValue({ kit_id: 1, slot: 'system', colors: [], updated: true }),
    setGlobalTypography:  vi.fn().mockResolvedValue({ kit_id: 1, slot: 'system', typography: [], updated: true }),
    updateTemplateData:   vi.fn().mockResolvedValue({ id: 1, updated: true }),
    updatePageData:       vi.fn().mockResolvedValue({ id: 1, updated: true }),
    createTemplate:       vi.fn().mockResolvedValue({ id: 1, title: 'New', type: 'section', status: 'publish', author: 1, date: '', modified: '', categories: [], tags: [] }),
    setLogo:              vi.fn().mockResolvedValue({ logo_id: 1, logo_url: null, updated: true }),
    setSiteContext:       vi.fn().mockResolvedValue({ user_role: 'site-owner', site_purpose: null, brand_notes: null, target_audience: null, primary_language: null, set_at: '' }),
    ...overrides,
  } as unknown as ElementifyClient;
}

// ------------------------------------------------------------------ //
// Test setup
// ------------------------------------------------------------------ //

describe.skip('change queue tools', () => {
  let server: McpServer;
  let client: ElementifyClient;
  let getClient: (siteId?: string) => ElementifyClient;
  let handlers: Map<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>>;

  beforeEach(() => {
    server  = new McpServer({ name: 'test', version: '0.0.0' });
    client  = makeClient();
    getClient = vi.fn().mockReturnValue(client);
    handlers  = new Map();

    vi.spyOn(server, 'tool').mockImplementation((...args: Parameters<typeof server.tool>) => {
      handlers.set(args[0] as string, args[args.length - 1] as never);
      return server as never;
    });

    registerChangeQueueTools(server, getClient);
  });

  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const h = handlers.get(name);
    if (!h) throw new Error(`Tool "${name}" not registered`);
    return h(args);
  };

  // ---------------------------------------------------------------- //
  // queue_change
  // ---------------------------------------------------------------- //
  describe('queue_change', () => {
    it('calls client.createChange with correct params', async () => {
      const result = await call('queue_change', {
        operation:    'set_global_colors',
        params:       { colors: [{ title: 'Primary', color: '#1A56DB' }] },
        note:         'Update brand color',
        before_state: { colors: [{ title: 'Primary', color: '#000000' }] },
      });

      expect(client.createChange).toHaveBeenCalledWith({
        operation:    'set_global_colors',
        params:       { colors: [{ title: 'Primary', color: '#1A56DB' }] },
        note:         'Update brand color',
        before_state: { colors: [{ title: 'Primary', color: '#000000' }] },
      });

      const text = result.content[0]!.text;
      expect(text).toContain('queued for review');
      expect(text).toContain('chg_abc123');
    });

    it('shows the operation name in output', async () => {
      const result = await call('queue_change', {
        operation: 'set_global_colors',
        params:    {},
      });
      expect(result.content[0]!.text).toContain('set_global_colors');
    });

    it('rejects unsupported operations', async () => {
      const result = await call('queue_change', {
        operation: 'delete_everything',
        params:    {},
      });
      const text = result.content[0]!.text;
      expect(text).toContain('not supported');
      expect(text).toContain('delete_everything');
      expect(client.createChange).not.toHaveBeenCalled();
    });

    it('shows next-step instructions', async () => {
      const result = await call('queue_change', { operation: 'set_global_colors', params: {} });
      const text   = result.content[0]!.text;
      expect(text).toContain('review_change');
      expect(text).toContain('apply_change');
    });

    it('passes site_id to getClient', async () => {
      await call('queue_change', { operation: 'set_global_colors', params: {}, site_id: 'staging' });
      expect(getClient).toHaveBeenCalledWith('staging');
    });
  });

  // ---------------------------------------------------------------- //
  // list_change_queue
  // ---------------------------------------------------------------- //
  describe('list_change_queue', () => {
    it('lists pending changes by default', async () => {
      const result = await call('list_change_queue', {});
      expect(client.listChanges).toHaveBeenCalledWith('pending');

      const text = result.content[0]!.text;
      expect(text).toContain('Change Queue');
      expect(text).toContain('chg_abc123');
    });

    it('passes status filter to client', async () => {
      await call('list_change_queue', { status: 'approved' });
      expect(client.listChanges).toHaveBeenCalledWith('approved');
    });

    it('shows "no changes" message when queue is empty', async () => {
      vi.mocked(client.listChanges).mockResolvedValueOnce({ changes: [], total: 0 });

      const result = await call('list_change_queue', { status: 'pending' });
      expect(result.content[0]!.text).toContain('No pending changes');
    });

    it('shows change details including operation and status', async () => {
      const result = await call('list_change_queue', { status: 'all' });
      const text   = result.content[0]!.text;
      expect(text).toContain('set_global_colors');
      expect(text).toContain('pending');
    });

    it('shows before_state when present', async () => {
      const result = await call('list_change_queue', {});
      expect(result.content[0]!.text).toContain('Before:');
    });

    it('shows review instructions for pending filter', async () => {
      const result = await call('list_change_queue', { status: 'pending' });
      expect(result.content[0]!.text).toContain('review_change');
    });
  });

  // ---------------------------------------------------------------- //
  // review_change
  // ---------------------------------------------------------------- //
  describe('review_change', () => {
    it('calls updateChangeStatus with approved', async () => {
      vi.mocked(client.updateChangeStatus).mockResolvedValueOnce(makeChange({ status: 'approved' }));

      const result = await call('review_change', { change_id: 'chg_abc123', action: 'approve' });

      expect(client.updateChangeStatus).toHaveBeenCalledWith('chg_abc123', 'approved', undefined);
      expect(result.content[0]!.text).toContain('approved');
      expect(result.content[0]!.text).toContain('apply_change');
    });

    it('calls updateChangeStatus with rejected', async () => {
      vi.mocked(client.updateChangeStatus).mockResolvedValueOnce(makeChange({ status: 'rejected' }));

      const result = await call('review_change', {
        change_id: 'chg_abc123',
        action:    'reject',
        reason:    'Not ready',
      });

      expect(client.updateChangeStatus).toHaveBeenCalledWith('chg_abc123', 'rejected', 'Not ready');
      const text = result.content[0]!.text;
      expect(text).toContain('rejected');
      expect(text).toContain('Not ready');
    });

    it('shows the reason in output', async () => {
      vi.mocked(client.updateChangeStatus).mockResolvedValueOnce(makeChange({ status: 'approved' }));

      const result = await call('review_change', {
        change_id: 'chg_abc123',
        action:    'approve',
        reason:    'Looks good',
      });
      expect(result.content[0]!.text).toContain('Looks good');
    });

    it('shows operation name in output', async () => {
      vi.mocked(client.updateChangeStatus).mockResolvedValueOnce(makeChange({ status: 'approved' }));

      const result = await call('review_change', { change_id: 'chg_abc123', action: 'approve' });
      expect(result.content[0]!.text).toContain('set_global_colors');
    });
  });

  // ---------------------------------------------------------------- //
  // apply_change
  // ---------------------------------------------------------------- //
  describe('apply_change', () => {
    it('executes set_global_colors and marks as applied', async () => {
      vi.mocked(client.getChange).mockResolvedValueOnce(
        makeChange({ status: 'approved', operation: 'set_global_colors' }),
      );
      vi.mocked(client.updateChangeStatus).mockResolvedValueOnce(makeChange({ status: 'applied' }));

      const result = await call('apply_change', { change_id: 'chg_abc123' });

      expect(client.setGlobalColors).toHaveBeenCalledWith(
        [{ title: 'Primary', color: '#1A56DB' }],
        'system',
      );
      expect(client.updateChangeStatus).toHaveBeenCalledWith('chg_abc123', 'applied');

      const text = result.content[0]!.text;
      expect(text).toContain('applied');
      expect(text).toContain('chg_abc123');
    });

    it('executes update_page_data with correct params', async () => {
      vi.mocked(client.getChange).mockResolvedValueOnce(
        makeChange({
          status:    'approved',
          operation: 'update_page_data',
          params:    { page_id: 42, elementor_data: [{ type: 'section' }] },
        }),
      );

      await call('apply_change', { change_id: 'chg_abc123' });

      expect(client.updatePageData).toHaveBeenCalledWith(42, [{ type: 'section' }]);
    });

    it('rejects change with status !== approved', async () => {
      vi.mocked(client.getChange).mockResolvedValueOnce(makeChange({ status: 'pending' }));

      const result = await call('apply_change', { change_id: 'chg_abc123' });
      const text   = result.content[0]!.text;

      expect(text).toContain('Cannot apply');
      expect(text).toContain('"pending"');
      expect(client.setGlobalColors).not.toHaveBeenCalled();
    });

    it('rejects change with status rejected', async () => {
      vi.mocked(client.getChange).mockResolvedValueOnce(makeChange({ status: 'rejected' }));

      const result = await call('apply_change', { change_id: 'chg_abc123' });
      expect(result.content[0]!.text).toContain('Cannot apply');
    });

    it('handles execution error gracefully', async () => {
      vi.mocked(client.getChange).mockResolvedValueOnce(
        makeChange({ status: 'approved', operation: 'set_global_colors' }),
      );
      vi.mocked(client.setGlobalColors).mockRejectedValueOnce(new Error('API unreachable'));

      const result = await call('apply_change', { change_id: 'chg_abc123' });
      const text   = result.content[0]!.text;

      expect(text).toContain('Failed to apply');
      expect(text).toContain('API unreachable');
      // Should NOT mark as applied on failure
      expect(client.updateChangeStatus).not.toHaveBeenCalled();
    });

    it('rejects unknown operations gracefully', async () => {
      vi.mocked(client.getChange).mockResolvedValueOnce(
        makeChange({ status: 'approved', operation: 'unknown_op' }),
      );

      const result = await call('apply_change', { change_id: 'chg_abc123' });
      expect(result.content[0]!.text).toContain('no executor');
    });

    it('executes set_site_context correctly', async () => {
      vi.mocked(client.getChange).mockResolvedValueOnce(
        makeChange({
          status:    'approved',
          operation: 'set_site_context',
          params:    { user_role: 'agency', site_purpose: 'corporate' },
        }),
      );

      await call('apply_change', { change_id: 'chg_abc123' });

      expect(client.setSiteContext).toHaveBeenCalledWith({
        user_role: 'agency',
        site_purpose: 'corporate',
      });
    });

    it('passes site_id to getClient', async () => {
      await call('apply_change', { change_id: 'chg_abc123', site_id: 'production' });
      expect(getClient).toHaveBeenCalledWith('production');
    });
  });
});
