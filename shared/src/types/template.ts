export type ElementorTemplateType =
  | 'page'
  | 'section'
  | 'container'
  | 'widget'
  | 'popup'
  | 'kit'
  | 'global-widget';

export interface ElementifyTemplate {
  id: number;
  title: string;
  status: 'publish' | 'draft' | 'private' | 'trash';
  type: ElementorTemplateType;
  author: number;
  date: string;
  modified: string;
  elementor_data?: string; // raw JSON string from _elementor_data
  categories: string[];
  tags: string[];
  shortcode?: string;
}

export interface ElementifyTemplateList {
  templates: ElementifyTemplate[];
  total: number;
  total_pages: number;
}
