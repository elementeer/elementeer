# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| main    | ✅ Active support |
| Latest release | ✅ Active support |
| Older releases | Best-effort |

## Reporting a Vulnerability

Please **do not** open public GitHub issues for security vulnerabilities.

Use [GitHub Private Security Advisories](https://github.com/Vamerli/elementify-mcp/security/advisories/new) to report privately.

**Response timeline:**
- Initial acknowledgment: 5 business days
- Status update: 10 business days from acknowledgment
- Coordinated disclosure after remediation

## Scope

In scope: auth bypass, API key leakage, privilege escalation, injection via Elementor data, unsafe file handling, impactful dependency vulnerabilities.

Out of scope: issues requiring physical access, social engineering, issues in unsupported versions.

## Operational Security

- Never commit `.env` files or API keys
- Store WordPress credentials outside the repository
- Use governance settings to restrict key capabilities
- Rotate API keys regularly via the admin panel
