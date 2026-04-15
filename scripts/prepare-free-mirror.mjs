import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(repoRoot, 'mirror', 'generated', 'free-public');

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'),
  );
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function cleanOutputRoot() {
  fs.rmSync(outputRoot, { recursive: true, force: true });
}

function copyFile(relativePath) {
  const source = path.join(repoRoot, relativePath);
  const target = path.join(outputRoot, relativePath);
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

async function loadBuiltModule(relativePath) {
  return import(pathToFileURL(path.join(repoRoot, relativePath)).href);
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

async function main() {
  const manifest = readJson('mirror/free-mirror.manifest.json');
  cleanOutputRoot();
  ensureDir(outputRoot);

  const toolsModule = await loadBuiltModule('mcp-server/dist/tools/index.js');
  const tiersModule = await loadBuiltModule('mcp-server/dist/product-tiers.js');
  const surfacesModule = await loadBuiltModule('mcp-server/dist/product-surfaces.js');

  const freeTools = collectToolNames(toolsModule.registerFreeTools);
  const freeAssignments = tiersModule.TOOL_TIER_ASSIGNMENTS
    .filter((assignment) => assignment.tier === 'free')
    .map((assignment) => assignment.id)
    .sort();
  const { FREE_PRODUCT_SURFACE } = surfacesModule;

  for (const docPath of manifest.publicDocumentation) {
    copyFile(docPath);
  }

  const exportSummary = {
    manifestName: manifest.name,
    publicToolEntrypoint: manifest.publicToolEntrypoint,
    freeToolCount: freeTools.length,
    freeTools,
    freeAssignments,
    deterministicDryRun: true,
    freeProductSurface: {
      tier: FREE_PRODUCT_SURFACE.tier,
      label: FREE_PRODUCT_SURFACE.label,
      positioning: FREE_PRODUCT_SURFACE.positioning,
      promise: FREE_PRODUCT_SURFACE.promise,
      primaryTools: FREE_PRODUCT_SURFACE.primaryTools,
      workflows: FREE_PRODUCT_SURFACE.workflows.map((workflow) => ({
        id: workflow.id,
        label: workflow.label,
        toolIds: workflow.toolIds,
      })),
      excludes: FREE_PRODUCT_SURFACE.excludes,
      notes: FREE_PRODUCT_SURFACE.notes,
    },
    publicDocumentation: manifest.publicDocumentation,
    privateDocumentation: manifest.privateDocumentation,
  };

  fs.writeFileSync(
    path.join(outputRoot, 'free-tool-surface.json'),
    JSON.stringify(exportSummary, null, 2),
    'utf8',
  );

  fs.writeFileSync(
    path.join(outputRoot, 'README.md'),
    [
      '# Elementify Free Public Mirror Staging',
      '',
      'This directory is a generated staging artifact for the public Free mirror.',
      'The dry-run output is deterministic and starts from a clean staging directory.',
      'Free is the public and mirror-safe surface.',
      'Advanced remains private in the Forgejo primary repository.',
      'Studio stays a future seam, not a public promise.',
      '',
      `Public tool entrypoint: \`${manifest.publicToolEntrypoint}\``,
      `Free tool count: ${freeTools.length}`,
      `Free product surface: ${FREE_PRODUCT_SURFACE.label}`,
      '',
      'Public quickstart:',
      '- docs/quickstart/free.md',
      '- docs/release/free-public-release-checklist.md',
      '',
      'Primary Free workflows:',
      ...FREE_PRODUCT_SURFACE.workflows.map((workflow) => `- ${workflow.label}`),
      '',
      'Included docs:',
      ...manifest.publicDocumentation.map((docPath) => `- ${docPath}`),
      '',
      'Excluded docs tracked privately:',
      ...manifest.privateDocumentation.map((docPath) => `- ${docPath}`),
    ].join('\n'),
    'utf8',
  );

  console.log(`Prepared free mirror staging artifact at ${path.relative(repoRoot, outputRoot)}`);
  console.log(`Public docs copied: ${manifest.publicDocumentation.length}`);
  console.log(`Free tools indexed: ${freeTools.length}`);
}

main().catch((error) => {
  console.error(`Failed to prepare free mirror staging artifact: ${error.message}`);
  process.exit(1);
});
