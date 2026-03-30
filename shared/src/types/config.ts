import type { ActivationMode } from './auth.js';

export interface SiteConfig {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  activationMode?: ActivationMode;
  default?: boolean;
}

export interface ElementifyIntegrations {
  pexels_api_key?: string;
  unsplash_access_key?: string;
  openai_api_key?: string;
}

export interface ElementifyConfig {
  sites: SiteConfig[];
  integrations?: ElementifyIntegrations;
}
