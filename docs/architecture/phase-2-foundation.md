# Phase 2 Architecture Note

## Position
Elementify Studio phase 2 should be treated as:

- MACH-oriented
- contracts-first
- capability-first
- headless
- AI-directed over time, with deterministic fallback

## Practical Meaning
MACH-oriented in this repository does not require an immediate service split. It means phase-2 work should preserve boundaries that allow later extraction into independent services, adapters, or workers without rewriting the core logic first.

Contracts-first means cross-cutting types and payload shapes should stabilize before orchestration grows. Capability-first means planning and compatibility logic should describe what the system can do before hard-coding assumptions about specific widgets, plugins, or destinations.

Headless means the platform core should not depend on one UI or one runtime path. AI-directed over time means AI can increasingly help plan, critique, and guide output decisions, but the deterministic pipeline remains the fallback and safety anchor until bounded AI behavior is proven reliable.

## Phase 2 Boundary Rules
Future phase-2 work should keep these concerns explicitly separable:

- core platform logic
- input adapters
- output adapters
- skills and extensions
- registries and resolvers

## Architectural Expectations
- Keep core platform logic independent from transport and interface details.
- Keep input adapters responsible for collecting or normalizing source material, not for owning generation policy.
- Keep output adapters responsible for destination-specific output shaping, not for owning core planning logic.
- Keep skills and extensions additive and optional, not hard dependencies of the stable core.
- Keep registries and resolvers isolated enough that they can evolve or remain experimental without destabilizing the product path.

## Near-Term Design Guidance
- Prefer reusable services and shared contracts over route-local logic.
- Preserve compatibility with a modular monorepo layout.
- Treat deterministic validation as a first-class concern.
- Introduce AI assistance behind clear interfaces, feature flags, and validated outputs.
- Avoid speculative architecture build-out before the next slice requires it.

For the explicit current deferment boundary, see [studio-deferment-note.md](/Users/andrelange/Documents/repositories/github/elementify-mcp/docs/architecture/studio-deferment-note.md).
