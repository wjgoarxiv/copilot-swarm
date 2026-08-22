# Language-specific cleanup

Use language conventions as evidence, not as permission to rewrite healthy code. First identify
the repository's formatter, linter, compiler settings, supported runtime, and nearby established
patterns. Preserve public behavior and repository policy even when a different idiom is popular.

## Contents

- [Cross-language decision rule](#cross-language-decision-rule)
- [Python](#python)
- [TypeScript and JavaScript](#typescript-and-javascript)
- [Go](#go)
- [Rust](#rust)
- [JVM languages](#jvm-languages)
- [Shell](#shell)
- [Language review packet](#language-review-packet)

## Cross-language decision rule

For each candidate cleanup, answer in order:

1. Is the construct generated, or merely unfamiliar?
2. Which observable contract does it participate in?
3. Does the repository configure a rule for it?
4. Does removing it change evaluation, allocation, error, or cleanup behavior?
5. Is the proposed form already established near the target?
6. Which repository-owned command proves the change?

Reject a cleanup justified only by taste, terseness, or a generic “idiomatic” claim. A language
idiom loses to an explicit compatibility contract, generated-code boundary, or local convention.

## Python

### Remove cautiously

- Repeated `getattr`, `hasattr`, or `isinstance` checks can indicate an untyped internal boundary,
  but may protect plugin, deserialization, or version-compatibility inputs.
- Broad `except Exception` blocks are suspect inside domain logic. Preserve them at process,
  request, worker, or plugin boundaries when they translate failures and guarantee cleanup.
- Thin helpers may own context-manager lifetime, exception translation, import isolation, or a
  stable monkeypatch seam. Read callers and tests before inlining.
- Comprehensions are not automatically clearer than loops. Keep the loop when it carries early
  exit, instrumentation, mutation order, or multiple named decisions.
- Dataclass, model, and descriptor boilerplate may be consumed through reflection. Search field
  metadata, serializers, factories, dependency injection, and public imports before deletion.

### Preserve semantics

- Keep the distinction between omitted, `None`, empty, and false values when callers observe it.
- Keep generator laziness unless materialization is explicitly harmless and bounded.
- Keep exception classes, causes, and traceback context used by callers or operators.
- Keep `with`, `try/finally`, cancellation, and async-context cleanup boundaries.
- Keep import timing when optional dependencies, startup cost, or cycle avoidance is intentional.

Verify with repository-owned tests, type checks, lint, and the real entry point. Do not introduce
a new formatter, type checker, package, or minimum Python version during cleanup.

## TypeScript and JavaScript

### Remove cautiously

- Runtime guards can look redundant beside TypeScript types but remain necessary at JSON, DOM,
  environment, IPC, plugin, storage, and network boundaries.
- Optional chaining and nullish coalescing are not replacements for every explicit branch. Check
  whether `null`, `undefined`, empty string, zero, and false are distinct.
- An `async` wrapper may preserve rejection timing, stack shape, cleanup, or a public Promise
  contract even when it appears to return another Promise directly.
- Object spreads can invoke getters, change property order, drop prototypes, and allocate. Do not
  replace targeted mutation or construction mechanically.
- Barrel exports and compatibility aliases may be public package surface. Inspect package exports,
  declaration output, docs, and consumer tests before pruning them.

### Preserve semantics

- Keep eager versus deferred Promise creation.
- Keep microtask ordering and abort-signal propagation where observable.
- Keep `finally` cleanup and listener removal on success, rejection, abort, and timeout.
- Keep discriminated unions and exhaustive checks that make invalid states visible.
- Keep stable serialization keys and omission behavior.

Use only the repository's selected runtime, package manager, compiler, test runner, and formatter.
Do not turn a cleanup into an ESM/CJS, framework, or dependency migration.

## Go

### Remove cautiously

- Repeated `if err != nil` branches are not generated filler. Remove only duplication around them,
  while preserving wrapping, sentinel identity, partial-result policy, and cleanup.
- Small interfaces are justified at a consumer boundary or test seam; a one-implementation
  interface is not automatically speculative.
- `defer` can clearly guarantee cleanup but has timing and loop-lifetime implications. Confirm
  exactly when resources must be released.
- Zero values may be deliberate API defaults. Do not replace them with constructors unless the
  repository contract requires construction.
- Copies that appear redundant may prevent mutation aliasing or races.

### Preserve semantics

- Keep error identity tested with repository conventions.
- Keep context cancellation and deadline propagation.
- Keep channel ownership, close responsibility, and goroutine termination.
- Keep nil versus empty slice or map distinctions when serialized or externally visible.
- Keep deterministic iteration when code explicitly sorts otherwise unordered values.

Run repository-owned tests, race checks when already supported, static analysis, formatting, and a
representative command or service scenario. Do not add concurrency merely to shorten a loop.

## Rust

### Remove cautiously

- `clone` may be unnecessary, but removal can change borrow lifetimes, lock duration, or ownership
  boundaries. Prove the new borrow does not extend across mutation, await, or synchronization.
- `match` arms that resemble boilerplate may encode exhaustive domain policy. Prefer clarity over
  clever combinators when error variants matter.
- Newtype wrappers may own invariants, trait selection, serialization shape, or unit safety.
- Explicit lifetime or type annotations may stabilize inference and diagnostics at public seams.
- `unsafe` comments and localized wrappers are safety contracts, not prose clutter.

### Preserve semantics

- Keep drop order and RAII cleanup.
- Keep panic versus recoverable-error policy.
- Keep error sources and typed variants.
- Keep `Send`/`Sync` and feature-gated behavior.
- Keep allocation and ownership changes out of cleanup unless measured and accepted.

Use the checked-in toolchain and repository features. Run the repository's formatter, lints,
tests, and relevant feature combinations; do not “clean up” by silencing a lint globally.

## JVM languages

- Treat annotations as runtime or build inputs until reflection, serialization, dependency
  injection, persistence, nullability, and code generation are ruled out.
- Preserve overloads, bridge methods, visibility, and checked exception contracts used by Java,
  Kotlin, Scala, Groovy, or framework consumers.
- Do not replace explicit loops with streams or sequences without checking order, laziness,
  exception propagation, parallelism, and allocation.
- Keep resource ownership explicit through the repository's established close/use pattern.
- Keep equality, hashing, and serialization behavior stable when simplifying data classes.

Compile through the repository build, run targeted and adjacent tests, and exercise the packaged
surface. A source-only inspection cannot prove reflection or generated-code compatibility.

## Shell

- Preserve quoting, argument boundaries, exit-status checks, traps, cleanup, and `--` separators.
- Do not compress readable conditionals into pipelines that mask which command failed.
- Treat word splitting, globbing, subshells, pipeline status, and environment inheritance as
  behavior. Test empty values, spaces, leading dashes, and command failure.
- Prefer existing repository shell style; do not introduce a new shell dialect during cleanup.
- Never execute or embed untrusted text as code. Cleanup must not weaken command construction.

Use the repository's lint or test harness and run representative invocations in a disposable
environment. Record created files and processes, then verify cleanup.

## Language review packet

```text
Language and configured version:
Repository formatter/linter/compiler:
Nearby precedent inspected:
Construct classified:
Boundary or contract preserved:
Evaluation/error/cleanup risks checked:
Focused repository command:
Real entry-point observation:
Verdict and remaining uncertainty:
```
