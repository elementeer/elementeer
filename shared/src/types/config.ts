import type { ActivationMode } from './auth.js';

export interface SiteConfig {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  activationMode?: ActivationMode;
  default?: boolean;
}

export interface ElementifyConfig {
  sites: SiteConfig[];
}
