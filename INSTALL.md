# Elementify Install

This is the shortest practical install guide for the current Elementify setup.

It focuses on the public `Free` surface. `Advanced` is built from the private Forgejo primary and is not part of the public GitHub mirror.

## Free Install

### 1. Install the WordPress plugin

1. Clone or download the repository.
2. Use `scripts/create-plugin-zip.sh` to create a properly named ZIP archive (following "elementify.X.Y.Z.zip" convention).
3. In WordPress admin, go to `Plugins -> Add New -> Upload Plugin`.
4. Upload the ZIP (e.g., `elementify.2.0.1.zip`) and activate `Elementify MCP Plugin`.
5. Open `Settings -> Elementify MCP` and generate an API key.

### 2. Install the MCP server

```bash
npm install -g @elementify/mcp
elementify-mcp init
```

This creates:

```text
~/.elementify/config.json
```

### 3. Configure your site

Edit `~/.elementify/config.json`:

```json
{
  "sites": [
    {
      "id": "my-site",
      "name": "My WordPress Site",
      "url": "https://yoursite.com",
      "apiKey": "ek_your_key_here",
      "default": true
    }
  ]
}
```

### 4. Add Elementify to your MCP client

```json
{
  "mcpServers": {
    "elementify": {
      "command": "elementify-mcp"
    }
  }
}
```

## Local Development Install

From the repository root:

```bash
npm install
```

For the WordPress plugin test environment:

```bash
cd plugin
composer install
```

## Build Modes

### Standard repository build

Use this on the primary repository for the normal monorepo build:

```bash
npm run build
```

This builds:

- `shared`
- `mcp-server`

The WordPress plugin has no separate PHP build step. Its validation path is dependency install plus PHPUnit.

### Free release gate

Use this before preparing or publishing the public GitHub mirror:

```bash
npm run release:free-mirror:gate
```

This runs:

1. root build
2. Free contract tests
3. Free mirror verification
4. Free mirror staging preparation
5. Free release verification

### Advanced build

`Advanced` is built from the same private Forgejo primary repository as the standard monorepo build.

Today that means:

- run the normal root build
- run the MCP server tests
- keep `Advanced` private through tier registration and mirror verification

`Advanced` does not have a separate public build pipeline. Its boundary is enforced by the tier map, tool registration, and Free mirror checks.

## Canonical References

- [Public quickstart](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/quickstart/free.md)
- [Free product surface](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/blueprints/free-product-surface.md)
- [Free mirror export rules](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/architecture/free-mirror-export.md)
- [Forgejo to GitHub Free mirror runbook](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/release/forgejo-github-free-mirror-runbook.md)
