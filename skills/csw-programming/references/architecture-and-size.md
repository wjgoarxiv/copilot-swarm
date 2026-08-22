# Architecture and size

## Responsibility test

A module is cohesive when its responsibility can be stated as one short noun phrase and
its reasons to change come from the same owner or domain rule. Size is a signal, not the
definition: a 70-line module can mix concerns, while a 300-line generated table can be one
responsibility.

## Pure LOC review trigger

Pure LOC excludes blank lines and comments. Use the repository's counter when one exists;
otherwise a language-aware counter is preferable to a simple line filter.

| Pure LOC | Review action |
| ---: | --- |
| 0–200 | confirm normal cohesion |
| 201–250 | identify the next likely growth point |
| over 250 | build a split proposal or document why indivisible |

This threshold does not authorize unrelated refactoring. If the user's requested change is
small and the oversized module is outside the touched responsibility, report the risk and
keep scope bounded.

## Split by concept

Good split dimensions include:

- boundary parsing versus domain decisions;
- persistence adapter versus orchestration;
- protocol types versus transport;
- rendering versus interaction state;
- command parsing versus command execution;
- lifecycle ownership versus pure computation.

Bad split dimensions include file halves, alphabetical function groups, `part1`, `helpers`,
and a shared bucket with no owner.

## Dependency direction

Prefer stable domain concepts at the center and volatile adapters at the edge. A pure unit
must not import the CLI, database driver, UI framework, or environment reader merely for
convenience. Pass typed values or small interfaces across the boundary.

## Public surface

Before moving a symbol, record:

- current import paths and callers;
- supported aliases or deprecation window;
- serialization and persisted-state implications;
- reflection, registration, or plugin discovery;
- generated-code ownership;
- tests that pin the public behavior.

## Re-export files

An index or barrel may declare the supported public surface. It should not contain hidden
logic, initialization side effects, dependency construction, or environment reads.

## One-off abstractions

Do not extract merely because code is three lines long. Extract when at least one holds:

- the operation has a domain name that improves the caller;
- the operation is independently reusable now;
- isolation enables a meaningful pure test;
- lifecycle or trust-boundary ownership becomes clearer;
- the existing function has more than one reason to change.

## Architecture review checklist

- [ ] One responsibility per changed module.
- [ ] Dependency direction points inward toward stable concepts.
- [ ] Untrusted data is parsed before domain logic.
- [ ] Side effects have explicit owners.
- [ ] Public import and data contracts remain deliberate.
- [ ] Generated files are not hand-edited.
- [ ] No numbered fragments or generic dumping grounds.
- [ ] Tests follow the moved behavior rather than implementation location.
- [ ] Real user scenario is unchanged or intentionally updated.

## Verification

After a split, run symbol/reference diagnostics when available, focused tests for each moved
concept, the adjacent regression suite, static checks, and the real user scenario. Compare
before/after public exports and inspect the final diff for accidental formatting churn.

## Architecture decision note

For a non-obvious boundary, record:

- problem and current cost;
- chosen ownership boundary;
- alternatives rejected and why;
- dependency direction;
- public contract and migration impact;
- tests and real scenario;
- conditions that would justify revisiting the decision.

Keep this note close to existing repository architecture documentation. Do not create a new
decision system when the project already has one.

## Warning signs after a split

- both modules import each other;
- most functions moved but state ownership did not;
- a generic context object crosses every boundary;
- the new interface mirrors a dependency one-for-one;
- tests require more mocking than before;
- public imports multiply without a supported use case;
- initialization order becomes implicit.
