# Native binary diagnosis

Use this reference only for a binary the user owns or is authorized to inspect. Begin with
non-mutating identification and runtime observation. Debugger attachment, process inspection,
traffic interception, decompilation, or copying embedded material may require additional
authorization. Never disable platform security, change a system trust store or proxy, or patch a
binary merely because an example technique exists.

For binaries where you don't have trustworthy source: stripped production builds, third-party closed libs, malware, CTF challenges, firmware, vendored libs whose docs lie. The workflow is specific; doing it out of order wastes days.

This reference **coordinates** the triage and dynamic work. The heavy tools each have their own reference:
- **Static decompilation** → [tools/ghidra.md](../tools/ghidra.md)
- **Interactive debugging** → [tools/pwndbg.md](../tools/pwndbg.md)
- **Scripted interaction / reproduction** → use the repository's existing test harness or the smallest approved local driver

Read those before using them — especially Ghidra, which has a surprising amount of workflow that's not obvious.

---

## ⚠️ STOP — is this actually a stripped C/C++ binary?

A growing share of "binaries" are actually **bundled high-level apps** — Bun SEA, Node SEA, Deno compile, pkg, nexe, Electron, Tauri, PyInstaller. Their workflow is completely different: the high-level source is recoverable with the right per-bundler tool (often plaintext, sometimes V8 cache / `.pyc` / eszip needing extra tooling), and Ghidra against the runtime VM wastes hours.

Quick check:

```bash
file ./target                                                    # Mach-O / ELF / PE - inconclusive
du -h ./target                                                   # 50 MB+ for a "simple CLI" → suspect bundled
strings -n 12 ./target | rg -iE 'bun|node_modules|webpack|esbuild|deno|pkg/lib|electron|pyinstaller|nexe|NODE_SEA_FUSE|tauri' | head -5
```

**If any hits** → close this file, open [bundled-app-binary.md](bundled-app-binary.md) instead. Following the Ghidra/pwndbg path on a bundled-app binary wastes hours decompiling the runtime VM while the app-level bundle is recoverable with the right per-bundler tool (plaintext for Bun/pkg/nexe/Electron-asar; eszip / V8-cache / `.pyc` for Deno / Node SEA / PyInstaller).

If `file` says "Mach-O" or "ELF", `du` is < 20 MB, and the strings check is empty → continue here.

---

## The workflow (do these in order)

Every step's output is input to the next. Skipping steps means guessing later.

```
  [1] Triage           →  what kind of binary is this?
  [2] Dynamic tracing  →  what syscalls / libcalls does it make?
  [3] Static analysis  →  what does it DO, in readable form? (Ghidra)
  [4] Dynamic debug    →  confirm hypotheses at runtime (pwndbg)
  [5] Scripted repro   →  lock the bug with a repository-owned driver
  [6] TDD + fix / report
```

Steps 1 and 2 are fast (minutes). Step 3 is slow (tens of minutes to hours depending on size). Don't skip 1-2 and go straight to Ghidra — the triage output tells you what to focus on inside Ghidra.

---

## [1] Triage — 5-minute fingerprint

```bash
# Basic identity
file ./target
#   elf, mach-o, pe? 32/64-bit? dynamically linked? stripped?

# Architecture details
readelf -h ./target                    # ELF header: entry point, arch, type
lipo -info ./target 2>/dev/null        # macOS: universal binary?

# Interesting strings (often leaks function names, error messages, URLs, API keys)
strings -n 8 ./target | head -100
strings -n 8 ./target | grep -iE '(http|/api/|error|debug|version)'

# Imported symbols (what does it link against?)
nm -D ./target 2>/dev/null              # dynamic symbols
objdump -T ./target 2>/dev/null         # same, alternate tool
readelf -d ./target                     # dynamic section (NEEDED libs)
ldd ./target 2>/dev/null                # resolved library paths

# Security posture (affects what exploits / bugs are possible)
checksec --file=./target                # only when already available in the approved environment
#   NX, PIE, RELRO, stack canary, FORTIFY

# Is it stripped?
nm ./target 2>/dev/null | head          # empty? stripped. full? not stripped.
file ./target                           # will say "stripped" or "not stripped"
```

### ⚠️ `strings -n N` silently drops short content

