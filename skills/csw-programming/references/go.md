# Go

## Repository gate

Inspect `go.mod`, workspace files, supported Go version, task runner, lint configuration,
generated-code commands, and package layout. Preserve module boundaries and the repository's
chosen router, database, RPC, and logging libraries.

## Types and errors

- Use named types and constructors where invalid values must be rejected.
- Keep fields unexported when construction invariants matter.
- Wrap errors with `%w` and inspect them with `errors.Is` or `errors.As`.
- Do not discard errors or replace useful causes with bare strings.
- Use panic only for impossible startup invariants or tests, never routine library failure.
- Make closed variants explicit and enforce exhaustiveness with the configured analyzer or a
  deliberate default that reports the unknown value.

## Concurrency

- Pass `context.Context` first for cancellable work.
- Bound goroutines and channels; define who closes each channel.
- Prefer structured groups for sibling tasks.
- Stop tickers, close bodies, and release resources immediately after successful acquisition.
- Test cancellation, partial failure, and goroutine cleanup.
- Run the race detector for touched concurrent paths when the environment supports it.

## HTTP and storage

- Configure client timeouts and transports explicitly.
- Always close and, when reuse matters, drain response bodies safely.
- Keep transactions scoped and roll back on every non-commit path.
- Separate generated query code from domain decisions.
- Validate transport input, then pass typed values inward.

## Tests

Use table-driven cases when the same behavior has meaningful input classes, but keep one action
and one outcome per case. Use `t.TempDir`, `t.Setenv`, `httptest`, and disposable services. Avoid
sleep-based synchronization.

## Verification command selection

Use the repository's task targets. Typical evidence includes focused `go test`, full package
tests with shuffle, static analysis, configured lint, race detection, and a built binary or CLI
scenario. Generated files must be regenerated and checked for a clean diff.

## Review checklist

- [ ] Every error is handled or deliberately returned.
- [ ] Context and cancellation propagate.
- [ ] Goroutine and channel ownership are explicit.
- [ ] Bodies, rows, files, and tickers close.
- [ ] No hand edit to generated files.
- [ ] Race-sensitive path tested.
- [ ] Real user scenario passed.

## Boundary examples to test

Exercise cancelled contexts, dependency timeouts, closed response bodies, transaction rollback,
unknown variants, duplicate requests, goroutine teardown, and the built binary through its real
command or protocol surface.

## On-demand Go recipe catalog

Read the [Go recipe index](go/README.md) when the task needs concrete code. Load only the
leaf matching the change:

| Signal | Recipe |
| --- | --- |
| New service or repository skeleton | [Bootstrap](go/bootstrap.md) |
| Production HTTP routing, middleware, streaming, shutdown | [Backend stack](go/backend-stack.md) |
| Command tree, exit codes, signals, structured output | [CLI stack](go/cobra-stack.md) |
| Terminal UI, cell width, CJK, update loops | [Terminal UI](go/bubbletea-v2.md) |
| Context, goroutines, channels, bounded parallelism | [Concurrency](go/concurrency.md) |
| Transport/domain/storage separation | [Data modeling](go/data-modeling.md) |
| Error wrapping, classification, HTTP mapping | [Error handling](go/error-handling.md) |
| Repository lint policy or a new lint baseline | [Strict linting](go/golangci-strict.md) |
| RPC protocol, streaming, status mapping | [RPC and Connect](go/grpc-connect.md) |
| Dependency selection without replacing the repository stack | [Library choices](go/libraries.md) |
| A bounded maintenance or migration program | [Small programs](go/one-liners.md) |
| Generated queries, transactions, pools, database tests | [SQL generation and PostgreSQL](go/sqlc-pgx.md) |
| Table tests, fakes, HTTP tests, properties, leak checks | [Testing](go/testing.md) |
| Named primitives, constructors, closed variants | [Type patterns](go/type-patterns.md) |

The catalog contains worked examples, not migration authority. Preserve the active module,
router, database layer, package manager, generated-code boundary, and CI contract unless the
request explicitly changes them.
