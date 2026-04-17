#!/usr/bin/env node

/**
 * Mirror Export Verification Script
 * 
 * This script verifies that the mirror repository contains only Free tier tools
 * and no Advanced or Studio Future tools.
 * 
 * It performs the following checks:
 * 1. Reads free-mirror.manifest.json to understand the mirror configuration.
 * 2. Loads tool tier assignments from product-tiers.ts (or built module).
 * 3. Collects tool registrations via built module (if available) or scans source files.
 * 4. Ensures all registered tools are Free tier.
 * 5. Ensures no Advanced or Studio Future tools are present.
 * 6. Checks that private documentation files are absent.
 * 7. Checks that public documentation files are present.
 * 
 * Usage:
 *   node scripts/verify-mirror-export.mjs
 * 
 * The script expects the repository to be built (npm run build) for optimal operation,
 * but can fall back to parsing source files.
 * 
 * Exit codes:
 *   0 - Verification passed
 *   1 - Verification failed (violations found)
 *   2 - Unexpected error
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function collectToolNamesFromSource(dirPath) {
  const toolNames = new Set();
  const toolRegex = /server\.tool\(\s*['"]([^'"]+)['"]/g;
  
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = content.matchAll(toolRegex);
        for (const match of matches) {
          toolNames.add(match[1]);
        }
      }
    }
  }
  
  walk(dirPath);
  return Array.from(toolNames).sort();
}

function parseToolTierAssignments(content) {
  // Find the start of TOOL_TIER_ASSIGNMENTS array
  const startMarker = 'export const TOOL_TIER_ASSIGNMENTS: ProductSurfaceAssignment[] = [';
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) {
    throw new Error('TOOL_TIER_ASSIGNMENTS not found');
  }
  let braceDepth = 0;
  let bracketDepth = 0;
  let inArray = false;
  let arrayStart = -1;
  let arrayEnd = -1;
  
  // Simple scanner to find matching ']'
  for (let i = startIndex; i < content.length; i++) {
    const ch = content[i];
    if (ch === '[') {
      bracketDepth++;
      if (bracketDepth === 1) {
        arrayStart = i;
        inArray = true;
      }
    } else if (ch === ']') {
      bracketDepth--;
      if (bracketDepth === 0 && inArray) {
        arrayEnd = i + 1;
        break;
      }
    }
  }
  if (arrayEnd === -1) {
    throw new Error('Could not find end of TOOL_TIER_ASSIGNMENTS array');
  }
  const arrayText = content.slice(arrayStart, arrayEnd);
  // Split by '},' to get individual objects (last object ends with '}')
  const objects = arrayText.split(/},\s*/);
  const assignments = [];
  for (const obj of objects) {
    // Ensure we have something that looks like an object
    if (!obj.includes('id:')) continue;
    // Extract id and tier using regex that works across newlines
    const idMatch = obj.match(/id\s*:\s*['"]([^'"]+)['"]/);
    const tierMatch = obj.match(/tier\s*:\s*['"]([^'"]+)['"]/);
    if (idMatch && tierMatch) {
      assignments.push({ id: idMatch[1], tier: tierMatch[1] });
    }
  }
  return assignments;
}

async function loadBuiltModule(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert(
    fs.existsSync(fullPath),
    `Built module missing: ${relativePath}. Run "npm run build" before verification.`,
  );
  return import(pathToFileURL(fullPath).href);
}

