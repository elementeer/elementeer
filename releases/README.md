# Elementify Release Artifacts

This directory contains all official release artifacts for the Elementify WordPress plugin, organized by version.

## Naming Convention (Non-Negotiable)

**ALL Elementify plugin release ZIP files MUST follow this naming pattern:**

```
elementify.X.Y.Z.zip
```

Where:
- `X.Y.Z` is the semantic version (e.g., `2.0.1`)
- The name MUST include a space between "Elementify" and "v"
- The version MUST be prefixed with "v" (lowercase)
- Example: `elementify.2.0.1.zip`

### Variant Releases

For specialized builds or variants, use parenthetical descriptors:

```
elementify.X.Y.Z (variant-description).zip
```

Examples:
- `elementify.2.0.0.zip` - Main release ZIP
- `elementify.2.0.0-fixed.zip` - Bug-fixed variant
- `elementify.2.0.0-wordpress.zip` - WordPress.org specific variant

## Directory Structure

```
releases/
├── X.Y.Z/                    # Version-specific directory
│   ├── elementify.X.Y.Z.zip          # Main release ZIP
│   ├── elementify.X.Y.Z.sha256       # SHA256 checksum
│   ├── RELEASE_NOTES_X.Y.Z.md         # Release notes
│   └── RELEASE_VALIDATION_*.md        # Validation reports
├── README.md                 # This file
└── ...
```

## SHA256 Checksums

Every release ZIP MUST include a corresponding `.sha256` checksum file with the same base name:

```
elementify.2.0.1.zip
elementify.2.0.1.sha256
```

The checksum file contains the SHA256 hash of the ZIP file for verification:

```
b64640a9e1251272ca63944ce3941ca298a99c4f75eeae8a843a60a7dc91f664
```

## MCP Server Releases

MCP server releases are stored separately in the `mcp-releases/` directory (not in this releases directory) and follow a different naming pattern:

```
elementify-mcp-X.Y.Z.zip
```

## Validation Requirements

Before any release ZIP is considered official, it MUST:

1. Pass all validation tests in `scripts/test-plugin-release.sh`
2. Have a valid SHA256 checksum file
3. Follow the exact naming convention above
4. Include comprehensive release notes
5. Be validated against the ReleaseChain PRD requirements

## Automated ZIP Creation

Use the `scripts/create-plugin-zip.sh` script to create properly named release ZIPs:

```bash
./scripts/create-plugin-zip.sh
```

This script will:
1. Extract the version from `plugin/elementify.php`
2. Create the ZIP with correct naming convention
3. Generate the SHA256 checksum
4. Place files in the proper `releases/X.Y.Z/` directory

## Version History

| Version | Release Date | Key Features |
|---------|--------------|--------------|
| [2.0.1](./2.0.1/) | April 22, 2026 | Five advanced feature domains, media AI, addon ecosystem, performance analysis, accessibility, snapshots |
| [2.0.0](./2.0.0/) | Prior release | Foundation features, template library, composition tools, governance |
| [1.0.0](./1.0.0/) | Initial release | Basic MCP integration, template management |

## Change Log

The naming convention `elementify.X.Y.Z.zip` was standardized in version 2.0.1. Previous releases (1.0.0, 2.0.0) have been renamed to match this convention.

All future releases MUST adhere to this naming standard as a **non-negotiable** condition of the release workflow.