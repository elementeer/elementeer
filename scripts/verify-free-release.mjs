import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const stagedRoot = path.join(repoRoot, 'mirror', 'generated', 'free-public');

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function sortList(values) {
  return [...values].sort();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function ensureContains(text, needle, label) {
  assert(
    text.includes(needle),
    `${label} must contain "${needle}"`,
  );
}

function ensureDocExists(relativePath) {
  assert(
    fs.existsSync(path.join(repoRoot, relativePath)),
    `${relativePath} must exist`,
  );
}

function ensureStagedFileExists(relativePath) {
  assert(
    fs.existsSync(path.join(stagedRoot, relativePath)),
    `staged ${relativePath} must exist under mirror/generated/free-public`,
  );
}

function collectFiles(rootDir, relativeBase = '') {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeBase, entry.name);
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, relativePath));
      continue;
    }

    if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files.sort();
}

function main() {
  const manifest = readJson('mirror/free-mirror.manifest.json');
  const readme = readText('README.md');
  const quickstart = readText('docs/quickstart/free.md');
  const releaseChecklist = readText('docs/release/free-public-release-checklist.md');
  ensureDocExists('docs/release/forgejo-github-free-mirror-runbook.md');

  ensureDocExists('docs/quickstart/free.md');
  ensureDocExists('docs/release/free-public-release-checklist.md');

  ensureContains(readme, '## Quick Start — Free', 'README.md');
  ensureContains(readme, 'Public Free quickstart', 'README.md');
  ensureContains(readme, 'Advanced', 'README.md');
  ensureContains(readme, 'Studio', 'README.md');

  ensureContains(quickstart, '# Elementify Free Quickstart', 'docs/quickstart/free.md');
  ensureContains(quickstart, 'mirror-safe Free surface', 'docs/quickstart/free.md');
  ensureContains(quickstart, 'scenario-first front door and intent routing', 'docs/quickstart/free.md');
  ensureContains(quickstart, 'new-site-lite', 'docs/quickstart/free.md');
  ensureContains(quickstart, 'limited guided transitions', 'docs/quickstart/free.md');
  ensureContains(quickstart, 'Free public release checklist', 'docs/quickstart/free.md');
  ensureContains(quickstart, 'Free includes/excludes summary', 'docs/quickstart/free.md');

  const freeIncludesExcludes = readText('docs/public/free-includes-excludes.md');
  ensureContains(freeIncludesExcludes, '# Elementify Free Includes / Excludes', 'docs/public/free-includes-excludes.md');
  ensureContains(freeIncludesExcludes, 'Free includes', 'docs/public/free-includes-excludes.md');
  ensureContains(freeIncludesExcludes, 'Free excludes', 'docs/public/free-includes-excludes.md');
  ensureContains(freeIncludesExcludes, 'scenario-first front door and intent routing', 'docs/public/free-includes-excludes.md');
  ensureContains(freeIncludesExcludes, '360-degree starting point', 'docs/public/free-includes-excludes.md');

  ensureContains(releaseChecklist, '# Elementify Free Public Release Checklist', 'docs/release/free-public-release-checklist.md');
  ensureContains(releaseChecklist, 'release:free-mirror:gate', 'docs/release/free-public-release-checklist.md');
  ensureContains(releaseChecklist, 'forgejo-github-free-mirror-runbook.md', 'docs/release/free-public-release-checklist.md');

  assert(
    manifest.publicDocumentation.includes('docs/quickstart/free.md'),
    'manifest must include docs/quickstart/free.md in publicDocumentation',
  );
  assert(
    manifest.publicDocumentation.includes('docs/release/free-public-release-checklist.md'),
    'manifest must include docs/release/free-public-release-checklist.md in publicDocumentation',
  );
  assert(
    manifest.publicDocumentation.includes('docs/public/free-includes-excludes.md'),
    'manifest must include docs/public/free-includes-excludes.md in publicDocumentation',
  );

  ensureStagedFileExists('README.md');
  ensureStagedFileExists('free-tool-surface.json');

  const stagedReadme = readText(path.join('mirror', 'generated', 'free-public', 'README.md'));
  const stagedSurface = readJson(path.join('mirror', 'generated', 'free-public', 'free-tool-surface.json'));
  const stagedFiles = collectFiles(stagedRoot);
  const expectedFiles = sortList([
    'README.md',
    'free-tool-surface.json',
    ...manifest.publicDocumentation,
  ].filter((value, index, values) => values.indexOf(value) === index));

  ensureContains(stagedReadme, 'Elementify Free Public Mirror Staging', 'staged README.md');
  ensureContains(stagedReadme, 'docs/quickstart/free.md', 'staged README.md');
  ensureContains(stagedReadme, 'docs/release/free-public-release-checklist.md', 'staged README.md');

  assert(
    Array.isArray(stagedSurface.publicDocumentation) &&
      JSON.stringify(sortList(stagedSurface.publicDocumentation)) ===
        JSON.stringify(sortList(manifest.publicDocumentation)),
    'staged Free tool surface must reflect the manifest publicDocumentation list',
  );
  assert(
    stagedSurface.freeProductSurface?.tier === 'free',
    'staged Free tool surface must report the free tier',
  );
  assert(
    stagedSurface.publicToolEntrypoint === manifest.publicToolEntrypoint,
    'staged Free tool surface must reflect the public tool entrypoint',
  );
  assert(
    stagedSurface.deterministicDryRun === true,
    'staged Free tool surface must mark the export as a deterministic dry run',
  );
  assert(
    !Object.prototype.hasOwnProperty.call(stagedSurface, 'generatedAt'),
    'staged Free tool surface must not include a time-based generatedAt field',
  );
  assert(
    JSON.stringify(stagedFiles) === JSON.stringify(expectedFiles),
    `staged Free mirror files must match the manifest exactly.\nexpected=${expectedFiles.join(', ')}\nactual=${stagedFiles.join(', ')}`,
  );

  console.log('Free release verification passed.');
}

try {
  main();
} catch (error) {
  console.error(`Free release verification failed: ${error.message}`);
  process.exit(1);
}