`strings` prints runs of printable characters of length **≥ N**. With `-n 8`, **anything shorter than 8 chars sandwiched between non-printable bytes is dropped silently**. This includes:

- Short identifier interpolations in templates (`${x}`, `${i}`, `${R}`)
- Short embedded constants (`v3`, `null`, integer immediates as bytes)
- Short error codes between binary padding

Real example: a JavaScript template literal `<INSTRUCTIONS>\n${x}\n</INSTRUCTIONS>` came out of `strings -n 8` as `<INSTRUCTIONS>\n</INSTRUCTIONS>` — the `${x}` (4 chars) was dropped. A consumer reading the dump would conclude the template was empty. It is not.

**Use `strings` only for fingerprinting (Phase 1).** For any extraction whose correctness matters, **read bytes directly**:

```bash
# Count occurrences of a needle
LC_ALL=C grep -aoc 'NEEDLE' ./target

# Find offsets
LC_ALL=C grep -aob 'NEEDLE' ./target | head

# Or via Python for byte-precise context
python3 -c "
import sys
data = open('./target','rb').read()
needle = b'NEEDLE'
pos = data.find(needle)
print(repr(data[max(0,pos-100):pos+200]))
"
```

If you must keep using `strings`, lower the threshold: `strings -n 1 -t x ./target | rg ...`. The signal-to-noise drops sharply but short content is preserved.

Write the triage summary to the journal:

```markdown
## Binary triage
- Type: <ELF 64-bit, dynamically linked, stripped>
- Arch: <x86_64 | arm64 | ...>
- Libs: <libc, openssl, libcurl>
- Security: <NX, PIE, Partial RELRO, no canary>
- Interesting strings: <short list>
- First hypothesis surface: <which function / area looks most relevant>
```

---

## [2] Dynamic tracing — what does it actually call?

These are cheap — run them before Ghidra to orient yourself.

### Linux: strace + ltrace

```bash
# System calls
strace -f -o trace.out ./target arg1 arg2
strace -f -e trace=network ./target           # filter to network syscalls
strace -f -e trace=file ./target              # filter to file ops

# Library calls (less useful when stripped but still informative)
ltrace -f -o ltrace.out ./target
ltrace -f -e 'str*+mem*' ./target             # filter to string/mem functions
```

### macOS: Mach-O specifics

**SIP block reality check.** With System Integrity Protection enabled (default on every modern macOS), `dtruss` / `dtrace` will **silently fail** to attach to:
- Anything in `/usr`, `/bin`, `/sbin`, `/System`
- Apple-signed binaries (Xcode CLT, Homebrew formulae from Apple-distributed taps)
- Notarized vendor binaries (Bun, Deno, Docker Desktop, etc.)

`dtruss ./target` will appear to run but produce zero events. This is not a bug; it is the SIP design. Disabling SIP requires a Recovery Mode reboot — usually not worth it. Use the alternatives below.

```bash
# dtruss — works only when SIP allows it (your own unsigned binaries)
sudo dtruss -f ./target 2>&1 | head -20         # equivalent to strace
# If output is suspiciously empty → SIP blocked it. Switch to lldb or app-level logging.
```

**Mach-O metadata inspection (no SIP issues, no debugger needed):**

```bash
# Architecture and slices
file ./target                                    # arm64 / x86_64 / universal
lipo -info ./target                              # which architectures included
lipo -thin arm64 ./target -output ./target-arm64 # extract one slice for analysis

# Headers & load commands (segments, dylibs, code-signature pointer)
otool -h ./target                                # Mach header (cputype, ncmds, flags)
otool -l ./target | head -100                    # load commands; entitlements live in code-signature blob, see codesign below

# Dynamic library dependencies (macOS equivalent of ldd)
otool -L ./target                                # linked dylibs with versions
dyld_info ./target                               # macOS 13+, more detailed than otool -L

# Disassembly
otool -tv ./target | head -200                   # quick disassembly without Ghidra
otool -tV ./target                               # with symbol-resolved branches

# Imported / exported symbols (Apple `nm`, NOT GNU)
nm -u ./target                                   # undefined references = imports
nm -gU ./target                                  # external defined = exports
# Note: GNU `-D`/dynamic flags are not honored on Apple `nm`; use the above forms.
symbols -fullSourcePath -onlyWithDebugInfo ./target  # if any debug info survives

# Code signature & entitlements (entitlements come from codesign, NOT otool)
codesign -dv --entitlements :- ./target 2>&1     # signature info + entitlements XML on stdout
spctl --assess --type execute -vv ./target       # Gatekeeper assessment

# Cert chain — extract to a temp dir to avoid creating files named -0/-1 in cwd
tmp=$(mktemp -d)
codesign -dvv --extract-certificates="$tmp/cert" ./target 2>&1
ls -la "$tmp"
# Remove only the exact session-owned path recorded in the artifact ledger after inspection.

# Strings inside specific segments only (less noise than full-binary strings)
otool -s __TEXT __cstring ./target               # C string section
otool -s __TEXT __const ./target                 # constants section
```

