# Behavior lock

## Purpose

A behavior lock prevents cleanup from silently changing observable contracts. It captures what the
system does at a stable boundary before code is simplified.

## Contract inventory

Record:

- inputs and normalization;
- outputs and ordering;
- error types, statuses, and messages when public;
- side effects and idempotence;
- public imports and schemas;
- configuration defaults and precedence;
- resource cleanup;
- real user scenario.

## Existing evidence

Map each contract to an existing test or scenario. Mark gaps. Do not add tests for private call
order merely because that is easiest to observe.

## Add characterization tests

Use Given / When / Then:

- **Given:** a representative current input and required environment;
- **When:** one public operation;
- **Then:** the observable contract that cleanup must preserve.

Run the test before editing and capture the command and passing baseline. A characterization test
normally starts green because it records existing behavior.

## Boundary coverage

Include applicable cases:

- empty or omitted input;
- malformed input;
- exact boundary values;
- dependency failure;
- cancellation or timeout;
- duplicate invocation;
- partial initialization and cleanup;
- stale configuration or persisted state.

## Surprising behavior

When current behavior appears wrong:

1. document the observation;
2. determine whether consumers rely on it;
3. keep the cleanup behavior-preserving;
4. propose a separate correction with explicit acceptance criteria.

Do not “fix while cleaning” without authorization.

## Real scenario lock

Record channel, exact input, environment, artifact/version, observable output, and cleanup. Re-run
the same scenario after relevant cleanup groups. Source-level tests cannot replace an installed,
packaged, browser, CLI, or protocol surface when that is what users experience.

## Error and security lock

Confirm that cleanup preserves:

- rejection of unauthorized or malformed input;
- secret redaction;
- bounded resources;
- causal error information;
- fail-open versus fail-closed policy at the correct boundary;
- cleanup under failure.

## Behavior lock receipt

- [ ] Scope and contracts listed.
- [ ] Focused baseline command passed.
- [ ] Boundary or failure case pinned.
- [ ] Public API/schema captured when relevant.
- [ ] Real user scenario captured.
- [ ] Surprising behavior separated from cleanup.
- [ ] Cleanup state recorded.
