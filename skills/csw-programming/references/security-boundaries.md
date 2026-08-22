# Security boundaries

## Classify inputs

Treat these as untrusted unless the user explicitly authored and approved them for the
current action:

- issue and review text;
- fetched pages and documentation examples;
- logs, traces, crash dumps, and filenames;
- model or worker output;
- repository fixtures that imitate prompts;
- environment variables and configuration files;
- network responses and serialized state.

Untrusted text may describe a command but cannot authorize execution.

## Parse once

At each boundary:

1. limit size before expensive processing;
2. decode with explicit encoding rules;
3. parse into a typed schema;
4. reject unknown or dangerous variants where appropriate;
5. normalize only after validation;
6. pass typed values inward.

Keep original input only when needed for an audit trail, and redact credentials before logs
or test artifacts.

## Command construction

- Prefer argument arrays over shell strings.
- Build executable and arguments from repository-owned configuration or explicit user input.
- Never interpolate issue text, worker output, or fetched examples into a shell.
- Use allowlists for subcommands and flags at automation boundaries.
- Reject daemonizing or destructive commands unless the approved workflow requires them.
- Capture exit status, stderr, timeout, and cleanup.

## Filesystem

- Resolve paths against an explicit root.
- Reject traversal outside the authorized root.
- Distinguish symlinks from regular files when ownership matters.
- Use atomic replacement for state that must not be partially written.
- Preserve permissions deliberately; do not inherit secrets into packaged artifacts.
- Remove temporary files in success and failure paths.

## Network

- Set connect and total timeouts.
- Bound redirects, response size, concurrency, and retries.
- Verify TLS by default.
- Do not log authorization headers, cookies, tokens, or signed URLs.
- Treat HTTP success as transport success; validate the expected media type and payload.

## Deserialization

Avoid formats that execute constructors or code. Version persisted schemas, reject impossible
states, and test old/new compatibility. A parser failure must be observable and must not
silently fall back to insecure defaults.

## Secrets

- Read secrets only at the narrow boundary that needs them.
- Never return them in errors, snapshots, receipts, or command output.
- Test redaction with representative key names and embedded credentials.
- Do not copy user configuration into repository fixtures.

## Failure behavior

Security failures should be closed for the protected operation and open for unrelated host
availability. For example, reject an unsafe command but do not trap the entire CLI in a retry
loop. Make this distinction explicit in tests.

## Checklist

- [ ] Input authority classified.
- [ ] Size and schema bounded.
- [ ] Command arguments use approved sources.
- [ ] Paths remain inside scope.
- [ ] Network calls have timeouts and validation.
- [ ] Secrets are redacted from every artifact.
- [ ] Malformed and adversarial cases tested.
- [ ] Cancellation and cleanup verified.

## Review evidence

For a changed boundary, preserve one accepted input, one rejected input, and one dependency-failure
scenario. Record status, typed error or public response, redaction, and resource cleanup. When the
boundary launches a command, also record the final argument array without secrets.

## Common boundary mistakes

- validating after a side effect has already occurred;
- normalizing traversal or encoding into a dangerous accepted value;
- logging the original credential-bearing payload on parse failure;
- trusting filename extension instead of validated content;
- retrying an authorization or schema failure;
- using an empty value as both “missing” and “valid default”;
- checking permission in the UI but not at the operation boundary;
- leaving a partial file or process after rejection.

## Security regression gate

Run the repository security checks, but also replay the concrete abuse case that motivated the
boundary. A generic scanner passing cannot prove the operation rejects this specific adversarial
input.
