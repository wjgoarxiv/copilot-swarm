---
name: csw-init
description: Build a concise hierarchical AGENTS.md knowledge base from measured repository structure, verified commands, ownership boundaries, complexity scoring, and deduplicated local guidance.
---

# Initialize deep repository guidance

Use this skill when a repository needs durable agent instructions at its root and, only where
justified, in complex subdirectories. The output is a navigational and operational knowledge base,
not an exhaustive file listing or generic programming handbook.

## Copilot CLI compatibility

- Copilot CLI discovers `AGENTS.md` by directory scope. Use that native hierarchy instead of a
  runtime context injector.
- Read every existing instruction file before proposing changes.
- Read-only exploration requires host-enforced non-mutating tools; writing workers require isolated
  worktrees and reviewed diffs.
- Do not write machine-specific absolute paths, secrets, temporary state, or branch snapshots.
- Validate commands through the host permission model; this skill does not authorize installation.

## Required references

- [Repository discovery](references/repository-discovery.md)
- [Instruction scoring](references/instruction-scoring.md)
- [AGENTS templates](references/agents-templates.md)

## Outcome contract

Produce the smallest instruction hierarchy that lets an unfamiliar agent answer:

- What is this repository and where are its boundaries?
- Which directories own which responsibilities?
- Where should a given task start?
- Which commands build, test, lint, generate, package, and run it?
- Which conventions and safety constraints are repository-specific?
- Which actions or edits are known mistakes here?
- How does local guidance inherit or override parent guidance?

## Phase 0 — Existing instruction intake

Find and read applicable `AGENTS.md` files and other explicit repository instructions. Record their
scope, useful content, duplication, contradictions, stale commands, and ownership. Preserve factual
guidance unless live evidence disproves it.

Do not replace a mature instruction file merely to normalize formatting.

## Phase 1 — Discovery

Use [Repository discovery](references/repository-discovery.md) to inventory:

- repository and nested-repository roots;
- languages, manifests, lockfiles, and generated/vendor boundaries;
- top-level structure and file count by area/type;
- entry points and public surfaces;
- build, test, lint, format, typecheck, run, package, and release commands;
- CI workflows and deployment surfaces;
- code generators and their owned output;
- high-centrality modules and cross-cutting configuration;
- domain vocabulary and ownership boundaries;
- local or ignored state that must not be documented as portable truth.

Prefer `rg --files`, manifests, task definitions, and CI configuration over walking every generated
directory. Validate candidate commands rather than copying README examples blindly.

## Phase 2 — Measure scale

Record evidence relevant to instruction placement:

| Measure | Why it matters |
| --- | --- |
| file count and depth | navigation and hierarchy pressure |
| languages/manifests | distinct toolchains |
| entry points | where work begins |
| test/build boundaries | local verification contracts |
| central modules | cross-cutting risk |
| generated/vendor areas | edit restrictions |
| ownership/domain splits | need for local vocabulary |
| existing instruction density | duplication risk |

Large size alone does not justify nested files; a large homogeneous subtree may need only root
guidance, while a small deployment or protocol subtree can require distinct instructions.

## Phase 3 — Score candidate directories

Score with [Instruction scoring](references/instruction-scoring.md):

- distinct commands or toolchain;
- distinct architecture or lifecycle;
- distinct domain vocabulary;
- distinct safety or generated-code rules;
- substantial navigation complexity;
- independent ownership or release boundary;
- existing local instruction contract.

Create a nested file only when the local guidance materially differs from the parent. Do not place
files at every directory level.

## Phase 4 — Design the hierarchy

The root owns repository-wide truth:

- overview and boundaries;
- structure and where to look;
- shared commands;
- global conventions and safety;
- verification and generated-code rules;
- hierarchy and precedence.

Child files contain only the delta:

- local responsibility and entry points;
- local commands;
- local patterns and domain vocabulary;
- local anti-patterns and safety constraints;
- inheritance statement when needed.

Avoid repeating the root in every child. Repeated instructions drift.

## Phase 5 — Draft from evidence

Use [AGENTS templates](references/agents-templates.md) selectively. Every statement should be one
of:

- verified repository fact;
- stable convention observed in code/config/history;
- explicit safety or ownership constraint;
- command tested on the current surface;
- concise navigation aid.

Exclude generic language advice, speculative roadmap, individual preferences, current ticket state,
and long catalogs users can obtain from file search.

## Command validation

For each documented command record:

- source: manifest, task file, CI, or established docs;
- working directory;
- prerequisites and safe inputs;
- whether it mutates files or external state;
- observed exit status;
- output or artifact that proves success.

Do not run publish, deploy, destructive, credentialed, or expensive commands merely to validate
documentation. Mark them as unexecuted and verify syntax from owned configuration.

## Navigation quality

“Where to look” should map tasks to starting points:

| Task | Start here | Then inspect | Verification |
| --- | --- | --- | --- |
| add command | | | |
| change public API | | | |
| change persistence | | | |
| update UI | | | |
| change packaging | | | |

Prefer named responsibility and entry point over a raw directory tree.

## Convention extraction

Only document conventions supported by several examples or explicit configuration. Check naming,
module boundaries, error patterns, dependency injection, tests, generated output, public exports,
and lifecycle ownership. Cite paths during analysis; keep the final instruction concise.

## Anti-pattern extraction

Repository-specific anti-patterns include:

- editing generated output instead of its source;
- importing across an intended boundary;
- starting services with the wrong wrapper;
- using a second package manager;
- bypassing required real-surface verification;
- mixing local secrets or machine paths into portable config;
- ignoring nested repository state.

Do not fill the section with generic “write clean code” advice.

## Deduplication pass

For every instruction:

1. identify the lowest scope that owns it;
2. remove copies from descendants;
3. resolve contradictory wording using live evidence;
4. remove obvious, unstable, or non-actionable content;
5. ensure child files are understandable with inherited root context;
6. keep each file concise enough for routine loading.

## Review and boundary cases

Verify:

- monorepo packages with distinct commands;
- nested Git repositories and submodules;
- generated/vendor/fixture directories;
- multiple language roots;
- applications versus libraries;
- deployment or infrastructure subtrees;
- symlinked or ignored local runtime assets;
- empty or documentation-only directories.

Do not create a nested instruction file for an empty, generated, vendor, or purely mechanical
directory.

## Completion evidence

Report the final hierarchy, scoring decisions, commands validated, repository surfaces governed,
instructions preserved/removed, and unresolved command gaps. Show that every nested file adds a
real delta and that no secrets, machine paths, stale branch facts, or duplicated parent rules remain.
