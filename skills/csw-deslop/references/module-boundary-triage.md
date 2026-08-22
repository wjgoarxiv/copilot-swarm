# Module-boundary triage

Do not split, merge, move, or inline code to satisfy size aesthetics. A useful boundary assigns a
cohesive responsibility, protects a contract, and keeps dependencies flowing in an understandable
direction. Treat public moves as refactors, not mechanical cleanup.

## Contents

- [Responsibility map](#responsibility-map)
- [Boundary evidence](#boundary-evidence)
- [Inline or preserve a wrapper](#inline-or-preserve-a-wrapper)
- [Split or preserve a module](#split-or-preserve-a-module)
- [Generic bucket triage](#generic-bucket-triage)
- [Dependency direction](#dependency-direction)
- [Migration safety](#migration-safety)
- [Boundary decision record](#boundary-decision-record)

## Responsibility map

Map code to responsibilities before moving it:

| Responsibility | Evidence to inspect | Typical owner |
| --- | --- | --- |
| Input adaptation | protocols, parsers, schemas, CLI/HTTP/UI boundary | adapter or interface layer |
| Trust validation | authentication, authorization, untrusted data, limits | boundary that first trusts input |
| Domain policy | invariants, decisions, state transitions | domain component |
| Orchestration | operation sequence, cancellation, transactions | use-case or application component |
| Persistence | queries, serialization, migrations, storage errors | repository or storage adapter |
| Integration | remote protocol, retries, timeouts, translation | integration adapter |
| Presentation | formatting, view state, accessibility, rendering | presentation component |
| Resource lifecycle | creation, ownership, shutdown, partial cleanup | component that owns the resource |

For each symbol, identify its reason to change and consumers. Symbols that change for unrelated
reasons may deserve separation; symbols that collaborate on one invariant may belong together
even when the file is long.

## Boundary evidence

Collect:

- static imports and exports;
- dynamic registration, reflection, configuration, and generated references;
- tests and fixtures that consume the boundary;
- package manifests and public entry points;
- runtime call paths for the real scenario;
- ownership of errors, retries, transactions, and cleanup;
- repository history when it clarifies a compatibility seam.

Search results are evidence, not proof of absence. Public or dynamically loaded surfaces require
package, documentation, configuration, and runtime checks.

## Inline or preserve a wrapper

Inline a wrapper only when all are true:

- it has one current responsibility and adds no owned contract;
- it performs no validation, normalization, authorization, translation, instrumentation, retry,
  timeout, caching, or resource management;
- it is not a stable public import or dependency-injection seam;
- direct dependency use does not leak infrastructure policy upward;
- callers become clearer rather than more coupled;
- behavior-lock evidence covers success and failure.

Preserve or strengthen the wrapper when it owns a policy boundary, even if the body is one call.
The amount of code inside a boundary does not measure the value of the boundary.

## Split or preserve a module

Consider a split when multiple independent responsibilities have distinct consumers, dependencies,
tests, or change cadence. Choose a conceptual seam such as parsing versus policy, orchestration
versus persistence, or protocol translation versus domain behavior.

Preserve the module when:

- the apparent sections implement one invariant;
- splitting creates cyclic or bidirectional dependencies;
- private state would need to become public;
- callers would coordinate steps the module currently keeps atomic;
- the change is motivated only by line count;
- generated or framework conventions own the layout.

A split should reduce knowledge between components, not merely distribute text among files.

## Generic bucket triage

For a `utils`, `helpers`, `common`, or `shared` bucket:

1. Inventory symbols and consumers.
2. Group by product concept and reason to change.
3. Identify truly general primitives with stable semantics.
4. Move only one cohesive group at a time.
5. Put domain behavior beside its domain owner.
6. Keep boundary adapters beside the boundary they adapt.
7. Avoid replacing one bucket with several vague buckets.
8. Preserve compatibility exports only when supported consumers require them.

Do not move a symbol merely because another file has a similar name. Ownership follows contract
and change responsibility, not lexical resemblance.

## Dependency direction

Draw the relevant edges before and after:

```text
entry/adapters -> orchestration -> domain policy
entry/adapters -> integration or persistence implementations
orchestration -> owned interfaces <- implementations
```

Repository architecture may differ; infer its actual direction from instructions and neighboring
code. Reject a cleanup that makes domain policy import presentation, transport, filesystem, or
concrete remote clients without an explicit architectural decision.

Watch for hidden direction changes through callbacks, global registries, environment reads,
service locators, and type-only imports that become runtime imports. Run cycle checks or builds
already owned by the repository.

## Migration safety

Moving a private symbol still requires caller updates, tests, and generated artifact checks. For a
public symbol, additionally decide:

- whether the old import remains supported;
- whether a compatibility re-export is required;
- whether identity, module initialization, or side effects change;
- whether serialization or reflection names change;
- whether documentation and examples are part of the supported contract;
- whether removal needs a deprecation window.

Do not invent a deprecation policy during cleanup. Follow repository policy or escalate. Separate
mechanical moves from behavior changes so failures are attributable.

## Boundary decision record

```text
Bound scope:
Symbols and current consumers:
Current responsibilities:
Proposed owner and reason to change:
Current dependency edges:
Proposed dependency edges:
Public/dynamic/generated surfaces checked:
Error, transaction, cancellation, and cleanup owner:
Compatibility plan:
Focused validation:
Real scenario:
Decision: INLINE | PRESERVE | SPLIT | MOVE | ESCALATE
Remaining risk:
```

Choose `ESCALATE` when callers, public contracts, migrations, or dependency direction change beyond
the authorized cleanup. Route that slice through a refactor workflow with explicit acceptance
criteria.
