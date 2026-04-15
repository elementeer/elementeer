# Elementify Studio Phase 2 Scope

## Purpose
Elementify Studio phase 2 extends the current Elementify foundation toward a more intelligent, destination-aware, and modular product without destabilizing the deterministic pipeline that already works.

This phase should stay operational, slice-based, and conservative in scope. The goal is not a broad rewrite. The goal is to prepare the system for stronger intelligence, stronger validation, and cleaner extensibility.

## Phase 2 Priorities
- scrape intelligence
- output intelligence
- validation and regression safety
- destination awareness
- platform extensibility

## Delivery Rules
- Prefer MVP speed over elegance.
- Keep implementation slices small, coherent, and testable.
- Stop after each major slice and report what changed.
- Prefer fixture-backed development and regression coverage over live-only iteration.
- Keep route handlers thin and business logic in services or shared packages.
- Build in a modular monorepo style now so services can be split later if needed.
- Prefer capability-based modeling where it improves reuse and avoids direct widget assumptions.

## AI Direction
Phase 2 moves Elementify from AI-enabled toward AI-native, but it must do so in controlled stages.

- Do not jump straight into broad AI generation.
- Do not let AI replace the deterministic safety anchor prematurely.
- Keep deterministic analysis, mapping, validation, and output paths functional even when AI features are introduced.
- Treat AI as bounded planning, critique, and recommendation support before treating it as an authoritative generator.

## Expected Work Sequence
The preferred order for phase 2 is:

1. fixture-aware generation
2. regression coverage
3. fingerprinting
4. contracts and capability primitives
5. import validation harness
6. destination scan and capability matrix
7. recommendation layer
8. design-token extraction
9. bounded AI assist
10. optional conversational control seed

## Guardrails
- Do not rewrite unrelated docs or modules during phase-2 governance work.
- Do not introduce broad infrastructure before the current slice needs it.
- Do not couple research-track registry or resolver experiments into the stable product core without a dedicated integration step.
- Do not claim automation that does not yet exist.
