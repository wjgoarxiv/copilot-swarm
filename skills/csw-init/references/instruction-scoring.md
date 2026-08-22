# Instruction scoring

## Purpose

Use scoring to make nested `AGENTS.md` placement explicit. It is a decision aid, not an automatic
file generator.

## Candidate score

Score each candidate directory 0–2 per dimension:

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Commands/toolchain | inherits parent | minor local variation | distinct build/test/run |
| Architecture/lifecycle | homogeneous | notable local pattern | independent subsystem |
| Domain vocabulary | generic | several local terms | specialized model/contracts |
| Safety/generated rules | none | one local caution | strong edit/operation boundary |
| Navigation complexity | obvious | several entry points | difficult without local map |
| Ownership/release | same boundary | partial independence | separate package/deploy/release |
| Existing local contract | none | informal docs | maintained instruction surface |

## Decision bands

- `0–3`: root guidance only.
- `4–6`: normally root guidance plus a “where to look” row.
- `7–9`: consider nested guidance when content is a real delta.
- `10+`: nested guidance is usually justified.

Override the score when a hard boundary exists, such as generated code, security-sensitive
operations, independent release, or nested repository. Document the override.

## Duplication penalty

Subtract practical value when the proposed child repeats parent overview, global commands,
language syntax, or generic engineering advice. If fewer than three durable local facts remain
after deduplication, do not create the child file.

## Stability test

Include a fact only if it is likely to remain valid across routine commits. Avoid current branch,
ticket, temporary migration state, individual assignment, ephemeral port, local path, and exact
file counts unless they are regenerated automatically and useful.

## Scoring worksheet

| Candidate | Cmd | Arch | Domain | Safety | Nav | Owner | Existing | Total | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| | | | | | | | | | |

For each accepted candidate, list the exact local delta. For each rejected high score, explain why
root guidance or existing documentation is sufficient.

## Hierarchy rules

- Root rules apply unless a child explicitly narrows or overrides them.
- Put a rule at the lowest common owner, not at every consumer.
- Avoid consecutive directory levels with near-identical files.
- Keep nested files focused on local entry points, commands, contracts, and risks.
- Do not rely on the child to repeat global safety policy.

## Review questions

- Would an agent make a costly mistake here without local guidance?
- Is the information discoverable quickly from parent guidance and manifests?
- Is the content specific, stable, and actionable?
- Does it conflict with another instruction scope?
- Can it be shortened to a root navigation row?
- Does the subtree have its own verification command or ownership boundary?

## Edge cases

### Monorepo package

Separate manifest and commands often justify local guidance, but shared conventions stay at root.

### Generated tree

A short child file may be justified solely to prohibit direct edits and point to generator source.

### Documentation subtree

Create local guidance only when it has a distinct build, style, link checker, or publishing boundary.

### Empty or placeholder directory

Never create instructions for hypothetical future content.

## Completion checklist

- [ ] Every candidate scored.
- [ ] Overrides documented.
- [ ] Duplication removed.
- [ ] Stable facts only.
- [ ] Hierarchy has no redundant levels.
- [ ] Accepted children contain real local delta.

## Dry-run evaluation scenarios

Before accepting generated instructions, test them against representative maintenance requests:

1. a small change in the dominant source package;
2. a change inside a nested package with different commands;
3. a test-only change;
4. a generated or vendored path that should not be edited;
5. a public API or release-sensitive change;
6. a malformed request that would exceed repository authority.

For each scenario, ask which instruction files apply, which command would be selected, which safety
boundary activates, and what evidence is required. A rule that cannot guide any realistic scenario
is probably noise; a scenario with no applicable rule exposes a coverage gap.

## Contradiction matrix

Record material conflicts rather than merging them into ambiguous prose:

| Broader rule | Narrower rule | Paths affected | Intended precedence | Evidence |
| --- | --- | --- | --- | --- |

Narrower scope may specialize a global workflow, but it must not silently weaken security,
authority, or completion requirements. Escalate unclear ownership rather than choosing whichever
wording is more convenient.

## Maintenance-cost check

Score the proposed hierarchy for future drift:

- number of repeated commands or rules;
- number of paths named explicitly that may move;
- number of facts derived from generated state;
- number of instructions that depend on machine-local configuration;
- number of nested files with no unique scoped guidance;
- number of verification claims not tied to an owned executable source.

Prefer stable concepts, owned command sources, and path-local specialization. Remove duplicated
boilerplate that would have to be updated in several files after one repository change.

## Final scoring receipt

```text
Files proposed:
Scenarios evaluated:
Coverage score:
Specificity score:
Verifiability score:
Contradictions unresolved:
Duplicate rules removed:
Machine-local assumptions:
Final accept/revise verdict:
```
