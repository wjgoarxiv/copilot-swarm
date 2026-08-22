# Ambiguity model

## Dimensions and weights

| Dimension | Weight | 0% clear | 100% clear |
| --- | ---: | --- | --- |
| Problem/outcome | 15 | symptom or solution only | desired observable outcome agreed |
| Users/context | 10 | unknown audience/context | named users and operating context |
| Scope/non-goals | 15 | open-ended | must-have and must-not explicit |
| Behavior/edges | 15 | happy-path idea | state, boundary, failure behavior defined |
| Constraints/quality | 10 | vague adjectives | measurable or named defaults |
| Compatibility/migration | 10 | unknown consumers/state | support and transition decided |
| Security/authority | 10 | trust/permissions implicit | boundaries and approval owners explicit |
| Acceptance evidence | 10 | subjective completion | scenarios and commands/channels defined |
| Decision boundaries | 5 | implementer must guess | user/repo/implementer ownership explicit |

Score each dimension for clarity from 0–100. Weighted ambiguity is `100 - weighted clarity`.
Numbers guide prioritization; they do not replace judgment.

## Hard blockers

Do not crystallize while any applies:

- non-goals absent for a broad request;
- irreversible or destructive choice unresolved;
- security, privacy, credential, or external-state authority unclear;
- compatibility or migration affects existing users but is undecided;
- acceptance cannot distinguish success from plausible failure;
- contradictory decisions remain;
- implementer would choose product policy silently.

## Initial assessment template

| Dimension | Clarity | Evidence | Missing decision | Impact |
| --- | ---: | --- | --- | --- |
| Problem/outcome | | | | |
| Users/context | | | | |
| Scope/non-goals | | | | |
| Behavior/edges | | | | |
| Constraints/quality | | | | |
| Compatibility/migration | | | | |
| Security/authority | | | | |
| Acceptance evidence | | | | |
| Decision boundaries | | | | |

## Update rules

- Change only dimensions affected by new evidence or a decision.
- Do not raise clarity because a question was asked; raise it because the answer is concrete.
- Lower clarity when a new contradiction or dependency appears.
- Preserve the evidence or answer supporting each score.
- Select the next question by impact and uncertainty, not by cycling dimensions.

## Answer quality

An answer is concrete when it supplies behavior, example, boundary, tradeoff, owner, or measurable
constraint. “Whatever is best,” “make it robust,” and “support everything” usually delegate an
unbounded decision and should not raise clarity.

## Example scoring

“Existing JSON users must continue reading old files; new writes use v2; migration is lazy on
successful read; corrupt v1 stays untouched and returns a typed error” can raise compatibility,
behavior, and acceptance clarity. “Keep it backward compatible” cannot.

## Completion packet

```text
Profile:
Rounds used:
Weighted ambiguity:
Hard blockers: none/list
Weakest dimensions:
Decisions locked:
Defaults delegated:
Remaining risks:
```

## Early-exit packet

When the user stops early, record current ambiguity, unresolved high-impact choices, assumed
defaults, and consequences. Route to planning with an explicit warning rather than presenting a
decision-complete handoff.

## Review checklist

- [ ] Scores cite evidence.
- [ ] Non-goals explicit.
- [ ] Hard blockers checked separately.
- [ ] Security and authority scored.
- [ ] Acceptance is observable.
- [ ] Decision owners named.
- [ ] Aggregate score does not hide one critical unknown.