**Interactive debugging on macOS — use `lldb`, not `gdb`.**

GDB on macOS requires a self-signed code-signing certificate (`codesign --entitlements gdb.entitlements --sign gdb-cert /opt/homebrew/bin/gdb`) and even then is unreliable on arm64. **Use `lldb` directly** — it ships with Xcode CLT and works without configuration.

```bash
# Start lldb
lldb ./target

# Set arguments
(lldb) settings set target.run-args arg1 arg2

# Run with breakpoints
(lldb) breakpoint set --name function_name        # symbol-based
(lldb) breakpoint set --address 0x1000034c0       # address-based
(lldb) breakpoint set --regex '.*decode.*'         # regex over symbols

# Run / step / inspect
(lldb) run
(lldb) bt                                          # backtrace
(lldb) frame variable                              # locals
(lldb) register read                               # all registers
(lldb) memory read --size 8 --format x --count 16 $sp   # 16 qwords from stack
(lldb) disassemble --frame                         # current function
(lldb) image list                                  # loaded modules
(lldb) image lookup -a 0x1000034c0                 # which module + symbol owns this address

# Process attach to running process
(lldb) process attach --pid 12345
(lldb) process attach --name target               # attach by name

# Print Mach-O specific
(lldb) image dump sections ./target
(lldb) image dump symtab ./target
```

**Platform restriction diagnosis:** do not inject libraries or weaken signing policy. You may inspect
the target's existing signing and entitlement metadata to explain why an approved debugger or
instrumentation path is unavailable:

```bash
# Restrict segment present?
otool -l ./target | grep -A2 __RESTRICT
# Hardened runtime flag?
codesign -d --verbose=4 ./target 2>&1 | grep -iE 'flags=|CodeDirectory'
# Existing entitlements, read only
codesign -d --entitlements :- ./target 2>&1
```

**App-level debug logging:**

When debugger attach is blocked, fall back to maximizing the app's own logging:

```bash
# Try common patterns
APP_DEBUG=1 APP_LOG_LEVEL=debug APP_LOG_FILE=/tmp/trace.log ./target
NSDebugEnabled=YES ./target                       # Cocoa apps
OS_ACTIVITY_MODE=debug ./target                   # os_log subsystem

# Then read os_log unified logging stream live
log stream --predicate 'process == "target"' --level debug

# Or extract historical logs
log show --predicate 'process == "target"' --last 1h --info --debug
```

This is the **partial-runtime-evidence path** for macOS. See [methodology/partial-runtime-evidence.md](../methodology/partial-runtime-evidence.md) for how to combine app-level logs with static analysis when wire-level capture is blocked.

**Network observation on macOS:** prefer application logs, a repository-owned local test server,
or an app-scoped proxy configured only for the launched test process. Changing system proxy or
trust-store settings is outside the default scope and requires explicit authorization plus a
verified restore plan. If the target ignores process-local proxy settings, record that limitation
instead of mutating the host.

### What to look for

| Observation | Hypothesis |
|---|---|
| `open("/etc/secret-config", ...)` | Reads unexpected config; look at what it does with contents |
| `connect(... 1.2.3.4:443)` | Phones home or depends on an external service |
| `getenv("FOO")` returning NULL | Env var expected but not set |
| Repeated `poll`/`epoll_wait` with no progress | Stuck on I/O; check downstream |
| `SIGSEGV` caught by signal handler | Custom crash recovery — often hides the real bug |
| `dlopen("libfoo.so.42")` | Dynamic plugin loading; check plugin path |

---

## [3] Static analysis with Ghidra

When triage + tracing have narrowed you to "something in function X" or "the crypto routine is weird", open Ghidra.

