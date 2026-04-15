import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const mcpServerRoot = path.join(repoRoot, 'mcp-server');
const require = createRequire(import.meta.url);

function resolveTypeScriptCompiler() {
  const candidates = [
    path.join(mcpServerRoot, 'node_modules', 'typescript', 'lib', 'tsc.js'),
    path.join(repoRoot, 'node_modules', 'typescript', 'lib', 'tsc.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    return require.resolve('typescript/lib/tsc.js', {
      paths: [mcpServerRoot, repoRoot],
    });
  } catch {
    throw new Error(
      'Unable to resolve the TypeScript compiler. Run npm install so the workspace dependency graph is available.',
    );
  }
}

const tscPath = resolveTypeScriptCompiler();

const mode = process.argv[2];

if (!mode || (mode !== 'build' && mode !== 'typecheck')) {
  console.error('Usage: node scripts/run-mcp-tsc.mjs <build|typecheck>');
  process.exit(1);
}

const args =
  mode === 'build'
    ? [tscPath, '-p', path.join(mcpServerRoot, 'tsconfig.json'), '--pretty', 'false']
    : [tscPath, '-p', path.join(mcpServerRoot, 'tsconfig.json'), '--noEmit', '--pretty', 'false'];

const result = spawnSync(process.execPath, args, {
  cwd: repoRoot,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Failed to start TypeScript compiler: ${result.error.message}`);
  process.exit(1);
}

if (result.signal) {
  console.error(`TypeScript compiler exited from signal ${result.signal}.`);
  process.exit(1);
}

process.exit(result.status ?? 0);
