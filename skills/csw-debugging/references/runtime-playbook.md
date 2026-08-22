# Runtime playbook

## Common first checks

- Resolve the actual executable path and version.
- Record current working directory and relevant environment overrides.
- Confirm the artifact or module being loaded.
- Compare source, built, packed, and installed identities.
- Capture exit status, signal, stderr, and cleanup state.

## Node and JavaScript runtimes

Check runtime version, module mode, package-manager lockfile, entrypoint resolution, export maps,
conditional exports, native addon architecture, and environment flags. Reproduce from a clean
consumer when package behavior is involved. Use protocol or inspector tools only after simpler
version and resolution evidence is exhausted.

Useful observations include resolved module paths, package metadata from the installed artifact,
unhandled rejection or signal behavior, event-loop handles that keep the process alive, and
stdout/stderr separation for protocol tools.

## Python runtimes

Resolve interpreter path, environment, `sys.path`, installed distribution metadata, extension
architecture, and configuration source. Distinguish editable checkout imports from installed
wheels. Capture exception type and causal chain, not only the final message.

For hangs, inspect threads, subprocess ownership, async tasks, blocking native calls, and open
resources. Avoid changing environments during diagnosis without recording the before/after state.

## Go binaries

Record binary identity, build information, target architecture, build tags, configuration source,
signals, goroutine state, and race-sensitive conditions. Use race detection and profiles on a safe
reproduction. Check leaked goroutines, response bodies, tickers, and context cancellation.

## Rust binaries

Record target triple, feature set, profile, compiler version, dynamic library resolution, panic
mode, and backtrace. Distinguish debug/release behavior and feature combinations. For memory or
unsafe concerns, use the strongest repository-supported sanitizer or interpreter and preserve the
exact invocation.

## Native or bundled binaries

Check architecture, code signing where relevant, dynamic libraries, executable permissions,
quarantine, environment inheritance, wrapper scripts, and packaged resource paths. A wrapper
reporting the expected version does not prove the embedded binary is the expected artifact.

## Protocol servers

Capture initialization exchange, negotiated capabilities, framing, stdout purity, stderr logs,
request identifiers, timeouts, and shutdown. A running process is not proof that protocol
initialization completed.

## Browser and UI runtimes

Separate network, console, rendering, state, and accessibility observations. Reproduce at named
viewport, theme, locale, data state, and authentication state. Inspect the actual installed or
deployed surface rather than only source components.

## Package/runtime identity checklist

- [ ] Source commit recorded.
- [ ] Built artifact recorded.
- [ ] Installed path and version recorded.
- [ ] Runtime executable recorded.
- [ ] Configuration origin recorded.
- [ ] Clean-consumer scenario used where applicable.
- [ ] Temporary runtime and files cleaned.

## Startup failures

Separate executable-not-found, permission, loader, configuration parse, dependency initialization,
port binding, protocol initialization, and first-request failures. They may share a final message
but require different evidence. Capture the last completed startup stage.

## Shutdown failures

Check signal handling, cancellation propagation, task joins, buffered output, transaction rollback,
temporary files, child-process trees, and forced timeout behavior. A command returning does not
prove its children or ports were released.

## Environment comparison table

| Dimension | Working | Failing | Proven relevant? |
| --- | --- | --- | --- |
| executable/version | | | |
| architecture/platform | | | |
| artifact/hash | | | |
| configuration origin | | | |
| dependency versions | | | |
| permissions/identity | | | |
| input/state | | | |

## Output corruption

For line- or frame-based protocols, distinguish protocol stdout from diagnostic stderr, inspect
encoding and buffering, and test noisy dependencies. Validate complete frames rather than searching
for one expected substring.

## Resource exhaustion

Record memory, descriptors, handles, connections, goroutines/tasks/threads, queue depth, disk, and
retry counts over time. Reproduce with a bounded workload and verify resources return to baseline.
