# HANDOFF — Copilot-swarm (CSW)

## Where we are

- **Plan:** `plans/0001-csw-port.md` (approved). Full native port of a reference
  plugin into `copilot-swarm` v0.1.0.
- **Branch:** `feat/csw-0.1.0` (never commit to `main` directly).
- **Phase 0 evidence:** `# REFERENCE/_CSW_NOTES.md` (git-ignored — Copilot CLI
  contract, reference inventory, alias map, forbidden-token list).
- **Native goal bound:** `/goal /lazyclaude:start-work`.

## Milestone progress

- [~] **M0** — Repo + forbidden-token scanner (in progress).
- [ ] M1 plugin skeleton · M2 swarm dispatch MCP · M3 goal runtime · M4 csw-plan ·
  M5 executor + continuation hook · M6 steering · M7 review orchestrator ·
  M8 supporting hooks · M9 install UX · M10 release prep.

## Hard rules

- Zero reference-token residue (scanner gates tracked / packable / tarball).
- Functional role names only (no reference persona names).
- No `npm publish` and no push without explicit approval.
- No AI attribution in commits.

## Resume

Run `/lazyclaude:start-work` and continue the first unchecked milestone in the plan.
Ledger: `.csw/ledger.jsonl` (created during execution).