function collectToolNames(registerFn) {
  const names = [];
  const server = {
    tool(name) {
      names.push(name);
      return this;
    },
  };
  const getClient = () => ({});
  registerFn(server, getClient);
  return names.sort();
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    manifest: null,
    productTiers: null,
    sourceDir: null,
    help: false,
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--manifest' && i + 1 < args.length) {
      options.manifest = args[++i];
    } else if (arg === '--product-tiers' && i + 1 < args.length) {
      options.productTiers = args[++i];
    } else if (arg === '--source-dir' && i + 1 < args.length) {
      options.sourceDir = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/verify-mirror-export.mjs [OPTIONS]
Options:
  --manifest PATH       Path to free-mirror.manifest.json (default: auto-detect)
  --product-tiers PATH  Path to product-tiers.ts or .js (default: mcp-server/src/product-tiers.ts)
  --source-dir PATH     Path to source directory (default: mcp-server/src)
  --help, -h            Show this help message
`);
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  // Determine manifest path
  let manifestPath = options.manifest;
  if (!manifestPath) {
    const candidatePaths = ['mirror/free-mirror.manifest.json', 'free-mirror.manifest.json'];
    for (const candidate of candidatePaths) {
      if (fs.existsSync(path.join(repoRoot, candidate))) {
        manifestPath = candidate;
        break;
      }
    }
  }
  if (!manifestPath) {
    throw new Error('Cannot find free-mirror.manifest.json. Use --manifest to specify path.');
  }
  const manifest = readJson(manifestPath);

  const violations = [];
  const warnings = [];

  // Validate manifest fields
  if (manifest.publicToolEntrypoint !== 'registerFreeTools') {
    warnings.push(`publicToolEntrypoint is "${manifest.publicToolEntrypoint}", expected "registerFreeTools"`);
  }
  if (!Array.isArray(manifest.forbiddenPublicTiers) || manifest.forbiddenPublicTiers.length === 0) {
    warnings.push('forbiddenPublicTiers is missing or empty');
  }

  // Load product-tiers.ts (try built module first, then source)
  let assignments = [];
  const productTiersSourcePath = options.productTiers || 'mcp-server/src/product-tiers.ts';
  const builtProductTiersPath = productTiersSourcePath.replace('/src/', '/dist/').replace(/\.ts$/, '.js');
  
  // Attempt to load built module
  try {
    const tiersModule = await loadBuiltModule(builtProductTiersPath);
    assignments = Array.isArray(tiersModule.TOOL_TIER_ASSIGNMENTS) ? tiersModule.TOOL_TIER_ASSIGNMENTS : [];
    console.log('Loaded tool tier assignments from built module');
  } catch (err) {
    console.log('Built module not available, parsing source...');
    if (!fs.existsSync(path.join(repoRoot, productTiersSourcePath))) {
      throw new Error(`Product tiers file not found: ${productTiersSourcePath}`);
    }
    const productTiersContent = readText(productTiersSourcePath);
    assignments = parseToolTierAssignments(productTiersContent);
    console.log(`Parsed ${assignments.length} tool tier assignments from source`);
  }

  // Build maps
  console.log(`Total assignments: ${assignments.length}`);
  const toolTierMap = new Map(assignments.map(a => [a.id, a.tier]));
  const freeTools = assignments.filter(a => a.tier === 'free').map(a => a.id);
  const advancedTools = assignments.filter(a => a.tier === 'advanced').map(a => a.id);
  const studioTools = assignments.filter(a => a.tier === 'studio_future').map(a => a.id);

  // Determine source directory
  const sourceDir = options.sourceDir || 'mcp-server/src';
  
  // Collect tool names from registration functions (if built modules available)
  let registeredTools = [];
  const builtToolsPath = 'mcp-server/dist/tools/index.js';
  if (fs.existsSync(path.join(repoRoot, builtToolsPath))) {
    try {
      const toolsModule = await loadBuiltModule(builtToolsPath);
      const freeRegistered = collectToolNames(toolsModule.registerFreeTools);
      registeredTools = freeRegistered;
      console.log(`Registered free tools via built module: ${freeRegistered.length}`);
      // Ensure advanced and studio registration functions are not present or empty
      if (toolsModule.registerAdvancedTools) {
        const advancedRegistered = collectToolNames(toolsModule.registerAdvancedTools);
        if (advancedRegistered.length > 0) {
          violations.push(`Advanced tools registration present with ${advancedRegistered.length} tools: ${advancedRegistered.join(', ')}`);
        }
      }
      if (toolsModule.registerStudioFutureTools) {
        const studioRegistered = collectToolNames(toolsModule.registerStudioFutureTools);
        if (studioRegistered.length > 0) {
          violations.push(`Studio future tools registration present with ${studioRegistered.length} tools: ${studioRegistered.join(', ')}`);
        }
      }
    } catch (err) {
      console.warn(`Failed to load built tools module: ${err.message}`);
    }
  }
  if (registeredTools.length === 0) {
    // Fallback to source scanning
    console.log('Built tools module not available, scanning source for server.tool calls...');
    if (!fs.existsSync(path.join(repoRoot, sourceDir))) {
      throw new Error(`Source directory not found: ${sourceDir}`);
    }
    registeredTools = collectToolNamesFromSource(path.join(repoRoot, sourceDir));
    console.log(`Found ${registeredTools.length} tool registrations in source`);
  }

  // Check each tool's tier
  for (const tool of registeredTools) {
    const tier = toolTierMap.get(tool);
    if (!tier) {
      violations.push(`Tool "${tool}" not found in TOOL_TIER_ASSIGNMENTS`);
    } else if (tier !== 'free') {
      violations.push(`Tool "${tool}" is tier "${tier}" but must be free`);
    }
  }

  // Ensure no advanced/studio tools are present (should be caught above)
  const forbiddenTiers = manifest.forbiddenPublicTiers || ['advanced', 'studio_future'];
  for (const tier of forbiddenTiers) {
    const tools = tier === 'advanced' ? advancedTools : studioTools;
    const leaked = tools.filter(t => registeredTools.includes(t));
    if (leaked.length) {
      violations.push(`Mirror contains forbidden ${tier} tools: ${leaked.join(', ')}`);
    }
  }

  // Check private documentation files are not present
  const privateDocs = manifest.privateDocumentation || [];
  for (const docPath of privateDocs) {
    if (fs.existsSync(path.join(repoRoot, docPath))) {
      violations.push(`Private documentation file present: ${docPath}`);
    }
  }

  // Check public documentation files exist (optional)
  const publicDocs = manifest.publicDocumentation || [];
  for (const docPath of publicDocs) {
    if (!fs.existsSync(path.join(repoRoot, docPath))) {
      warnings.push(`Public documentation file missing: ${docPath}`);
    }
  }

  // Output report
  if (violations.length) {
    console.error('MIRROR VERIFICATION FAILED');
    console.error('Violations:');
    violations.forEach(v => console.error(` - ${v}`));
    process.exit(1);
  } else {
    console.log('MIRROR VERIFICATION PASSED');
    console.log(`Free tools registered: ${registeredTools.length}`);
    console.log(`Advanced tools excluded: ${advancedTools.length}`);
    console.log(`Studio future tools excluded: ${studioTools.length}`);
    console.log(`Public documentation present: ${publicDocs.length}`);
    console.log(`Private documentation absent: ${privateDocs.length}`);
    if (warnings.length) {
      console.warn('Warnings:');
      warnings.forEach(w => console.warn(` - ${w}`));
    }
  }
}

main().catch(error => {
  console.error('Mirror verification error:', error.message);
  process.exit(1);
});