# Codemap template

## Target

- Requested structural outcome:
- Preserved behavior:
- Allowed contract changes:
- Scope:
- Non-goals:
- Real scenario:

## Direct files and symbols

| Path | Symbol or responsibility | Planned structural change | Owner |
| --- | --- | --- | --- |
| | | | |

## Caller map

| Caller | Call/import/registration mechanism | Contract used | Migration checkpoint |
| --- | --- | --- | --- |
| | | | |

Include static imports, dynamic imports, reflection, registration tables, configuration strings,
templates, tests, scripts, docs, examples, and generated consumers.

## Dependency graph

Describe edges as `source → dependency : reason`. Mark:

- desired direction;
- current cycle or inversion;
- side-effecting boundaries;
- construction and lifecycle ownership;
- external adapters.

## Data flow

Record input authority, parse boundary, typed representation, transformations, persistence,
serialization, and output. Identify any stage where moving code could change order, defaults,
errors, or cleanup.

## Impact zones

### Direct

Definitions and files being moved or split.

### Contract

Public imports, functions, types, schemas, config keys, error variants, and serialized fields.

### Caller

Consumers grouped by migration order and compatibility needs.

### Runtime

Startup order, registration, background work, caching, resource ownership, and shutdown.

### Distribution

Build inputs, package allowlists, generated artifacts, installer behavior, and clean consumers.

### Documentation

Commands, paths, architecture diagrams, examples, and migration notes.

## Test map

| Preserved contract | Existing evidence | Missing characterization | Command |
| --- | --- | --- | --- |
| | | | |

Include happy, boundary, failure, and real-surface evidence.

## Constraints

- Generated or vendor boundaries:
- Platform variants:
- Compatibility window:
- Performance budgets:
- Security invariants:
- Dirty-work overlap:
- Authority limits:

## Checkpoints

| ID | One structural purpose | Affected zones | Verification | Rollback |
| --- | --- | --- | --- | --- |
| R1 | | | | |

## Completion audit

- [ ] Every direct symbol mapped.
- [ ] Every caller accounted for.
- [ ] Dynamic and string-based consumers searched.
- [ ] Test gaps pinned before movement.
- [ ] Runtime and distribution paths included.
- [ ] Checkpoints are independently reversible.
- [ ] Real scenario selected.

## Search completeness

Use more than one discovery mode when the contract can be referenced indirectly:

- symbol references for typed callers;
- text search for config, docs, templates, and serialization keys;
- manifest and build inspection for registration;
- generated-source ownership;
- package/export inspection;
- runtime discovery probe.

Record negative searches with their scope. An empty language-server result is only meaningful when
the server initialized for the correct root and language.

## Side-effect inventory

List module import effects, singleton construction, caches, background tasks, environment reads,
signal handlers, files, sockets, database transactions, and telemetry. Moving a definition can
change when these effects occur even when function bodies are identical.
