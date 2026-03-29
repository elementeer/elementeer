export type ElementifyErrorCode =
  | 'auth_invalid_key'
  | 'auth_key_inactive'
  | 'auth_insufficient_scope' // key valid but lacks capability — NOT "invalid key"!
  | 'governance_blocked'
  | 'not_found'
  | 'elementor_not_active'
  | 'template_type_unsupported'
  | 'rate_limited';

export interface ElementifyError {
  code: ElementifyErrorCode;
  message: string;
  status: number;
}
