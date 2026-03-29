import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Use a unique temp dir per test run
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elementify-test-'));
  process.env['ELEMENTIFY_CONFIG_PATH'] = path.join(tmpDir, 'config.json');
});

afterEach(() => {
  delete process.env['ELEMENTIFY_CONFIG_PATH'];
  fs.rmSync(tmpDir, { recursive: true, force: true });
  // Clear module cache so config re-reads the file
  vi.resetModules();
});

async function importConfig() {
  // Dynamic import after env var is set
  const mod = await import('../config.js');
  return mod;
}

const sampleConfig = {
  sites: [
    {
      id: 'site-a',
      name: 'Site A',
      url: 'https://site-a.example.com',
      apiKey: 'ek_aaaa',
      activationMode: 'standalone-free' as const,
      default: true,
    },
    {
      id: 'site-b',
      name: 'Site B',
      url: 'https://site-b.example.com',
      apiKey: 'ek_bbbb',
      activationMode: 'standalone-pro' as const,
      default: false,
    },
  ],
};

function writeConfig(obj: unknown): void {
  fs.writeFileSync(
    process.env['ELEMENTIFY_CONFIG_PATH']!,
    JSON.stringify(obj, null, 2),
    'utf-8',
  );
}

describe('loadConfig', () => {
  it('throws and creates example config when file does not exist', async () => {
    const { loadConfig } = await importConfig();
    expect(() => loadConfig()).toThrow(/No config found/);

    // Example config should have been written
    const written = JSON.parse(
      fs.readFileSync(process.env['ELEMENTIFY_CONFIG_PATH']!, 'utf-8'),
    );
    expect(written).toHaveProperty('sites');
    expect(Array.isArray(written.sites)).toBe(true);
  });

  it('throws on malformed JSON', async () => {
    fs.writeFileSync(process.env['ELEMENTIFY_CONFIG_PATH']!, '{not valid json}', 'utf-8');
    const { loadConfig } = await importConfig();
    expect(() => loadConfig()).toThrow();
  });

  it('throws when sites array is empty', async () => {
    writeConfig({ sites: [] });
    const { loadConfig } = await importConfig();
    expect(() => loadConfig()).toThrow(/no sites/i);
  });

  it('throws when sites key is missing', async () => {
    writeConfig({});
    const { loadConfig } = await importConfig();
    expect(() => loadConfig()).toThrow(/no sites/i);
  });

  it('returns parsed config for valid file', async () => {
    writeConfig(sampleConfig);
    const { loadConfig } = await importConfig();
    const config = loadConfig();
    expect(config.sites).toHaveLength(2);
    expect(config.sites[0]!.id).toBe('site-a');
  });
});

describe('listSites', () => {
  it('returns all configured sites', async () => {
    writeConfig(sampleConfig);
    const { listSites } = await importConfig();
    const sites = listSites();
    expect(sites).toHaveLength(2);
    expect(sites.map((s) => s.id)).toEqual(['site-a', 'site-b']);
  });
});

describe('getActiveSite', () => {
  beforeEach(async () => {
    writeConfig(sampleConfig);
  });

  it('returns default site when no siteId provided', async () => {
    const { getActiveSite } = await importConfig();
    const site = getActiveSite();
    expect(site.id).toBe('site-a');
    expect(site.default).toBe(true);
  });

  it('returns first site if no site has default=true', async () => {
    writeConfig({
      sites: [
        { id: 'only', name: 'Only', url: 'https://only.com', apiKey: 'ek_x', default: false },
      ],
    });
    const { getActiveSite } = await importConfig();
    const site = getActiveSite();
    expect(site.id).toBe('only');
  });

  it('returns specific site by ID', async () => {
    const { getActiveSite } = await importConfig();
    const site = getActiveSite('site-b');
    expect(site.id).toBe('site-b');
    expect(site.apiKey).toBe('ek_bbbb');
  });

  it('throws when requested siteId is not in config', async () => {
    const { getActiveSite } = await importConfig();
    expect(() => getActiveSite('nonexistent')).toThrow(/nonexistent/);
  });

  it('throws with list of available site IDs in error message', async () => {
    const { getActiveSite } = await importConfig();
    expect(() => getActiveSite('ghost')).toThrow(/site-a.*site-b|site-b.*site-a/);
  });
});

describe('getClient', () => {
  it('returns an ElementifyClient configured for the active site', async () => {
    writeConfig(sampleConfig);
    const { getClient } = await importConfig();
    const client = getClient();
    // Just verify it's a client-like object with expected methods
    expect(client).toBeDefined();
    expect(typeof client.listTemplates).toBe('function');
    expect(typeof client.getSiteInfo).toBe('function');
  });

  it('returns a client for a specific site by ID', async () => {
    writeConfig(sampleConfig);
    const { getClient } = await importConfig();
    const client = getClient('site-b');
    expect(client).toBeDefined();
  });
});

describe('saveConfig + setDefaultSite', () => {
  it('setDefaultSite updates the default flag on the correct site', async () => {
    writeConfig(sampleConfig);
    const { setDefaultSite, loadConfig } = await importConfig();

    setDefaultSite('site-b');

    const updated = loadConfig();
    const siteA = updated.sites.find((s) => s.id === 'site-a')!;
    const siteB = updated.sites.find((s) => s.id === 'site-b')!;

    expect(siteA.default).toBe(false);
    expect(siteB.default).toBe(true);
  });

  it('setDefaultSite throws when siteId is not found', async () => {
    writeConfig(sampleConfig);
    const { setDefaultSite } = await importConfig();
    expect(() => setDefaultSite('nope')).toThrow(/nope/);
  });
});
