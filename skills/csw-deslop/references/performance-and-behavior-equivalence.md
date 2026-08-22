# Performance and behavior equivalence

A cleanup is equivalent only when it preserves more than returned values. Evaluation timing,
side effects, ordering, error surfaces, resource lifetime, and operational cost can all be part of
the contract. Measure before claiming a performance improvement.

## Contents

- [Equivalence dimensions](#equivalence-dimensions)
- [Hoisting and evaluation timing](#hoisting-and-evaluation-timing)
- [Eager and lazy work](#eager-and-lazy-work)
- [Batching and deduplication](#batching-and-deduplication)
- [Caching](#caching)
- [Concurrency](#concurrency)
- [Measurement protocol](#measurement-protocol)
- [Equivalence receipt](#equivalence-receipt)

## Equivalence dimensions

Check every applicable dimension:

| Dimension | Questions |
| --- | --- |
| Value | Are success values, types, shapes, and precision unchanged? |
| Presence | Are omitted, null, empty, false, and default values still distinct? |
| Order | Are outputs, effects, logs, callbacks, and errors observed in the same order? |
| Cardinality | Are operations, callbacks, retries, events, and writes performed the same number of times? |
| Timing | Is work still eager, deferred, short-circuited, or cancelled at the same boundary? |
| Failure | Are error type, cause, partial result, retry, and cleanup preserved? |
| Resources | Are files, sockets, locks, tasks, transactions, and memory released at the same point? |
| State | Are cache, persistence, idempotence, and mutation semantics preserved? |
| Concurrency | Are limits, ordering, isolation, race exposure, and cancellation unchanged? |
| Cost | Are query count, scans, allocations, serialization, and network traffic no worse? |

“Tests passed” is insufficient when the tests cover only values. Add focused observation for the
dimension the cleanup could alter.

## Hoisting and evaluation timing

Moving an expression out of a branch or loop is safe only when:

- its inputs are invariant at the new location;
- it has no newly observable side effect;
- it cannot fail on paths that previously skipped it;
- it does not retain a resource, reference, lock, or large value longer;
- it does not cross authorization, validation, transaction, or cancellation boundaries;
- it preserves per-iteration freshness when freshness matters.

Common unsafe hoists include parsing before cheap rejection, acquiring a connection before cache
lookup, reading configuration before an override is applied, and constructing a client before a
fork or test seam. Characterize the skipped path as well as the main path.

Moving work inward can also regress behavior by repeating parsing, compilation, allocation,
database reads, or dependency construction. Count the operation on a representative workload.

## Eager and lazy work

Changing a generator, stream, iterator, future, Promise, sequence, query, or callback pipeline can
change when work happens and how much work happens.

Preserve:

- first-item latency and ability to stop early;
- exception timing;
- snapshot versus live-view semantics;
- resource ownership while iteration is partial;
- repeatability of multiple iterations;
- backpressure and bounded memory;
- cancellation before all work completes.

Materializing a bounded collection may clarify ownership, but it is a behavior and cost decision.
Do not disguise it as mechanical simplification.

## Batching and deduplication

Combining repeated work can be valuable, but a batch is not automatically equivalent. Check:

- whether per-item authorization or validation occurs before grouping;
- whether duplicate inputs should cause duplicate effects;
- whether partial failure was item-scoped or all-or-nothing;
- whether item order and response association remain stable;
- whether maximum batch size and payload size are bounded;
- whether retries remain idempotent;
- whether transactions or rate limits change.

When replacing an N+1 pattern, pin query count and output order. Exercise empty input, one item,
duplicates, a boundary-sized batch, and one failing item. Keep a clear mapping from each result to
its original input.

## Caching

Adding, moving, or removing a cache changes observable state. Establish:

- key completeness and normalization;
- tenant, identity, locale, permission, and configuration isolation;
- freshness and invalidation owner;
- capacity and eviction;
- failure and negative-result policy;
- concurrency behavior for misses;
- cleanup between tests or requests;
- whether returned mutable values are shared.

Do not replace repeated computation with an unbounded process-global map. Do not remove a cache
because the call looks cheap without measuring the production-sized input or remote dependency.
Cache changes require explicit acceptance criteria rather than a line-count cleanup goal.

## Concurrency

Sequential code is not slop merely because operations could run in parallel. Before changing the
boundary, identify:

- maximum in-flight work;
- ordering contract;
- shared mutable state;
- cancellation and timeout propagation;
- first-error versus aggregate-error policy;
- cleanup after partial start;
- retry amplification;
- external capacity and rate limits;
- deterministic test strategy.

Preserve an existing concurrency limit and task ownership. A shorter unbounded fan-out expression
is a regression. Likewise, serializing independent bounded work can be a material performance
change even when values stay identical.

## Measurement protocol

1. Name the suspected multiplicative or repeated operation.
2. Choose a representative input and a boundary input.
3. Capture baseline wall time only alongside deterministic counters such as queries, reads,
   allocations, requests, or peak retained items.
4. Run enough repetitions to distinguish signal from setup noise when timing matters.
5. Apply one cohesive change.
6. Re-run under the same build, data, environment, and instrumentation.
7. Check all equivalence dimensions, not just the target counter.
8. Remove temporary instrumentation or bind it as an intentional artifact.

Prefer repository-owned benchmarks, profilers, tracing, and test fixtures. If no trustworthy
measurement surface exists, report the suspected cost without claiming improvement.

## Equivalence receipt

```text
Bound scope and operation:
Behavior-lock command:
Representative and boundary inputs:
Value/presence/order/cardinality result:
Timing/failure/resource result:
State/concurrency result:
Baseline deterministic counters:
Post-change deterministic counters:
Real scenario:
Verdict: EQUIVALENT | CHANGED | INCONCLUSIVE
Remaining risk:
```

Use `CHANGED` when any observable dimension moves, even if the change seems beneficial. Move that
work into an explicitly authorized behavior or performance task. Use `INCONCLUSIVE` when the
required environment or measurement is unavailable; never convert absence of evidence into
equivalence.
