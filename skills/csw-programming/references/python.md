# Python

## Repository gate

Inspect `pyproject.toml`, lockfiles, supported Python versions, package layout, type checker,
linter, formatter, and test runner. Preserve the selected environment manager and do not
introduce a second one for convenience.

## Data modeling

- Use immutable dataclasses for internal value objects when validation is unnecessary.
- Use the repository's schema library at untrusted boundaries.
- Use enums or literal unions for closed variants and check them exhaustively.
- Avoid `Any` in public and domain signatures; isolate unavoidable dynamic libraries behind
  a typed adapter.
- Distinguish semantic primitives with `NewType` or small immutable value objects when mixing
  them would cause a real bug.

## Errors

- Define specific exception types with causal fields.
- Catch only exceptions the current boundary can recover from.
- Chain translated failures with `raise ... from error`.
- Broad catches belong only at process or request boundaries and must log safely or return a
  typed failure before cleanup.
- Do not use `None` as both “not found” and “operation failed.”

## Resources and async

- Use context managers for files, locks, transactions, temporary resources, and clients.
- Follow the repository's async runtime; do not mix event-loop ownership models.
- Propagate cancellation and bound task groups.
- Move blocking work off the event loop only when measurement shows it blocks.
- Close async generators and clients during failure and cancellation.

## Tests

Use temporary paths, isolated environment variables, injected clocks, and local protocol
servers. Prefer real dataclasses and fakes over mocks. A subprocess or CLI feature needs a
subprocess-level scenario that records exit status and output.

## Verification command selection

Use configured commands from the repository. Typical lanes are:

- focused test by node or marker;
- full relevant test directory;
- configured type checker;
- configured lint and format check;
- wheel/sdist or installed-consumer smoke when packaging changes.

Do not invent a command merely because it is common elsewhere.

## Review checklist

- [ ] No mutable default arguments.
- [ ] No broad catch in domain logic.
- [ ] Boundary data parsed once.
- [ ] Public types avoid dynamic escape hatches.
- [ ] Context managers own resources.
- [ ] Async cancellation is tested.
- [ ] Package import works outside the source checkout when relevant.
- [ ] Real user scenario passed.

## Boundary examples to test

Exercise invalid text encoding, unknown schema fields when policy requires rejection, cancellation
during awaited I/O, exception chaining, partial file creation, and import behavior from an installed
artifact. Capture the verification command rather than assuming the configured tools ran.

## On-demand Python recipe catalog

Read the [Python recipe index](python/README.md) for its decision map, then choose the narrow
leaf below:

| Signal | Recipe |
| --- | --- |
| Structured concurrency, cancellation, task ownership | [Async and resource lifetime](python/async-anyio.md) |
| Dataclass, schema model, typed dictionary, protocol | [Data modeling](python/data-modeling.md) |
| Streaming or tabular transformation with bounded memory | [Data processing](python/data-processing.md) |
| Exception taxonomy, chaining, outcome values | [Error handling](python/error-handling.md) |
| Existing FastAPI service or an approved new service | [FastAPI stack](python/fastapi-stack.md) |
| HTTP timeouts, pools, retries, streaming cleanup | [HTTP client lifecycle](python/http-client-lifecycle.md) |
| Selecting a dependency while preserving repository policy | [Library choices](python/libraries.md) |
| A bounded single-file utility | [Small programs](python/one-liners.md) |
| Measured serialization hot path | [JSON serialization](python/orjson-stack.md) |
| Typed model/tool boundary in an AI-enabled application | [Typed AI integration](python/pydantic-ai.md) |
| New or explicitly migrated project configuration | [Project configuration](python/pyproject-strict.md) |
| Existing Textual terminal application | [Terminal UI](python/textual-tui.md) |
| NewType, protocol, type guard, enum, exhaustive branch | [Type patterns](python/type-patterns.md) |

Version strings and install commands in examples are not current-state claims. Prefer the
repository lockfile and existing environment; verify any requested dependency change against
the relevant official documentation before editing a manifest.
