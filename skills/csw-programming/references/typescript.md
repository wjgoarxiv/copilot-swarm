# TypeScript

## Repository gate

Inspect `package.json`, the active lockfile, runtime, module mode, `tsconfig` hierarchy,
formatter, linter, test runner, and bundler. Use the repository's package manager and do not
rewrite lockfiles with another tool.

## Types and parsing

- Keep `strict` behavior and additional project flags intact.
- Parse network, storage, environment, and user values with the existing schema boundary.
- Prefer discriminated unions for state machines and exhaustive `switch` handling.
- Use `satisfies` to check shapes without widening values.
- Avoid `any`, non-null assertions, broad casts, and ignore directives.
- Use branded primitives only where semantic mixing is a demonstrated risk.

## Errors and cancellation

- Narrow caught values before use.
- Translate failures into typed domain errors at layer boundaries.
- Preserve `cause` when wrapping.
- Accept and propagate `AbortSignal` for cancellable operations.
- Give timers, listeners, streams, workers, and clients deterministic disposal.

## Browser and server boundaries

- Keep browser-only and server-only modules separated.
- Do not expose secrets in client bundles or serialized loader data.
- Escape or sanitize content at the correct rendering boundary.
- Bound request bodies, uploads, redirects, retries, and concurrency.
- Verify accessibility and hydration behavior for visible changes.

## Tests

Prefer real values and local protocol servers. Use DOM queries based on role and name, not
implementation selectors. Assert observable state and accessibility. For packages, test the
packed artifact from a clean consumer rather than importing the workspace directly.

## Verification command selection

Use repository scripts for focused tests, type checking, lint, format checking, build, and
package smoke. If a script combines mutations with checks, use its documented check-only mode
for review evidence.

## Review checklist

- [ ] No new `any` or unchecked cast.
- [ ] Union variants are exhaustive.
- [ ] External data is parsed before domain use.
- [ ] Abort and timeout paths are explicit.
- [ ] Listeners and timers are removed.
- [ ] Browser/server boundaries are respected.
- [ ] Packed or built output was exercised when distribution changed.
- [ ] Real user scenario passed.

## Boundary examples to test

Exercise schema rejection, unknown union variants, aborted requests, stream or listener cleanup,
server/client module separation, long and CJK content for visible surfaces, and a clean packed
consumer when exports change.

## On-demand TypeScript recipe catalog

Read the [TypeScript recipe index](typescript/README.md), then load only the leaf required by
the repository's existing stack:

| Signal | Recipe |
| --- | --- |
| Existing Hono service or an approved new service | [Backend stack](typescript/backend-hono.md) |
| New project explicitly requested | [Bootstrap](typescript/bootstrap.md) |
| Schema boundary, tagged union, immutable domain value | [Data modeling](typescript/data-modeling.md) |
| Result values, error causes, abort propagation | [Error handling](typescript/error-handling.md) |
| Tightening an existing compiler configuration | [Strict compiler configuration](typescript/tsconfig-strict.md) |
| Branded values, `satisfies`, narrowing, exhaustiveness | [Type patterns](typescript/type-patterns.md) |

Commands using a particular JavaScript runtime or package manager are examples only. Use the
lockfile and scripts already present in the repository. A package-manager migration is a separate
product change and requires explicit scope, compatibility proof, and clean-consumer verification.
