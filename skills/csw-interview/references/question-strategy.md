# Question strategy

## One-question rule

Ask one primary question per turn. A short clarification inside that question is acceptable, but
do not present a survey of unrelated decisions. The next question should depend on the answer.

## High-leverage question shape

1. cite a verified fact or current ambiguity;
2. present materially different choices when they exist;
3. explain the consequence of the choice;
4. ask for one decision, example, or boundary.

Example:

> The current workflow updates local state but never pushes remotely. Should “publish” in this
> feature remain a local artifact operation, or should it update the remote service? The second
> choice adds credentials, rollback, and approval requirements.

## Stage priority

### Intent

- What outcome matters, independent of the proposed solution?
- Who experiences the current problem and in what context?
- What happens if nothing changes?

### Scope

- What must be included for the outcome to be useful?
- Which adjacent capability is explicitly a non-goal?
- Which existing behavior must remain untouched?

### Behavior

- Give one happy example and one counterexample.
- What should the user observe when the dependency fails?
- Which inputs, states, or transitions are invalid?

### Tradeoff

- If compatibility conflicts with simplicity, which wins?
- Which is more important: latency, completeness, cost, or reversibility?
- What degradation is acceptable and observable?

### Acceptance

- Which command, UI flow, response, or artifact proves success?
- What plausible result should fail acceptance?
- Which edge and regression scenario are mandatory?

## Evidence-backed confirmation

Prefer “I found X at path/config; should the new behavior preserve it?” over asking the user to
rediscover repository facts. Label evidence, inference, and decision separately.

## Pressure techniques

- Ask for a concrete example.
- Ask for the nearest counterexample.
- Force a priority between competing qualities.
- Ask what must never happen.
- Rehearse a partial failure.
- Rehearse migration and rollback.
- Ask who owns approval and defaults.
- Revisit an earlier answer when a later decision conflicts.

## Avoid

- implementation trivia before intent;
- questions answerable from the repository;
- leading questions that hide a preferred solution;
- yes/no questions when different interpretations need comparison;
- batching ten questions to reduce turns;
- rotating topics while the current answer remains vague;
- asking the user to approve generic best practices.

## Vague-language translations

| Vague word | Ask for |
| --- | --- |
| fast | workload, percentile, budget, environment |
| simple | user steps, configuration, concepts exposed |
| compatible | versions, consumers, data, transition |
| secure | threats, authority, data, failure policy |
| robust | named failures and recovery behavior |
| minimal | must-have outcome and non-goals |
| intuitive | user model, discoverability, error recovery |

## Round note

```text
Evidence/ambiguity:
Question:
Answer:
Decision locked:
Assumption challenged:
Dimensions changed:
Next highest-impact unknown:
```

## Question review

- [ ] One decision only.
- [ ] Cannot be answered safely from files or defaults.
- [ ] Answer changes plan or acceptance.
- [ ] Consequence is visible.
- [ ] No hidden recommendation presented as neutral.
- [ ] User effort is minimized.
