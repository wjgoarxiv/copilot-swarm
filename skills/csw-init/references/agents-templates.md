# AGENTS templates

Use only sections supported by repository evidence. Delete empty or generic sections.

## Root template

```markdown
# Repository guidance

## Overview
One paragraph: product/library purpose and repository boundary.

## Structure
- `path/` — owned responsibility and important boundary.

## Where to look
| Task | Start here | Related surface | Verification |
| --- | --- | --- | --- |

## Commands
| Purpose | Command | Working directory | Notes/effects |
| --- | --- | --- | --- |

## Conventions
- Repository-specific, evidenced rules only.

## Safety and ownership
- Generated/vendor/nested-repo/external-state boundaries.

## Verification
- Minimum focused, regression, and real-surface expectations.

## Known anti-patterns
- Concrete mistakes specific to this repository.

## Nested guidance
- List child `AGENTS.md` scopes and what differs.
```

## Child template

```markdown
# Local guidance for `<path>`

Inherits root guidance. This file contains only local differences.

## Responsibility and entry points
- Local ownership, public surface, and start files.

## Local commands
| Purpose | Command | Notes/effects |
| --- | --- | --- |

## Local conventions and vocabulary
- Stable local patterns and domain terms.

## Local safety and generated boundaries
- Rules that differ from or narrow the root.

## Verification
- Tests and real scenario specific to this subtree.

## Local anti-patterns
- Concrete mistakes unique to this subtree.
```

## Generated-boundary template

```markdown
# Generated content boundary

Do not edit generated files in this directory directly.

- Source of truth: `<path>`
- Generator command: `<verified command>`
- Required verification: `<check>`
- Tracked output policy: `<policy>`
```

## Command table rules

- Commands are copied from owned manifests/scripts, not memory.
- Working directory is explicit when not repository root.
- Mutation, network, credential, or external-state effects are disclosed.
- Publish/deploy commands may be documented but are not run without approval.
- Unverified commands are labeled and should be resolved before completion.

## Content quality test

Remove a sentence if it is generic enough to paste into any repository. Replace raw directory
listing with task-oriented navigation. Replace “run tests” with the verified command and scope.

## Deduplication worksheet

| Instruction | Root owner | Child delta | Keep where | Reason |
| --- | --- | --- | --- | --- |
| | | | | |

## Final review

- [ ] Root overview names real boundary.
- [ ] Structure maps responsibilities, not every file.
- [ ] Where-to-look rows cover common tasks.
- [ ] Commands are verified and effect-labeled.
- [ ] Conventions are evidenced.
- [ ] Child files contain only local delta.
- [ ] Generated and nested-repo boundaries are explicit.
- [ ] No secrets, personal paths, branch state, or ticket state.
- [ ] No duplicated parent prose.
