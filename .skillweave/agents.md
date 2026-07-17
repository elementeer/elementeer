# Elementeer organization SkillWeave helper

Durable planning for every repository in the Forgejo `elementeer` organization is
centralized in the private `elementeer/elementeer-planning` repository.

- Canonical repository: `https://git.langevc.com/elementeer/elementeer-planning`
- Local clone: `/Users/andrelange/Documents/repositories/forgejo/elementeer/elementeer-planning`
- Board: `.skillweave/planning/BOARD.md`
- Execution playbook: `.skillweave/planning/PLAYBOOK.md`
- Ticket schema: `.skillweave/planning/TICKET-SCHEMA.md`

## When SkillWeave starts in this repository
1. Read this repo's root agent instructions; inspect branch, worktree, tests, linked Forgejo issue/PR.
2. Read the central board and playbook. Reuse the existing central ticket that owns the outcome; create one only if none exists.
3. Do not create a durable repository-local `.skillweave/planning` tree — local SkillWeave files are ephemeral and stay ignored.
4. Keep planning fields, status, dependencies, acceptance criteria, evidence, and handoffs in the central ticket. Keep discussion in the owning Forgejo issue.
5. Before handing off, record ticket ID, repo/branch, commits/PRs, tests, remaining work, blockers, next binary gate.
6. Let `elementeer-ops` mirror Forgejo comments and open/closed state. Bot markers and sync-state files are machine-managed — never hand-edit.

If the planning repository or synchronizer is temporarily unavailable, do not fork the
backlog. Preserve a temporary local handoff note, avoid destructive cleanup, and reconcile
into the central ticket once service returns.
