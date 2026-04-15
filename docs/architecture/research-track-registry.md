# Research Track Registry

## Purpose
This document describes the isolated research-track modules introduced for phase 2:

- [mcp-server/src/research/registry.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/research/registry.ts)
- [mcp-server/src/research/resolver.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/research/resolver.ts)

They are intentionally separate from the stable product core.

## Scope
The research track currently provides:

- a small plugin registry seed with representative examples only
- capability-to-implementation resolution prototypes
- explainable mappings between:
  - native Elementor options
  - plugin-assisted options
  - conservative fallbacks

## Isolation Rules
- Research modules may depend on stable contracts like `CapabilityMatrix`.
- Stable runtime flows must not depend on the research modules.
- No research module is registered in the production MCP tool index yet.
- No plugin recommendation from the research track is treated as product policy until a dedicated integration step exists.

## Intended Use
The registry and resolver help answer questions like:

- which plugin-assisted options might cover a missing capability?
- what is the safest fallback if no native or plugin-assisted path is acceptable?
- how could future destination-aware recommendation logic be extended without polluting the current stable core?
