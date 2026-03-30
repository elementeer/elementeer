import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ElementifyConfig, SiteConfig } from '@elementify/shared';
import { ElementifyClient } from './client.js';

const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.elementify', 'config.json');

function getConfigPath(): string {
  return process.env['ELEMENTIFY_CONFIG_PATH']
    ? path.resolve(process.env['ELEMENTIFY_CONFIG_PATH'].replace(/^~/, os.homedir()))
    : DEFAULT_CONFIG_PATH;
}

const EXAMPLE_CONFIG: ElementifyConfig = {
  sites: [
    {
      id: 'my-site',
      name: 'My WordPress Site',
      url: 'https://example.com',
      apiKey: 'ek_replace_with_your_api_key',
      activationMode: 'standalone-free',
      default: true,
    },
  ],
};

export function loadConfig(): ElementifyConfig {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    // Write example config so the user has something to edit
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(EXAMPLE_CONFIG, null, 2), 'utf-8');
    throw new Error(
      `No config found. Created example at ${configPath} — please edit it with your site URL and API key.`,
    );
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as ElementifyConfig;

  if (!parsed.sites || !Array.isArray(parsed.sites) || parsed.sites.length === 0) {
    throw new Error(`Config at ${configPath} has no sites defined.`);
  }

  return parsed;
}

export function listSites(): SiteConfig[] {
  return loadConfig().sites;
}

export function getActiveSite(siteId?: string): SiteConfig {
  const config = loadConfig();

  if (siteId) {
    const site = config.sites.find((s) => s.id === siteId);
    if (!site) {
      throw new Error(`Site "${siteId}" not found in config. Available: ${config.sites.map((s) => s.id).join(', ')}`);
    }
    return site;
  }

  const defaultSite = config.sites.find((s) => s.default) ?? config.sites[0];
  if (!defaultSite) {
    throw new Error('No sites configured.');
  }
  return defaultSite;
}

export function getClient(siteId?: string): ElementifyClient {
  const site = getActiveSite(siteId);
  return new ElementifyClient(site.url, site.apiKey);
}

export function saveConfig(config: ElementifyConfig): void {
  const configPath = getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export function setDefaultSite(siteId: string): void {
  const config = loadConfig();
  const site = config.sites.find((s) => s.id === siteId);
  if (!site) {
    throw new Error(`Site "${siteId}" not found.`);
  }
  config.sites.forEach((s) => {
    s.default = s.id === siteId;
  });
  saveConfig(config);
}

export function getIntegrations(): { pexels_api_key?: string; unsplash_access_key?: string; openai_api_key?: string } {
  try {
    const config = loadConfig();
    return (config as { integrations?: { pexels_api_key?: string; unsplash_access_key?: string; openai_api_key?: string } }).integrations ?? {};
  } catch {
    return {};
  }
}