**Open [tools/ghidra.md](../tools/ghidra.md) before launching Ghidra** — the import / analyze / decompile workflow is not obvious and first-time users waste an hour figuring it out.

Ghidra's decompiler turns machine code into readable-ish C. That's usually what you want. Stay in the Decompiler view; drop to Listing (disassembly) only when the decompiler punts.

---

## [4] Dynamic debugging with pwndbg

Once static analysis gives you a hypothesis ("this branch at 0x401234 is where the validation fails"), confirm it at runtime with pwndbg.

**Open [tools/pwndbg.md](../tools/pwndbg.md) before launching gdb.** Pwndbg gives you the context view (registers / stack / disasm / code all visible at once) which is essential for binary debugging.

Typical pwndbg flow:

```
$ gdb ./target                                 # pwndbg loads automatically if installed
pwndbg> break *0x401234                        # break at the address static analysis flagged
pwndbg> run arg1 arg2
# At the breakpoint:
pwndbg> context                                # registers + stack + disasm
pwndbg> telescope $rdi                         # walk pointers at $rdi
pwndbg> x/20xw $rsp                            # raw dump of stack
pwndbg> ni / si                                # step next / step instruction
```

---

## [5] Scripted reproduction with an approved harness

Once you have a hypothesis with a concrete repro input, lock it down with the repository's existing harness or a minimal local driver approved in the plan. This is the "failing test" equivalent for binaries.

Do not introduce an exploitation framework merely for convenience. Prefer an existing unit, integration, fixture, stdin, or subprocess boundary and preserve the exact bytes that trigger the failure.

```python
from pwn import *

context.binary = elf = ELF('./target')

p = process('./target')
p.sendlineafter(b'> ', b'<trigger input that reproduces the bug>')
result = p.recvall(timeout=3)
assert b'expected-output-when-fixed' in result, f'bug repro: {result}'
```

This script is now your "red test". When the fix is applied, the script should pass (or the assertion should be inverted for negative tests — e.g. "the crash string should NOT appear").

---

## [6] Resolution when recompilation is unavailable

Prefer one of these bounded outcomes:

### Option A: Patch at the source (if you have it)

If the bug is in your own code and source is available, fix it there and rebuild. Standard TDD path.

### Option B: isolate or replace the component

When policy permits, route the affected workflow to a supported version or a documented wrapper
that does not alter process memory or the binary. Prove behavior and rollback at the real surface.

### Option C: report upstream

If it's a third-party binary and none of the above are feasible, the "fix" is a high-quality bug report with:
- Full triage summary
- Minimal authorized reproduction
- A short sanitized analysis of the failing function or execution path
- Hypothesis about the root cause
- Recommended patch sketch (in C or pseudocode)

---

## Silent-failure patterns in native binaries

| Pattern | Why it's silent |
|---|---|
| Ignored libc return codes (`read`, `write`, `malloc`) | Bug continues with garbage data; no check |
| Signal handler swallows SIGSEGV | Crash converted to "something didn't work"; no log |
| `setjmp`/`longjmp` unwinding over cleanup | Resources leak silently |
| Thread-local error state never read (`errno`, `GetLastError`) | Error happened, nobody asked |
| Recovered assertion failure in release build | `assert` compiled out; precondition violations silently corrupt |
| Dangling pointer reads after free | Often looks like valid data until it doesn't |

---

## Phase 9 cleanup specifics

```bash
# Kill debugger sessions
# Stop only the PID or process group recorded by this session, then verify it exited.
# Stop only the PID or process group recorded by this session, then verify it exited.

# Ghidra scratch projects (if made just for this session)
# Named something like ~/ghidra-projects/debug-<timestamp>:
ls -la ~/ghidra-projects/ 2>/dev/null
# Remove only the exact session-owned path recorded in the artifact ledger after inspection.

# For every recorded artifact:
# 1. Re-read the exact path from the session ledger.
# 2. Confirm it is session-owned and not a symlink escape.
# 3. Remove that exact path without globs.
# 4. Confirm absence and record the observation.
# For every launched process:
# 1. Signal only the recorded PID or process group.
# 2. Wait with a bound.
# 3. Verify the PID and any session-owned port are gone.
# This reference does not change system proxy, trust-store, DNS, or platform security settings.
```
