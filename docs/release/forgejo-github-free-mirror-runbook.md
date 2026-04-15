# Forgejo to GitHub Free Mirror Runbook

## Purpose

This runbook turns the Free mirror strategy into an operational release procedure.

It assumes:

- Forgejo is the canonical private primary repository
- GitHub is the public `Free` mirror
- `Advanced` and `studio_future` remain private

## Operators

- release operator on the private Forgejo primary
- optional reviewer for public mirror publication

## Preconditions

Before starting a mirror release:

1. The target commit on Forgejo is the intended release candidate.
2. Free and Advanced tier boundaries are green in the primary repo.
3. Public docs and manifest entries are in sync.
4. The mirror dry-run is deterministic: the staging directory is cleaned first, and the staged Free surface does not contain time-based metadata.
5. The normal repo build completes cleanly before mirror publication.

## Lifecycle

Follow this sequence for every Free mirror publication:

1. Preflight
2. Release gate
3. Staging dry-run
4. Publication
5. Post-publish verification

Expected outputs by stage:

- Preflight: chosen Forgejo commit or tag, green tier boundaries, synced docs and manifest
- Release gate: successful `npm run release:free-mirror:gate` run with no failed step
- Staging dry-run: `mirror/generated/free-public/` populated from a clean directory with deterministic file contents
- Publication: public GitHub mirror updated from the exact approved staging artifact
- Post-publish verification: public mirror matches the staged file set and remains buildable

## Release Gate Command

Run the full Free gate bundle from the primary repository root:

```bash
npm run release:free-mirror:gate
```

This runs:

1. build
2. Free contract tests
3. Free mirror verification
4. Free mirror staging preparation
5. Free release verification

Successful output should confirm:

- build completed cleanly
- Free contract tests passed
- mirror verification passed
- staging artifact prepared at `mirror/generated/free-public/`
- release verification passed

## Staging Output

The staged public artifact is generated under:

```text
mirror/generated/free-public/
```

Expected key files:

- `README.md`
- `free-tool-surface.json`
- all docs listed in `mirror/free-mirror.manifest.json -> publicDocumentation`

## Publication Flow

### 1. Verify the candidate on Forgejo

- check the intended commit or tag
- run `npm run release:free-mirror:gate`
- inspect `mirror/generated/free-public/`
- confirm the staged file list matches the manifest exactly

### 2. Sanity-check the public narrative

- confirm `README.md` centers the public `Free` surface and does not promise active Advanced or Studio behavior
- confirm the public quickstart is present
- confirm no Advanced or Studio promises appear in staged docs

### 3. Publish to GitHub mirror

- push the approved mirror content or mirror branch to the public GitHub repository
- keep the publication tied to the exact Forgejo release candidate

### 4. Post-publish verification

- confirm the GitHub mirror matches the staged Free artifact
- confirm the public repo remains buildable
- confirm the published docs set matches the manifest

## Failure Gates

Stop the publication flow immediately if any of the following occur:

- the build fails
- `npm run release:free-mirror:gate` fails
- the staging directory is not clean before dry-run generation
- the staged artifact includes stale files or time-based metadata
- the staged file list drifts from `mirror/free-mirror.manifest.json`
- a staged doc implies Advanced or Studio behavior
- the public mirror no longer matches the approved staging artifact

## Stop Conditions

Do not publish if:

- `release:free-mirror:gate` fails
- the staged artifact contains private docs
- the staged README or quickstart promises active Advanced or Studio behavior instead of treating them as private or future layers
- the public tool surface does not match `registerFreeTools`
- the staged dry-run includes stale files or time-based metadata
- the normal build does not complete cleanly

## Notes

- This runbook is private operational documentation and must not be part of the public mirror docs set.
- The staged artifact is the source of truth for what should appear in the public GitHub mirror.
