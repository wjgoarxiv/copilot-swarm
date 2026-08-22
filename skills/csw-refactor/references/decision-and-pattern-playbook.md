# Refactor decision and pattern playbook

Read this reference after the intent gate and codemap are written. It helps select a
structural move without silently expanding the task into redesign. Each recipe assumes the
current behavior has been characterized and the repository's own verification commands are
known.

## Navigation

- [Choose the move](#choose-the-move)
- [Rename a symbol or path](#rename-a-symbol-or-path)
- [Extract a cohesive unit](#extract-a-cohesive-unit)
- [Move code across modules](#move-code-across-modules)
- [Split a mixed-responsibility module](#split-a-mixed-responsibility-module)
- [Invert a dependency](#invert-a-dependency)
- [Migrate a public contract](#migrate-a-public-contract)
- [Respect generated boundaries](#respect-generated-boundaries)
- [Combine patterns safely](#combine-patterns-safely)
- [Evidence record](#evidence-record)

## Choose the move

Start from the problem observed in the codemap, not from a fashionable pattern.

| Observed structural problem | Prefer | Avoid when | Primary proof |
| --- | --- | --- | --- |
| A name misstates an unchanged concept | Rename | the concept itself is changing | old references absent; behavior equal |
| A block has one coherent policy and stable inputs | Extract | hidden ambient state dominates | caller output and side effects equal |
| A concept lives under the wrong owner | Move | the target introduces a dependency cycle | dependency direction improves |
| One module owns unrelated reasons to change | Split | responsibilities cannot yet be named | each new boundary has a clear owner |
| Policy imports an infrastructure detail | Invert dependency | only one-to-one forwarding is gained | policy tests use the owned contract |
| Consumers need a new public path or shape | Public migration | consumer inventory is unknown | old/new paths satisfy the support plan |
| A derived file needs structural change | Change generator input | owner command is unknown | regenerated output is reproducible |

Ask these questions in order:

1. What single responsibility or dependency problem is visible now?
2. Which observable behavior must remain identical?
3. Is the affected surface private, repository-public, or externally consumed?
4. Which owner is allowed to change each file?
5. Can one reversible checkpoint express the move?
6. What evidence would disprove that the move is behavior-preserving?

If several rows appear necessary, order them by dependency. For example, characterize first,
extract a stable seam second, move the seam third, and migrate public callers last. Do not call
the combined operation “cleanup”; name each structural purpose.

## Rename a symbol or path

Use a rename when identity and behavior stay the same but the current name causes ambiguity,
misuse, or navigation cost.

### Impact map

Record more than language-level references:

- declaration, imports, re-exports, and type positions;
- reflection, dependency injection, registries, and plugin manifests;
- serialized field names, environment keys, command names, and URLs;
- filesystem paths referenced by build, packaging, or deployment metadata;
- examples, fixtures, snapshots, golden files, and user documentation;
- generated declarations or indexes and the command that owns them.

### Ordered procedure

1. Capture the old symbol's definition and reference set.
2. Classify each occurrence as code identity, public string, persisted data, or documentation.
3. Decide which textual occurrences intentionally keep the old spelling.
4. Run a native language-server rename when the server is initialized and the user authorizes
   the resulting workspace edit.
5. Inspect the resulting diff before making manual repairs.
6. Search exact, case-folded, dashed, underscored, and path variants missed by symbol analysis.
7. Regenerate owned artifacts through their repository command.
8. Run focused tests, public-surface checks, and the original scenario.
9. Search again for the old identity and explain every remaining occurrence.

### Worked example

Suppose `loadCfg` becomes `loadConfiguration` while the JSON key `cfg_version` remains stable.
The code symbol, imports, test descriptions, and developer docs may change. The persisted key
must not change merely because its spelling resembles the symbol.

```text
Preserve: persisted JSON key `cfg_version`
Rename: function, imports, internal mocks, API documentation prose
Regenerate: exported declaration index through the package build
Prove: old fixtures still deserialize and the same invalid input returns the same error
```

### Stop conditions

Stop when the old name is also a public protocol value, when generated outputs have no known
owner command, or when symbol results disagree with repository search and the discrepancy cannot
be classified.

## Extract a cohesive unit

Extract when a contiguous behavior has a name, an owned contract, and inputs that can be made
explicit without inventing a general framework.

### Boundary test

A useful extraction answers all of these:

- What policy or transformation does the unit own?
- Which values enter and leave?
- Which state and side effects does it own?
- Which errors cross its boundary?
- Why is the caller clearer after delegation?

If the answer is “it wraps these lines” or “it may be reused someday,” the boundary is not yet
designed.

### Ordered procedure

1. Pin examples for normal, boundary, and failure behavior at the caller's stable surface.
2. Mark reads, writes, thrown errors, emitted events, and cleanup responsibilities in the block.
3. Choose parameters from actual dependencies rather than passing the original container object.
4. Choose a return shape that represents the existing outcome, including absence and failure.
5. Extract without changing branches, ordering, messages, or timing ownership.
6. Keep the caller as the integration point until focused proof passes.
7. Remove duplicated logic only after both paths are compared.
8. Re-read the result: the extracted name should describe policy, not mechanics.

### Worked example

```text
Before: request handler validates fields, chooses retryability, writes the response, and logs.
Extract: classifySubmission(input) -> { kind, normalized, issue }
Keep: response writing and request-scoped logging in the handler.
Preserve: validation order, error codes, and the fact that invalid input is never retried.
```

This extraction separates deterministic classification from transport ownership without creating
an interface for the response object.

### Stop conditions

Stop if the proposed unit requires most of the caller's mutable state, if cleanup ownership becomes
ambiguous, or if extraction changes error timing or side-effect order.

## Move code across modules

A move changes ownership. It is more than a filesystem rename because imports, dependency
direction, initialization order, and distribution contents may change.

### Ordered procedure

1. State why the target module is the correct owner.
2. Map inbound and outbound dependencies for source and target.
3. Check package boundaries, visibility rules, cycles, startup registration, and build inclusion.
4. Add the target path while preserving the source-facing contract when consumers need a staged
   migration.
5. Move one cohesive concept with history-neutral edits; avoid unrelated formatting.
6. Update internal callers by dependency group and verify after each group.
7. Compare initialization order, side effects, public exports, and packaged files.
8. Remove the old path only when the consumer inventory is exhausted.

### Worked example

Moving a cache policy from `adapters/http` to `domain/cache` is valid only if the policy no longer
depends on the HTTP client. Put transport conversion at the adapter edge; do not move transport
types into the domain merely to make imports compile.

### Stop conditions

Stop on a new dependency cycle, a visibility leak, an unexplained startup-order change, or an
external consumer that cannot move within the authorized support window.

## Split a mixed-responsibility module

Split when the codemap reveals independent reasons to change, not merely because a file is long.
Line count can be a navigation signal, but it does not define a responsibility.

### Responsibility card

For each proposed module record:

```markdown
Owner: <policy or lifecycle responsibility>
Inputs: <owned inputs>
Outputs: <owned results or effects>
Must not know: <dependency deliberately kept outside>
Lifecycle: <creation, use, cleanup owner>
Public surface: <private, package, external>
```

### Ordered procedure

1. Cluster symbols by shared invariants, state, and reasons to change.
2. Draw calls and state ownership across clusters.
3. Select a seam that reduces coupling rather than creating mutual imports.
4. Extract the least stateful cluster first.
5. Keep orchestration in one explicit composition root.
6. Verify after each cluster moves.
7. Tighten visibility only after all legitimate callers are known.
8. Delete the former mixed module only after registration and package checks pass.

### Counterexample

Do not split `parser.ts` into `parser-core.ts`, `parser-utils.ts`, and `parser-helpers.ts` when all
three share the same mutable cursor and call each other. The names hide coupling instead of
improving ownership. First make cursor ownership and parse phases explicit.

### Stop conditions

Stop if new modules form a cycle, if state ownership is duplicated, or if the split needs a
generic “context” bag containing the entire old module.

## Invert a dependency

Invert when high-level policy directly depends on a volatile or inaccessible adapter and the
policy can own a meaningful contract.

### Contract design table

| Question | Good signal | Warning |
| --- | --- | --- |
| Who names the interface? | policy consumer | infrastructure library |
| What does it express? | domain outcome | vendor methods one-for-one |
| How are failures modeled? | policy-relevant result | leaked vendor exception graph |
| Who composes it? | explicit composition root | global mutable registry |
| How is it tested? | truthful fake or local adapter | mock call choreography only |

### Ordered procedure

1. Characterize policy behavior with the current adapter.
2. Define the smallest policy-owned operation and failure vocabulary.
3. Adapt the existing implementation without changing its runtime configuration.
4. Wire the adapter at an existing composition root.
5. Test policy against contract behavior, not implementation call order.
6. Run an adapter contract test and the real integration surface.
7. Confirm cancellation, timeout, retry, and cleanup ownership stayed explicit.

### Stop conditions

Stop when the proposed interface merely mirrors a library, when no composition root exists within
scope, or when a fake would conceal behavior that only the real system can establish.

## Migrate a public contract

A public migration is a compatibility project. The refactor is incomplete until the intended
consumer set can use the supported path and the transition has an exit condition.

### Migration shapes

| Shape | Use when | Required evidence |
| --- | --- | --- |
| Additive alias | identity changes, semantics stable | old/new paths behave equally |
| Adapter bridge | shape changes can be translated | round-trip and error mapping |
| Versioned surface | semantics intentionally diverge | explicit consumer routing |
| Coordinated removal | all consumers move together | consumer inventory and rollout proof |

### Ordered procedure

1. Inventory in-repository and known external consumers.
2. State old contract, new contract, support window, owner, and removal gate.
3. Add the new surface without removing the old one when staged migration is required.
4. Test shared semantics through a common conformance suite.
5. Migrate consumers in observable groups.
6. Make deprecation discoverable without changing success behavior.
7. Compare serialization, errors, defaults, and ordering.
8. Remove the bridge only after the named evidence is available.

### Stop conditions

Stop when consumer scope is unknown, a data migration lacks rollback, or “temporary” compatibility
has no owner and removal condition.

## Respect generated boundaries

Treat generated output as evidence of another source, not as an independent editing surface.

### Ownership procedure

1. Identify the marker, manifest, schema, template, or source that owns the output.
2. Locate the repository-owned generation command and its prerequisites.
3. Change the owning source only.
4. Run the generator in the repository's expected environment.
5. Inspect output for deterministic, scoped change.
6. Rerun generation without source changes; expect no further diff.
7. Run consumers that compile, package, load, or compare the generated artifact.

Generated files include more than files labeled “generated”: lock-derived manifests, export
indexes, API clients, schemas, snapshots, compiled assets, and package metadata may all have an
owner command.

### Stop conditions

Stop when ownership is unclear, regeneration requires unavailable credentials, the command
rewrites unrelated artifacts, or the second run is not stable.

## Combine patterns safely

When a refactor needs multiple patterns, serialize by evidence dependency:

1. characterize the old behavior;
2. rename only if a clearer identity is needed for the next boundary;
3. extract deterministic policy;
4. invert the adapter dependency;
5. move the newly independent unit;
6. migrate public callers;
7. regenerate owned artifacts;
8. compare the real surface.

Run the checkpoint loop after every numbered move. A later green test cannot explain which earlier
step introduced a hidden behavior change.

## Evidence record

Use one record per checkpoint:

```markdown
### Checkpoint: <structural purpose>
- Pattern: rename | extract | move | split | invert | migrate | regenerate
- Preserved contract: <observable behavior>
- Impact zones: <direct, contract, caller, runtime, distribution, docs>
- Files changed: <paths>
- Diagnostics: <command or native operation and result>
- Focused proof: <command and result>
- Adjacent proof: <command and result>
- Real surface: <scenario and before/after result>
- Diff review: <unexpected change checked>
- Remaining callers or bridge: <none or explicit list>
- Recovery point: <last known-good checkpoint>
```

Evidence is incomplete when it says only “tests pass.” It should connect the structural purpose to
the preserved contract, the affected surfaces, and the observed result.
