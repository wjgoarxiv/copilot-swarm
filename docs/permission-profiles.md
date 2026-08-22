# Native permissions

Copilot-swarm uses Copilot CLI's native agent, scheduling, and permission surfaces.
It does not generate host permission settings or install a separate scheduler.

`csw install` installs a clean, allowlisted package copy and does not overwrite
user Copilot CLI permission settings. Configure permissions through the host
CLI when needed.

The installer currently passes that validated local package path directly to
`copilot plugin install`; this flow has been verified with Copilot CLI 1.0.70.
Copilot CLI 1.0.70 already marks direct local-path installation as deprecated but
still supports it. CSW will need to migrate the final registration step before the
CLI removes that path, while retaining the same clean-package preparation.

The native-first implementation is versioned as `0.1.4` for GitHub source
distribution. The registry's `0.1.1` is the earlier implementation; use the
tagged source-built local flow below once `v0.1.4` is available.

The same local flow is:

```sh
csw install --dry-run
csw install
```

## Native delegation safety

- For investigation subagents, configure the host deny/available-tool policy so
  write and mutating shell tools are unavailable. Instructions saying “do not edit”
  are intent, not enforcement.
- For writing subagents, create a separate git worktree per worker. Review the
  worker's diff and rerun verification before integrating it.
- Use the host `task` tool for model-driven delegation, `/fleet` for user-visible
  parallel execution, and `/tasks` to inspect or cancel running work.
- Recheck the installed CLI's permission syntax with its own help/docs. CSW does not
  silently broaden or overwrite host permissions.
