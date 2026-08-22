# Testing strategy

## Start from behavior

Write the contract in observable terms before choosing a test seam. Each test contains:

- **Given:** only the state required for the behavior;
- **When:** one action;
- **Then:** the externally meaningful outcome caused by that action.

One test may make several closely related assertions about one outcome, but it must not
hide multiple actions or unrelated behaviors.

## Red evidence

A valid failing-first receipt records:

1. the exact verification command;
2. non-zero exit status;
3. the failing test name;
4. the decisive mismatch;
5. why the failure represents the missing behavior.

Import errors, broken fixtures, unavailable services, and syntax failures do not prove the
intended test is red. Repair the harness first.

## Test level selection

| Question | Level |
| --- | --- |
| Is a pure decision correct for all variants? | unit |
| Does an adapter obey a real protocol or storage contract? | integration |
| Can a user complete the intended workflow? | end-to-end |
| Does a package work outside the source checkout? | packed-consumer smoke |
| Does a hook produce the expected host payload? | fixture replay plus host probe |

Do not call a mocked SDK test “integration.” The adapter boundary must exchange the real
wire, file, database, process, or host payload.

## Boundary catalog

Select only applicable cases, but make the selection explicit:

- empty input and omitted optional input;
- smallest and largest accepted values;
- one value outside each boundary;
- malformed encoding or schema;
- duplicate or reordered events;
- timeout and cancellation;
- unavailable dependency;
- permission denied and authentication failure;
- partial read/write and interrupted cleanup;
- concurrent requests and repeated invocation;
- stale version or incompatible persisted state.

## Fakes and mocks

Preference order:

1. real value or pure object;
2. in-memory implementation of a small interface;
3. disposable real dependency;
4. local protocol server;
5. narrow mock for time, randomness, or inaccessible SaaS.

A fake needs contract tests against the real adapter when semantic drift would be costly.
Never configure a mock to return the exact value the implementation expects and then claim
the implementation was tested.

## Determinism

- Inject clocks and random sources.
- Await events instead of sleeping.
- Isolate environment variables and temporary directories per test.
- Shuffle when the runner supports it and fix order dependencies.
- Bind a random seed in failure output.
- Make background task teardown part of the assertion.

## Verification command checklist

- [ ] Narrow red command captured.
- [ ] Narrow green command captured.
- [ ] Adjacent tests passed.
- [ ] Full relevant suite passed.
- [ ] Static checks passed.
- [ ] Real user scenario passed.
- [ ] Boundary or failure scenario passed.
- [ ] Cleanup receipt recorded.

## Prompt and agent tests

Assert structured decisions, required fields, refusal categories, or parsed payloads.
Avoid exact prose snapshots unless text is itself a public contract. A wording change must
not fail a test when the required decision and evidence remain correct.

## Failure diagnosis

When a test fails unexpectedly, classify it before editing:

- product regression;
- test expectation error;
- fixture leak;
- environment dependency;
- timing or order flake;
- unsupported platform;
- stale generated artifact.

Never delete, skip, quarantine, or relax a failing test merely to restore green output.

## Scenario record template

```text
Scenario:
Channel:
Artifact/version:
Given:
When:
Then:
Command or interaction:
Exit/status:
Observed output:
Evidence path:
Cleanup:
```

## Regression selection

Choose adjacent tests from the actual dependency graph: callers, adapters, public exports,
serialization, configuration, and packaging. “Full suite” is not a substitute for naming the
high-risk neighbors, because a full suite may omit the relevant platform or feature variant.

## Test review questions

- Would reverting production code make this test fail?
- Can the test pass when production returns a wrong but non-empty value?
- Does the fixture represent the real boundary?
- Is failure output diagnostic enough to reproduce locally?
- Does teardown run when the assertion fails?
- Does the test remain valid after an internal refactor?
