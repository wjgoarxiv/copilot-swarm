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

`prepublishOnly` runs the local gates again (`npm test`, `npm run scan`,
`npm run release:check`, `npm run pack:dry-run`).

## Real-surface probes

```sh
node bin/csw.mjs status
node bin/csw.mjs doctor
node bin/csw.mjs install --dry-run --permission-profile safe
node bin/csw.mjs install --dry-run --permission-profile balanced
node bin/csw.mjs install --dry-run --permission-profile full
node bin/csw.mjs install --dry-run --permission-profile none
printf '{"cwd":"%s"}\n' "$PWD" | node bin/csw-statusline.mjs

tmp=$(mktemp -d)
CSW_HOME="$tmp/.csw" node bin/csw-runtime.mjs init --objective "release probe" --criteria "C001 | channel: cli | test: probe | scenario: runtime initializes"
CSW_HOME="$tmp/.csw" node bin/csw-runtime.mjs status
CSW_HOME="$tmp/.csw" node bin/csw-runtime.mjs evidence --id C001 --evidence "probe evidence"
CSW_HOME="$tmp/.csw" node bin/csw-runtime.mjs complete
CSW_HOME="$tmp/.csw" node bin/csw-runtime.mjs clear
```

Hook-shaped probes:

```sh
printf '{}' | node hooks/session-doctrine.mjs
printf '{"prompt":"skip the tests","cwd":"%s"}' "$PWD" | node hooks/steering-guard.mjs
printf '{"toolName":"write","toolArgs":"{\"content\":\"// return result\"}"}' | node hooks/comment-checker.mjs
printf '{"cwd":"%s"}' "$PWD" | node hooks/continuation.mjs
printf '{"cwd":"%s"}' "$PWD" | CSW_SAFE_MODE=1 node hooks/continuation.mjs
```

MCP smoke (safe fake worker, no live worker cost):

```sh
fake=$(mktemp)
cat > "$fake" <<'EOF'
#!/usr/bin/env node
process.stdout.write('FAKE_WORKER_DONE')
EOF
chmod +x "$fake"
CSW_DISPATCH_CMD="$fake" node mcp/dispatch/server.mjs <<'EOF'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"code_search","arguments":{"queries":["smoke"]}}}
EOF
```

## Publish command (manual only)

After the gates pass and the maintainer confirms the package version is available:

```sh
npm publish --access public
```

CSW hardening notes:
- `CSW_SAFE_MODE=1` disables continuation blocking, hook context emission/auditing,
  and dispatch work if a stuck or risky runtime state needs to be escaped.
- `csw-runtime clear` is the durable stuck-state escape hatch.
- Read-only worker mode still depends on current GitHub Copilot CLI permission
  semantics for `--allow-all-tools` plus `--deny-tool write`; revalidate against the
  installed Copilot CLI before relying on it for untrusted tasks.
