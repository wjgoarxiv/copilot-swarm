# Smell catalog

## How to use this catalog

Classify a finding only when the concrete code exhibits the described cost. Record path, symbol,
evidence, behavior to preserve, and risk. A category name is not sufficient justification.

## Commentary

### Narrated syntax

Remove comments that merely restate the next line. Preserve comments that explain why the obvious
alternative is unsafe, which external contract applies, or when a workaround can be removed.

### Filler documentation

Remove generic claims such as “robust,” “optimized,” or “handles errors” when no constraint or
evidence follows. Replace with concrete contract only when that contract is useful.

### Vague TODO

A useful TODO names a missing behavior, trigger or deadline, owner when known, and why it cannot be
resolved now. Otherwise resolve or remove it within scope.

## Structure

### One-call wrapper

Remove when it only renames a dependency call and owns no validation, policy, error translation,
resource lifecycle, or test seam. Preserve when it defines a stable boundary the product owns.

### Speculative abstraction

Interfaces with one implementation, configuration variants with no consumer, and factories with
one branch are suspect. Confirm history and current roadmap before removal; do not guess.

### Generic bucket

`utils`, `helpers`, and `common` become dumping grounds when members have unrelated owners. Move
concepts only through a scoped refactor with caller mapping and characterization tests.

### Duplicate boundary logic

Parse and validate untrusted input once. Repeated internal null/type checks may indicate missing
typed boundaries. Do not remove the outer trust-boundary validation.

### Dead compatibility

Require caller and support-window evidence. Search dynamic registration, configuration, docs, and
external package consumers before removal.

## Error handling

### Broad catch

A broad catch that logs and continues often hides corruption. Keep broad handling only at a process
or request boundary where it has explicit translation, observability, and cleanup.

### Swallowed cause

Replacing a typed or chained failure with a string prevents callers from deciding correctly.
Preserve causal context.

### Default fallback

A fallback must correspond to a documented, safe degraded mode. Silent fallback from corrupt or
unauthorized input is not resilience.

### Retry without model

Retries need idempotence, bounded attempts, backoff, jitter, timeout, and observable exhaustion.
Remove magical retry loops or redesign them through a behavior change.

## Performance

### Hidden multiplicative work

Look for scans, queries, serialization, parsing, or allocation repeated inside loops. Measure with
a representative workload before and after a non-trivial change.

### Premature work

Reject invalid, unauthorized, cached, or empty cases before expensive network, database, or render
work when the contract allows it.

### Unbounded state

Queues, caches, task sets, retries, and collected output require limits and cleanup. Adding a limit
is a behavior change and needs explicit acceptance criteria.

## Tests

### Mock tautology

If the test configures every collaborator result and asserts those configured values, it proves
nothing about production behavior. Prefer real values, fakes, or protocol-level tests.

### Private-call coupling

A refactor should not break a behavior test. Replace call-order assertions with observable output
unless call order is the contract.

### Sleep synchronization

Replace sleeps with events, injected clocks, or bounded waits that report the last observation.

### Snapshot overreach

Snapshots are useful for stable structures and artifacts. Avoid locking incidental prose, volatile
IDs, timestamps, or unrelated fields.

## Preserve checklist

- [ ] Rationale and security comments retained.
- [ ] Trust-boundary validation retained.
- [ ] Error causes and typed variants retained.
- [ ] Resource and cancellation cleanup retained.
- [ ] Supported compatibility retained.
- [ ] Accessibility and platform behavior retained.
- [ ] Generated markers retained.
