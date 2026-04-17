# Mirror Export Verification

This document describes how to verify that a mirror repository contains only Free tier tools and no Advanced or Studio Future tools.

## Overview

The mirror export verification script (`scripts/verify-mirror-export.mjs`) performs the following checks:

1. **Manifest validation**: Ensures `free-mirror.manifest.json` exists and contains expected structure.
2. **Tool tier assignments**: Loads `product-tiers.ts` (or built module) to map each tool to its tier (free, advanced, studio_future).
3. **Tool registration scan**: Collects all tool registrations (via built module or source scanning) and verifies they are all Free tier.
4. **Forbidden tool detection**: Ensures no tools from Advanced or Studio Future tiers are present.
5. **Documentation verification**: Ensures private documentation files are absent and public documentation files are present.

## Usage

### In the main repository (pre‑export)

Run the verification to ensure the mirror staging is correct:

```bash
npm run build
node scripts/verify-mirror-export.mjs
```

This will fail because the main repository contains Advanced and Studio Future tools – this is expected.

### In the mirror repository (post‑export)

After exporting the Free tier source code to a public mirror repository, run the same script to confirm the mirror is safe:

```bash
# Ensure the repository is built (optional but recommended)
npm run build

# Run verification
node scripts/verify-mirror-export.mjs
```

The script will exit with code 0 if all checks pass, or code 1 with a list of violations.

## CI Integration

A GitHub Actions workflow is provided as an example: `.github/workflows/verify-mirror-export.yml`. To use it in your mirror repository:

1. Copy the workflow file to `.github/workflows/verify-mirror-export.yml`.
2. Copy the verification script to `scripts/verify-mirror-export.mjs`.
3. Ensure your repository contains `free-mirror.manifest.json` (either at root or in `mirror/`).
4. The workflow will run on every push and pull request, ensuring the mirror remains clean.

## Manifest File

The verification script looks for `free-mirror.manifest.json` in the following locations (in order):

- `mirror/free-mirror.manifest.json`
- `free-mirror.manifest.json`

The manifest must contain at least the following fields:

```json
{
  "publicToolEntrypoint": "registerFreeTools",
  "privateToolEntrypoints": ["registerAdvancedTools", "registerStudioFutureTools"],
  "forbiddenPublicTiers": ["advanced", "studio_future"],
  "publicDocumentation": [...],
  "privateDocumentation": [...]
}
```

## How It Works

### Built‑module mode (preferred)

If `mcp-server/dist/product-tiers.js` and `mcp-server/dist/tools/index.js` exist, the script imports them and uses the exported `TOOL_TIER_ASSIGNMENTS` and registration functions. This is the most accurate method.

### Source‑parsing fallback

If built modules are not available, the script:

- Parses `mcp-server/src/product-tiers.ts` with a simple regex‑based extractor to obtain tool‑tier mappings.
- Recursively scans all `.ts` files under `mcp-server/src` for `server.tool('tool_name', ...)` calls.

This fallback is less robust but works without a build step.

## Adding New Free Tools

When adding a new Free tier tool:

1. Add the tool registration in the appropriate `register*Tools` function (or create a new one).
2. Add an entry to `TOOL_TIER_ASSIGNMENTS` in `product-tiers.ts` with `tier: 'free'`.
3. Run the verification script to confirm the tool is correctly classified.

## Troubleshooting

### “Built module missing”

Run `npm run build` to generate the built modules before verification.

### “Product tiers file not found”

Ensure the repository contains the `mcp-server/src/product-tiers.ts` file (or the built equivalent). If you are in a stripped mirror, you may need to adjust the path via a CLI option (not yet implemented).

### False positives/negatives

If the regex‑based source parsing fails, please use built‑module mode (run `npm run build`). If the issue persists, report the problem.