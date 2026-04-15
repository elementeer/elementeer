# REL-COMP-001 Sequence

## Goal

Run the final surface and release lock after Free and Advanced runtime completion.

## Scope

- Free mirror verification
- Free release verification
- Advanced surface verification
- Studio deferment sanity check

## Steps

1. Confirm Free mirror rules still match the implemented Free surface.
2. Run the operator-facing Free release gate end to end.
3. Re-run the combined Free + Advanced runtime surface verification batch.
4. Sanity-check Studio deferment against the current product docs and runtime promises.
5. Produce a final Go / No-Go decision for:
   - Free
   - Advanced

## Binary Gate

- `npm run release:free-mirror:gate` passes
- targeted Free + Advanced runtime surface tests pass
- Advanced surface docs match the implemented scenario-first and productivity-first runtime
- no Studio promise leaks into current Free or Advanced surfaces
