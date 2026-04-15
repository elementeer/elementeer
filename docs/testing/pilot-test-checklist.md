# Elementify Pilot Test Checklist

## Goal

Run fast, real-world pilot tests without bloating the process.

This checklist is for immediate use on:

- one real client or staging site
- one internal Elementify site test

## Rules

- test one primary job per site first
- prefer staging over live production
- write feedback immediately into `feedback-testing.md`
- do not expand into a large matrix too early
- keep focus on outcome, not only on whether a tool technically ran

## Pilot A — Client Site

### Before Start

- confirm this is a staging or otherwise safe environment
- note the current stack:
  - WordPress
  - theme
  - Elementor state
  - relevant addons/plugins
- choose exactly one primary scenario:
  - `optimization`
  - `relaunch-lite`
  - `extension-lite`
  - `bootstrap`
- note one concrete target outcome

### Start Flow

- install / activate plugin if needed
- create API key
- confirm MCP / local config works
- run the scenario-first front door
- note whether the recommended path feels immediately sensible

### Execute One Real Slice

- run one real guided slice only
- avoid parallel goals
- note:
  - where guidance was strong
  - where the next step felt unclear
  - where the product saved real time
  - where the product added friction

### End Check

- was the outcome actually useful?
- did Elementify reduce work?
- would this flow be repeatable for a real delivery job?

## Pilot B — Elementify Site

### Before Start

- choose one Advanced-first scenario:
  - `deep-relaunch`
  - `migration`
  - `premium-rollout`
  - `critique-repair`
- choose one concrete page or structural target
- decide whether the first bounded slice should stay page-first or structural

### Start Flow

- run `route_advanced_scenario`
- confirm the recommended Advanced path feels correct
- confirm the suggested execution call is actually useful

### Execute One Bounded Slice

- execute only the first bounded slice
- keep critique and follow-up visible
- note:
  - whether Advanced feels like a real productivity upgrade
  - whether the path reduced thinking work
  - whether the path reduced execution work
  - whether anything still feels like “just more tools”

### End Check

- is the bounded slice safe and understandable?
- is the next step obvious?
- does Advanced feel meaningfully deeper than Free?

## What To Pay Attention To

### Free

- does the entry path make sense quickly?
- does it help non-technical users enough?
- does it still feel useful for technical users?
- does it give real result, not just guidance theater?

### Advanced

- does it feel like workflow reduction?
- does it feel like a true productivity upgrade?
- is the Free vs Advanced boundary understandable and fair?
- do upgrade suggestions feel honest rather than salesy?

### Cross-Cutting

- plugin setup friction
- key management friction
- weak copy
- missing guardrails
- confusing scenario mapping
- missing follow-up actions
- runtime / execution gaps

## Minimal Output After Each Session

At the end of each site session, add:

- 3 biggest frictions
- 3 strongest value moments
- 1 most urgent fix
- 1 next scenario to test

## Suggested Immediate Order

1. client-site pilot on one narrow scenario
2. Elementify-site Advanced pilot on one bounded structural or relaunch scenario
3. quick daily synthesis in `feedback-testing.md`
