# Advanced Bounded Execution Sequence

## Goal

Turn the new Advanced planning-only deep workflows into first bounded executable slices without collapsing the plan-vs-execute guardrails.

## Scope

- add a first executable `deep-relaunch` slice
- add a first executable `migration-rollout` slice
- keep both flows reviewable, draft-oriented, and quality-looped
- preserve scenario-first routing and Advanced-only visibility

## Execution Model

### Deep relaunch

1. require an explicit `target_page_id`
2. require an explicit `theme_builder_type`
3. preserve the current page state as a draft template snapshot
4. create the first draft structural slice through Theme Builder
5. run the quality loop on the persisted structural result
6. queue follow-up when critique is not solid

### Migration rollout

1. require an explicit `source_template_id`
2. require an explicit `theme_builder_type`
3. load the source template as the migration source
4. create the first draft migration target through Theme Builder
5. run the quality loop on the persisted structural result
6. queue follow-up when critique is not solid

## Guardrails

- no direct publish path for the new deep slices
- no silent expansion into full-automation relaunch or migration
- no removal of scenario-first routing
- no weakening of critique / queue follow-up behavior

## Gate

- `advanced_creator_mode` executes the first bounded slice for `deep-relaunch`
- `advanced_creator_mode` executes the first bounded slice for `migration-rollout`
- missing bounded-slice inputs still fail explicitly
- targeted typecheck and Advanced test batch pass
