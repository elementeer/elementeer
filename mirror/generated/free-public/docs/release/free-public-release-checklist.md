# Elementify Free Public Release Checklist

## Purpose

This checklist keeps the public Free mirror launch-ready without leaking Advanced or Studio semantics.

## Before publish

1. Run `npm run release:free-mirror:gate`.
2. Review the staged artifact under `mirror/generated/free-public/`.
3. Follow the private runbook in `docs/release/forgejo-github-free-mirror-runbook.md`.
4. Confirm the staged output is a clean deterministic dry-run with no stale files and no time-based metadata.
5. Confirm the normal build path completes cleanly before publish.
6. Confirm the staging artifact reports the expected Free tool count and the expected public document set.

## Public release gates

- `README.md` must describe the public Free surface clearly.
- The public quickstart must exist and stay mirror-safe.
- The public Free includes/excludes summary must stay aligned with the quickstart and product-surface docs.
- The mirror manifest must list only public Free docs in `publicDocumentation`.
- The staged Free mirror must include a Free tool snapshot derived from the runtime build.
- The staged Free mirror must match the manifest file list exactly.
- No Advanced-only or Studio-future docs may leak into the public mirror surface.
- The gate output should mention the staging path `mirror/generated/free-public/`.

## Stop conditions

Stop the release if:

- the Free mirror verifier fails
- the Free release verifier fails
- the staged public mirror differs from the manifest
- a public doc starts implying Advanced or Studio semantics
- the staging dry-run is not deterministic
