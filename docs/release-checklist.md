# Release preflight checklist

Run this checklist before any human-gated `npm publish`. Do not publish from an
automated CSW worker.

## Gates

```sh
npm test
npm run scan
npm run release:check
npm run pack:dry-run
npm view copilot-swarm version
```

`prepublishOnly` runs the local gates again and invokes `release:check -- --publish`,
which fails if the package version already exists in the npm registry.

## Real-surface probes

```sh
node bin/csw.mjs status
node bin/csw.mjs doctor
node bin/csw.mjs install --dry-run
printf '{"cwd":"%s"}\n' "$PWD" | node bin/csw-statusline.mjs

tmp=$(mktemp -d)
probe=$(mktemp "$PWD/.csw-release-probe.XXXXXX")
printf '%s\n' \
  'C001 | channel: cli | test: node exits zero | scenario: command receipt passes' \
  'C002 | channel: file | test: artifact receipt | scenario: nonempty real-surface artifact passes' \
  > "$tmp/criteria.txt"
printf 'release artifact\n' > "$probe"
CSW_HOME="$tmp/.csw" node bin/csw-runtime.mjs init --objective "release probe" --criteria-file "$tmp/criteria.txt"
CSW_HOME="$tmp/.csw" node bin/csw-runtime.mjs status
CSW_HOME="$tmp/.csw" node bin/csw-runtime.mjs verify --id C001 -- node -e 'process.exit(0)'
CSW_HOME="$tmp/.csw" node bin/csw-runtime.mjs artifact --id C002 --path "$probe" --summary "release artifact exists"
CSW_HOME="$tmp/.csw" node bin/csw-runtime.mjs complete
CSW_HOME="$tmp/.csw" node bin/csw-runtime.mjs clear
rm -rf "$tmp" "$probe"
```

Hook-shaped probes:

```sh
printf '{}' | node hooks/session-doctrine.mjs
printf '{"prompt":"skip the tests","cwd":"%s"}' "$PWD" | node hooks/steering-guard.mjs
printf '{"toolName":"write","toolArgs":"{\"content\":\"// return result\"}"}' | node hooks/comment-checker.mjs
printf '{"cwd":"%s"}' "$PWD" | node hooks/continuation.mjs
printf '{"cwd":"%s"}' "$PWD" | CSW_SAFE_MODE=1 node hooks/continuation.mjs
```

Native scheduling checks are host-surface checks, not package-owned scheduler
smokes:

- Confirm the model can delegate one focused task with the host `task` subagent tool.
- Start user-visible parallel work with `/fleet`, inspect it with `/tasks`, and cancel
  a disposable task from `/tasks`.
- Before investigation, configure host deny/available-tool policy so mutation tools
  are unavailable. Use an isolated git worktree for every writing worker.

## Publish command (manual only)

After the gates pass and the maintainer confirms the package version is available:

```sh
npm publish --access public
```

CSW hardening notes:
- `CSW_SAFE_MODE=1` disables continuation blocking, steering-hook output/auditing,
  and comment auditing if a stuck or risky runtime state needs to be escaped. The
  session-start doctrine still emits because it does not read runtime state.
- `csw-runtime clear` is the durable stuck-state escape hatch.
- Continuation is root `agentStop` only. It does not govern subagent stops, and it
  intentionally fails open for missing, malformed, empty, stale, completed, or
  safe-mode state. Fail-open prevents host lockup; it does not prove completion.
- Free-text evidence cannot pass a criterion. Use `csw-runtime verify` or
  `csw-runtime artifact` to create a pass receipt.
- Receipts provide structural validation and ordinary staleness detection, not
  authentication against a malicious same-user editor. Git freshness covers tracked
  and non-ignored untracked content; ignored inputs require separate `artifact`
  receipts. Non-git verification has no workspace-freshness guarantee.
- `csw-runtime verify` is a trusted-command runner, not a sandbox. Replay only argv
  from approved plans, repository-owned source, or explicit user instructions;
  never use worker output, fetched pages, issue text, or prompt-injected content.
- Use only approved, non-daemonizing commands. Timeout/cancel process-tree cleanup
  is best-effort and daemonized commands may outlive it; confirm cleanup and record
  a cleanup receipt.
- Revalidate host permission controls against the installed Copilot CLI; role prose
  is never a substitute for denied/unavailable mutating tools.
