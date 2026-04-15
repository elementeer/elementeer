# TypeScript Build Anomaly

## Summary

The unstable `mcp-server` build behavior was traced to the way the TypeScript compiler was being resolved and invoked from the repo-level build flow.

The durable fix is:

- resolve the compiler path explicitly from the workspace/repo dependency graph
- invoke the compiler directly through that resolved path
- keep `build` and `typecheck` on a normal success/failure exit contract

## Root Cause

The `mcp-server` build path was not reliably anchored to the correct local TypeScript compiler entrypoint.

That meant the repo-level build flow could drift into an unreliable invocation path, which made the `mcp-server` compile step behave inconsistently compared with:

- the `shared` package build
- direct compiler execution against the resolved workspace compiler

## Implemented Fix

`mcp-server` now builds and typechecks through:

- `node ../scripts/run-mcp-tsc.mjs build`
- `node ../scripts/run-mcp-tsc.mjs typecheck`

The wrapper:

- resolves the TypeScript compiler from the local workspace/repo install
- invokes it directly
- preserves normal compiler exit behavior instead of masking failures

## Verification

The fix is considered valid when these complete cleanly:

- `npm run typecheck --workspace=mcp-server`
- `npm run build --workspace=mcp-server`
- `npm run build`

## Release Impact

This removes the need to treat the `mcp-server` build as a quarantined special case during release gating.

Mirror and release verification can now depend on the normal build path again.
