# Rust

## Repository gate

Inspect the workspace, edition, minimum supported compiler, feature flags, lint policy, build
profiles, target platforms, and test commands. Preserve crate boundaries and avoid adding a
dependency when the standard library or an existing crate already covers the need.

## Types and ownership

- Encode domain variants with enums and let `match` enforce exhaustiveness.
- Use newtypes when semantic primitives can be confused.
- Prefer borrowing at read boundaries and ownership where lifetime coupling would complicate
  the public contract.
- Make mutation local and purposeful.
- Avoid `unwrap` and `expect` in library paths; return typed errors with context.
- Do not silence lints that identify a real contract problem.

## Errors

Libraries expose structured errors callers can inspect. Applications may add contextual reports
at orchestration boundaries. Preserve the source chain. Do not collapse parse, authorization,
storage, and network failures into one string variant.

## Async and concurrency

- Follow the workspace runtime and avoid nested runtime ownership.
- Propagate cancellation through task ownership or explicit tokens.
- Bound spawned tasks, queues, retries, and blocking work.
- Await or abort every spawned task during cleanup.
- Use synchronization primitives based on measured contention and ownership requirements.

## Unsafe code

Treat `unsafe`, FFI, raw pointers, manual initialization, and custom synchronization as separate
high-risk work. State each invariant adjacent to the block, expose a safe wrapper, add boundary
and adversarial tests, and run the workspace's soundness tooling. If those tools are unavailable,
report the gap rather than claiming proof.

## Tests

Use unit tests for pure variants, integration tests for public crate behavior, property tests for
large invariant spaces, and a binary or protocol scenario for user-visible behavior. Avoid
timing sleeps; coordinate with channels, barriers, or injected clocks.

## Verification command selection

Use workspace-defined format, check, lint, test, feature-matrix, target, and documentation commands.
When features change, test both enabled and relevant disabled configurations. Packaging work needs
a clean consumer or example using the produced crate.

## Review checklist

- [ ] Exhaustive enum handling.
- [ ] No new unchecked panic path.
- [ ] Error sources retain context.
- [ ] Task and resource ownership is explicit.
- [ ] Feature and target combinations considered.
- [ ] Unsafe invariants proven with the strongest available tooling.
- [ ] Real user scenario passed.

## Boundary examples to test

Exercise unknown enum input, feature combinations, cancelled tasks, partial initialization,
error-source chains, target-specific paths, panic boundaries, and the built binary or public crate
from outside the implementation module.

## On-demand Rust recipe catalog

Read the [Rust recipe index](rust/README.md) when a concrete implementation pattern is needed.

| Signal | Recipe |
| --- | --- |
| Tokio tasks, cancellation, timeout, structured ownership | [Async runtime](rust/async-tokio.md) |
| Existing Axum service or an approved new service | [Axum stack](rust/axum-stack.md) |
| Workspace lint, feature, target, or MSRV policy | [Strict Cargo configuration](rust/cargo-strict.md) |
| CLI parsing, exit semantics, signals, structured output | [CLI stack](rust/clap-stack.md) |
| Mutex, channel, atomics, deadlock or model checking | [Concurrency](rust/concurrency.md) |
| Dependency choice while preserving workspace policy | [Library choices](rust/libraries.md) |
| A bounded maintenance binary or example | [Small programs](rust/one-liners.md) |
| Property testing or snapshot review | [Property and snapshot testing](rust/proptest-insta.md) |
| Newtype, type-state, sealed variants, non-empty value | [Type-state patterns](rust/type-state.md) |
| FFI, raw pointers, unsafe blocks, safe wrappers | [Unsafe discipline](rust/unsafe-discipline.md) |
| Layout, arena, const, ownership, zero-cost abstraction | [Zero-cost safety](rust/zero-cost-safety.md) |
| Undefined-behavior investigation | [Unsafe verification index](rust-ub/README.md) |

Treat nightly tools, targets, sanitizers, and optional cargo subcommands as capability probes.
If the repository does not already provide them, report the missing proof or request approval;
do not install or switch toolchains automatically.
