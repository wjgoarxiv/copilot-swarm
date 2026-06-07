# HANDOFF — Copilot-swarm (CSW)

## Where we are

- **Plan:** `plans/0001-csw-port.md` (approved). Full native port of a reference
  plugin into `copilot-swarm` v0.1.0.
- **Branch:** `feat/csw-0.1.0` (never commit to `main` directly).
- **Phase 0 evidence:** `# REFERENCE/_CSW_NOTES.md` (git-ignored — Copilot CLI
  contract, reference inventory, alias map, forbidden-token list).
- **Native goal bound:** `/goal /lazyclaude:start-work`.

## Milestone progress

- [x] **M0** — Repo + forbidden-token scanner. Committed `8d09a43`. 13 tests green;
  3 surfaces clean; reviewer UNCONDITIONAL APPROVAL.
- [x] **M1** — Native plugin skeleton. 18 tests green; live `copilot plugin list`
  shows `copilot-swarm (v0.1.0)`; installed tree token-free (via clean export).
  Finding: direct local install copies whole dir → use clean export for QA; M9
  distribution targets marketplace/owner-repo (see notes §5).
- [~] **M2** — Swarm dispatch MCP + agent roster + conductor doctrine (in progress).
- [ ] M3 goal runtime · M4 csw-plan · M5 executor + continuation hook · M6 steering ·
  M7 review orchestrator · M8 supporting hooks · M9 install UX · M10 release prep.

## Hard rules

- Zero reference-token residue (scanner gates tracked / packable / tarball).
- Functional role names only (no reference persona names).
- No `npm publish` and no push without explicit approval.
- No AI attribution in commits.

## Resume

Run `/lazyclaude:start-work` and continue the first unchecked milestone in the plan.
Ledger: `.csw/ledger.jsonl` (created during execution).
