# Research Track Integration Decision

## Status
Accepted for the current phase-2 baseline.

## Decision
Research-track outputs may enter the stable product only through controlled, opt-in planning surfaces first.

The first approved integration point is:

- destination planning and capability explanation

The first approved visibility level is:

- explicit experimental preview only
- never implicit product policy
- never builder-core logic

## Rationale
The research registry and resolver are useful when the current destination is missing or limiting a capability, but they are still exploratory. They should therefore appear first where users already expect explanation of tradeoffs and capability gaps, not where the product is making hard execution decisions.

Destination planning is the safest bridge because it is explanatory by nature. Recommendation ranking and builder execution are more product-critical and should remain stable until research candidates are validated against real sites and acceptance criteria.

## Approved Stage Order
1. Opt-in research preview in destination capability reporting
2. Secondary, clearly marked research hints in recommendation flows
3. Curated policy layer for individually validated plugin-assisted paths

## Non-Go Areas
- No direct use of research resolver output inside the stable builder core
- No automatic plugin recommendation as a required step in deterministic planning
- No hidden research coupling inside write, import, or generation paths
- No partner or affiliate logic in stable recommendation policy without a dedicated business decision

## Graduation Criteria
A research candidate may move into a curated product policy layer only if:

- it has been tested on representative real environments
- failure and fallback behavior are documented
- recommendation text is explainable and non-misleading
- the candidate is version- and compatibility-aware enough for user-facing output

## Current Implementation
The current codebase uses an opt-in experimental preview in:

- [mcp-server/src/tools/destination.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/tools/destination.ts)

The research modules remain isolated in:

- [mcp-server/src/research/registry.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/research/registry.ts)
- [mcp-server/src/research/resolver.ts](/Users/andrelange/Documents/repositories/github/elementify-mcp/mcp-server/src/research/resolver.ts)
