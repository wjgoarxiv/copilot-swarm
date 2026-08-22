---
name: csw-interview
description: Turn ambiguous product or technical intent into a decision-complete brief through evidence-first intake, weighted ambiguity tracking, one-question rounds, challenge modes, and explicit handoff boundaries.
---

# Deep interview

Use this skill before planning or implementation when material decisions about users, goals, scope,
behavior, constraints, migration, or evidence remain unresolved. The interview reduces uncertainty;
it does not substitute for repository research or open-ended brainstorming.

## Copilot CLI compatibility

- Use the host user-question surface when available and ask one question per round.
- Inspect safe repository facts before asking the user about internals.
- Do not launch implementation or mutating workers while decision boundaries remain unresolved.
- Read-only investigation workers require host-enforced non-mutating tools.
- Persist a brief only when the user requests a durable artifact or another active workflow owns it.

## Required references

- [Ambiguity model](references/ambiguity-model.md)
- [Question strategy](references/question-strategy.md)
- [Brief and handoff](references/brief-and-handoff.md)

## Use and skip gate

Use when the request is broad, material interpretations differ, or acceptance cannot be tested
without product decisions. Skip when files/symbols, behavior, constraints, and evidence are already
clear; when an approved plan exists; or when the user asks for lightweight brainstorming only.

## Depth profiles

| Profile | Target ambiguity | Typical rounds | Use |
| --- | ---: | ---: | --- |
| Quick | 30% or lower | up to 5 | bounded choice or small feature |
| Standard | 20% or lower | up to 12 | normal product/technical brief |
| Deep | 15% or lower | up to 20 | architecture, migration, high-risk workflow |

Round counts are ceilings, not quotas. Stop early when the brief is decision-complete; continue
within the profile when a high-impact decision remains unclear despite a low aggregate score.

## Phase 0 — Evidence-first intake

Before the first question:

1. restate the requested outcome and stated solution separately;
2. inspect relevant repository instructions, code, tests, docs, history, and configuration;
3. list verified facts, reasonable inferences, unknown decisions, and contradictions;
4. identify probable users, surfaces, and ownership boundaries;
5. select depth profile and explain why;
6. create the initial ambiguity assessment.

Do not ask where code lives, which framework is used, or what an existing command does when safe
read-only inspection can answer it.

## Ambiguity dimensions

Track the weighted model in [Ambiguity model](references/ambiguity-model.md):

- problem and desired outcome;
- target users and context;
- scope and non-goals;
- behavior and edge cases;
- constraints and quality attributes;
- compatibility and migration;
- security, privacy, and authority;
- acceptance evidence;
- decision boundaries delegated to the implementer.

An aggregate number cannot hide an unresolved non-goal, security boundary, or irreversible choice.

## One question loop

Use `EVIDENCE → QUESTION → REFLECT → PRESSURE → SCORE`:

1. **EVIDENCE:** name the fact or ambiguity motivating the question.
2. **QUESTION:** ask the single highest-leverage unresolved question.
3. **REFLECT:** summarize the answer without adding assumptions.
4. **PRESSURE:** test one hidden assumption, example, tradeoff, or boundary.
5. **SCORE:** update affected dimensions and select the next question.

Do not batch several questions into bullets. The answer to one question should be allowed to change
the next question.

## Question priority

Prefer this order unless evidence demands otherwise:

1. why the outcome matters and for whom;
2. observable success and failure;
3. must-have scope and explicit non-goals;
4. irreversible or high-cost choices;
5. compatibility, migration, and rollout;
6. security, privacy, and authority;
7. performance and operational constraints;
8. defaults delegated to implementation.

Ask for concrete examples and counterexamples. Replace “Should it be fast?” with a workload and
observable budget. Replace “compatible” with named versions, data, consumers, and migration rules.

## Evidence-backed questions

For brownfield work, lead with what was found:

> The current command returns exit 2 for malformed configuration and tests depend on that status.
> Should the new path preserve exit 2 or introduce a distinct status?

This reduces user effort and exposes the actual decision. Clearly label inference when evidence is
incomplete.

## Challenge modes

Before crystallization, use at least one:

- **Counterexample:** What realistic input or user would break the proposed rule?
- **Tradeoff:** If simplicity and backward compatibility conflict, which wins and where?
- **Non-goal pressure:** What tempting adjacent capability must remain out of scope?
- **Failure rehearsal:** What should happen when the dependency fails halfway through?
- **Migration rehearsal:** How do existing users/data reach the new state?
- **Authority check:** Which decisions may the implementer make without confirmation?
- **Reversibility:** What would make rollout unsafe to reverse?

Challenge the idea, not the user. The purpose is sharper boundaries, not debate performance.

## Contradictions and vague language

When answers conflict, quote both decisions neutrally and ask which governs. Pressure-test words
such as simple, intuitive, fast, robust, seamless, secure, minimal, and compatible until they map
to observable behavior or a named default.

## Decision boundaries

Classify unresolved choices:

- **User-owned:** materially changes product, cost, risk, or irreversible behavior.
- **Repository-owned:** established convention or contract decides it.
- **Implementer-owned:** local reversible detail with a named default.
- **External-owner:** requires another team, service, credential, or policy.

The brief is not complete while an important user-owned choice is silently delegated.

## Progress reporting

After meaningful rounds, report compactly:

- ambiguity score and weakest dimensions;
- decisions locked;
- remaining high-impact unknowns;
- current profile and rounds used;
- whether the next step is another question or crystallization.

Do not turn every answer into a long recap.

## Early exit

If the user chooses to proceed above the target, record unresolved decisions, defaults, and risks.
Do not describe the brief as decision-complete. Early exit is a conscious tradeoff, not a successful
interview score.

## Crystallization gate

Crystallize only when:

- target ambiguity is met;
- goals and non-goals are explicit;
- observable behavior covers happy and failure paths;
- compatibility/migration is decided or not applicable;
- security and authority boundaries are explicit;
- acceptance evidence is executable;
- implementer defaults are named;
- contradictions are resolved.

## Output

Produce the decision-complete structure in [Brief and handoff](references/brief-and-handoff.md):
problem/users, goals/non-goals, facts, behavior, edge cases, constraints, tradeoffs, compatibility,
security, acceptance scenarios, decision boundaries, and remaining risk.

## Completion evidence

Show which repository facts were inspected, final ambiguity result, challenge mode used, decisions
locked, unresolved items, and handoff artifact or inline brief. The interview is complete when an
engineer can plan and implement without inventing product decisions—not merely when questions stop.
