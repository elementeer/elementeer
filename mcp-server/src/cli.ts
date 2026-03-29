#!/usr/bin/env node
/**
 * elementify-mcp CLI
 *
 * Usage:
 *   elementify-mcp          — starts the MCP server (stdio transport)
 *   elementify-mcp init     — creates ~/.elementify/config.json with an example
 *   elementify-mcp sites    — lists configured sites
 *   elementify-mcp version  — prints version
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const VERSION = '0.1.0';

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'version':
  case '--version':
  case '-v':
    console.log(`elementify-mcp v${VERSION}`);
    process.exit(0);
    break;

  case 'init': {
    const configDir = path.join(os.homedir(), '.elementify');
    const configPath = path.join(configDir, 'config.json');

    if (fs.existsSync(configPath)) {
      console.log(`Config already exists at ${configPath}`);
      console.log('Edit it to add or update your sites.');
      process.exit(0);
    }

    const example = {
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

    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(example, null, 2), 'utf-8');

    console.log(`Created config at ${configPath}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Install the Elementify MCP Plugin on your WordPress site');
    console.log('  2. Generate an API key in Settings → Elementify MCP');
    console.log(`  3. Edit ${configPath} with your site URL and API key`);
    console.log('  4. Add to your MCP client config:');
    console.log('     { "mcpServers": { "elementify": { "command": "elementify-mcp" } } }');
    process.exit(0);
    break;
  }

  case 'sites': {
    // Dynamically import config to avoid initializing MCP server
    const { listSites } = await import('./config.js');
    try {
      const sites = listSites();
      if (sites.length === 0) {
        console.log('No sites configured. Run `elementify-mcp init` to create a config.');
      } else {
        console.log(`${sites.length} site(s):`);
        for (const s of sites) {
          console.log(`  ${s.default ? '*' : ' '} [${s.id}] ${s.name} — ${s.url}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${msg}`);
      process.exit(1);
    }
    process.exit(0);
    break;
  }

  case undefined:
  case 'start': {
    // Default: start MCP server
    const { default: startServer } = await import('./index.js');
    void startServer;
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    console.error('Usage: elementify-mcp [init|sites|version]');
    process.exit(1);
}
