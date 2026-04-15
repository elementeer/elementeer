import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'),
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function ensureExists(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert(fs.existsSync(fullPath), `Required path is missing: ${relativePath}`);
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

async function loadBuiltModule(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert(
    fs.existsSync(fullPath),
    `Built module missing: ${relativePath}. Run "npm run build" before verifying the mirror.`,
  );
  return import(pathToFileURL(fullPath).href);
}

async function main() {
  const manifest = readJson('mirror/free-mirror.manifest.json');
  const expectedPublicDocumentation = [
    'README.md',
    'docs/phase-2-scope.md',
    'docs/quickstart/free.md',
    'docs/public/free-includes-excludes.md',
    'docs/release/free-public-release-checklist.md',
    'docs/blueprints/free-product-surface.md',
  ];
  const requiredPrivateDocumentation = [
    'docs/blueprints/advanced-product-surface.md',
    'docs/blueprints/free-advanced-launch-prd.md',
    'docs/blueprints/free-advanced-launch-prd.json',
    'docs/blueprints/tier-capability-map.md',
    'docs/architecture/free-mirror-export.md',
    'docs/architecture/library-provider-boundary.md',
    'docs/architecture/research-track-integration-decision.md',
    'docs/architecture/phase-2-foundation.md',
    'docs/phase-2-baseline-alignment.md',
    'docs/architecture/research-track-registry.md',
    'docs/release/forgejo-github-free-mirror-runbook.md',
  ];

  for (const docPath of manifest.publicDocumentation) {
    ensureExists(docPath);
  }

  for (const docPath of manifest.privateDocumentation) {
    ensureExists(docPath);
  }

  const toolsModule = await loadBuiltModule('mcp-server/dist/tools/index.js');
  const tiersModule = await loadBuiltModule('mcp-server/dist/product-tiers.js');
  const surfacesModule = await loadBuiltModule('mcp-server/dist/product-surfaces.js');

  const {
    registerAllTools,
    registerFreeTools,
    registerAdvancedTools,
    registerStudioFutureTools,
  } = toolsModule;
  const { TOOL_TIER_ASSIGNMENTS } = tiersModule;
  const { FREE_PRODUCT_SURFACE, ADVANCED_PRODUCT_SURFACE } = surfacesModule;

  const assignments = Array.isArray(TOOL_TIER_ASSIGNMENTS) ? TOOL_TIER_ASSIGNMENTS : [];
  const freeAssigned = assignments
    .filter((assignment) => assignment.tier === 'free')
    .map((assignment) => assignment.id)
    .sort();
  const advancedAssigned = assignments
    .filter((assignment) => assignment.tier === 'advanced')
    .map((assignment) => assignment.id)
    .sort();
  const studioAssigned = assignments
    .filter((assignment) => assignment.tier === 'studio_future')
    .map((assignment) => assignment.id)
    .sort();

  const freeRegistered = collectToolNames(registerFreeTools);
  const advancedRegistered = collectToolNames(registerAdvancedTools);
  const studioRegistered = collectToolNames(registerStudioFutureTools);
  const freeOnlyAllTools = collectToolNames((server, getClient) => {
    registerAllTools(server, getClient, {
      includeAdvanced: false,
      includeStudioFuture: false,
    });
  });

  assert(
    JSON.stringify(freeRegistered) === JSON.stringify(freeAssigned),
    `Free registration does not match free tier assignments.\nassigned=${freeAssigned.join(', ')}\nregistered=${freeRegistered.join(', ')}`,
  );
  assert(
    JSON.stringify([...freeRegistered].sort()) === JSON.stringify([...FREE_PRODUCT_SURFACE.primaryTools].sort()),
    `Free registration does not match the public Free product surface.\nregistered=${freeRegistered.join(', ')}\nsurface=${FREE_PRODUCT_SURFACE.primaryTools.join(', ')}`,
  );
  assert(
    JSON.stringify(advancedRegistered) === JSON.stringify(advancedAssigned),
    `Advanced registration does not match advanced tier assignments.\nassigned=${advancedAssigned.join(', ')}\nregistered=${advancedRegistered.join(', ')}`,
  );
  assert(
    ADVANCED_PRODUCT_SURFACE.primaryTools.includes('plan_premium_library_usage'),
    'Advanced product surface must expose the premium library usage plan.',
  );
  assert(
    ADVANCED_PRODUCT_SURFACE.primaryTools.includes('get_advanced_recommendations'),
    'Advanced product surface must expose deeper recommendation tooling.',
  );
  assert(
    ADVANCED_PRODUCT_SURFACE.primaryTools.includes('import_premium_library_asset'),
    'Advanced product surface must expose the premium library import flow.',
  );
  assert(
    !FREE_PRODUCT_SURFACE.primaryTools.includes('plan_premium_library_usage'),
    'Free product surface must not expose premium-library tooling.',
  );
  assert(
    !FREE_PRODUCT_SURFACE.primaryTools.includes('get_advanced_recommendations'),
    'Free product surface must not expose Advanced-only recommendation tooling.',
  );
  assert(
    !FREE_PRODUCT_SURFACE.primaryTools.includes('import_premium_library_asset'),
    'Free product surface must not expose premium-library import tooling.',
  );
  assert(
    JSON.stringify(studioRegistered) === JSON.stringify(studioAssigned),
    `Studio-future registration does not match studio_future tier assignments.\nassigned=${studioAssigned.join(', ')}\nregistered=${studioRegistered.join(', ')}`,
  );
  assert(
    JSON.stringify(freeOnlyAllTools) === JSON.stringify(freeAssigned),
    'registerAllTools(includeAdvanced=false, includeStudioFuture=false) must equal the Free tool surface.',
  );
  assert(
    JSON.stringify(manifest.publicDocumentation) === JSON.stringify(expectedPublicDocumentation),
    `Public documentation set drifted.\nexpected=${expectedPublicDocumentation.join(', ')}\nactual=${manifest.publicDocumentation.join(', ')}`,
  );
  assert(
    manifest.privateToolEntrypoints.length === 2 &&
      manifest.privateToolEntrypoints.includes('registerAdvancedTools') &&
      manifest.privateToolEntrypoints.includes('registerStudioFutureTools'),
    `Private tool entrypoints must remain scoped to Advanced and Studio future.\nactual=${manifest.privateToolEntrypoints.join(', ')}`,
  );
  for (const requiredDoc of requiredPrivateDocumentation) {
    assert(
      manifest.privateDocumentation.includes(requiredDoc),
      `Private documentation must include: ${requiredDoc}`,
    );
  }

  for (const forbiddenTier of manifest.forbiddenPublicTiers) {
    const forbiddenTools = assignments
      .filter((assignment) => assignment.tier === forbiddenTier)
      .map((assignment) => assignment.id);
    const leaked = forbiddenTools.filter((toolName) => freeRegistered.includes(toolName));
    assert(
      leaked.length === 0,
      `Free registration leaked forbidden ${forbiddenTier} tools: ${leaked.join(', ')}`,
    );
  }

  const overlapDocs = manifest.publicDocumentation.filter((docPath) =>
    manifest.privateDocumentation.includes(docPath),
  );
  assert(
    overlapDocs.length === 0,
    `Mirror manifest has docs marked both public and private: ${overlapDocs.join(', ')}`,
  );

  console.log('Free mirror verification passed.');
  console.log(`Public tool entrypoint: ${manifest.publicToolEntrypoint}`);
  console.log(`Free tools: ${freeRegistered.length}`);
  console.log(`Advanced tools excluded: ${advancedRegistered.length}`);
  console.log(`Studio-future tools excluded: ${studioRegistered.length}`);
  console.log(`Public docs tracked: ${manifest.publicDocumentation.length}`);
  console.log(`Private docs tracked: ${manifest.privateDocumentation.length}`);
  console.log(`Public tool surface matches Free product surface: yes`);
}

main().catch((error) => {
  console.error(`Free mirror verification failed: ${error.message}`);
  process.exit(1);
});
