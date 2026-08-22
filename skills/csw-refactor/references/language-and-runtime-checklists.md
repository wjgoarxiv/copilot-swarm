# Language and runtime refactor checklists

Use this reference after selecting a structural pattern. Start with the shared checklist, then
load only the language or package section that matches the repository. Repository manifests,
lockfiles, task runners, and contribution docs override generic commands shown here.

## Shared runtime checklist

Before editing, identify:

- the repository's declared language and runtime versions;
- package, workspace, module, and visibility boundaries;
- build, test, lint, formatting, typecheck, and generation commands;
- startup entry points, plugin registries, and dependency composition roots;
- public exports, serialized data, configuration keys, and environment variables;
- generated, vendored, minified, or externally owned paths;
- cleanup owners for files, sockets, subprocesses, threads, and temporary resources;
- the real installed or invoked surface that users depend on.

After each structural checkpoint:

1. run the narrowest repository-owned diagnostic that covers the changed boundary;
2. run focused characterization tests;
3. inspect imports, exports, registration, and package inclusion;
4. inspect the diff for formatting or generated churn;
5. exercise the real surface when startup, packaging, or lifecycle ownership moved.

Do not add a new formatter, test runner, linter, package manager, or dependency merely to complete
a refactor. Use the repository's existing toolchain unless the user separately authorizes a
tooling change.

## JavaScript and TypeScript

### Map the execution model

- Read `package.json`, workspace manifests, the active lockfile, and runtime configuration.
- Distinguish ESM, CommonJS, and mixed-package boundaries.
- Identify `exports`, `imports`, `types`, `bin`, conditional exports, and side-effect declarations.
- Find path aliases and confirm whether runtime, compiler, bundler, and tests resolve them alike.
- Find top-level side effects, registration imports, dynamic imports, and loader hooks.
- Note whether source files run directly or only through emitted/bundled output.

### Rename and move checks

- Update static imports, re-exports, declaration generation, barrel files, and package export maps.
- Search string-based module paths used by dynamic import, test mocks, fixtures, CLIs, and plugins.
- Preserve file extensions required by the module mode.
- Check filename case against case-sensitive consumer filesystems.
- Verify type-only imports do not become runtime imports after the move.
- Compare tree-shaking or side-effect behavior when an index file changes.

### Extraction checks

- Preserve synchronous versus asynchronous behavior.
- Preserve promise rejection type, timing, and message when it is part of the contract.
- Keep abort signals, timeouts, streams, and resource cleanup under an explicit owner.
- Do not pass a broad application container when a few explicit values define the boundary.
- Preserve `this` binding for methods and callback invocation semantics.
- Check mutation and object identity when callers retain references.

### TypeScript-specific checks

- Distinguish compile-time compatibility from emitted runtime compatibility.
- Compare overload resolution, generic inference, discriminated unions, and declaration output.
- Avoid turning a type import into a value dependency through a convenient re-export.
- Check project references and incremental build boundaries after moving a file.
- Verify public `.d.ts` output or the package's established API-report surface.
- Run the repository's typecheck separately when tests transpile without type analysis.

### Runtime and package proof

```text
Manifest proof: export map and binary target resolve
Static proof: repository typecheck/build command passes
Behavior proof: focused and adjacent tests pass
Distribution proof: packed or installed clean consumer imports the public path
Lifecycle proof: original command starts, handles failure, and exits cleanly
```

Stop if module format changes incidentally, package consumers resolve a different file than tests,
or emitted declarations diverge from the intended public surface.

## Python

### Map the execution model

- Read `pyproject.toml`, the active lockfile, package layout, and supported interpreter range.
- Distinguish source-layout packages, namespace packages, editable installs, and direct script use.
- Find console-script entry points, plugin entry points, import-time registration, and lazy imports.
- Identify synchronous, asynchronous, threaded, and process-based lifecycle boundaries.
- Locate type-checker, test, lint, formatting, and build configuration already in use.

### Rename and move checks

- Update imports, re-exports in `__init__.py`, entry points, plugin strings, and documentation.
- Search dotted paths used by serializers, dependency injection, configuration, and test patching.
- Preserve import-time side effects only when they are an intentional contract.
- Check relative imports and package visibility after moving modules.
- Confirm wheels and source distributions include the new path and exclude the retired one.
- Verify pickled or persisted qualified names when existing data may contain them.

### Extraction checks

- Preserve positional, keyword-only, variadic, and default argument behavior.
- Preserve sentinel identity; do not replace a distinct sentinel with `None` casually.
- Preserve exception class, chaining, and stable message fragments.
- Keep context-manager and async-context-manager cleanup with the resource owner.
- Preserve generator laziness and iteration-time errors.
- Do not hide blocking I/O inside an async extraction.

### Type and runtime proof

- Run the repository's configured type checker if annotations are part of its quality gate.
- Test both import and execution paths for moved CLI modules.
- Build the repository's distribution artifact when package layout changed.
- Inspect artifact contents and test an isolated import or console entry point.
- Exercise cancellation and cleanup when async tasks or subprocesses move.
- Compare serialization and migration behavior for model changes.

### Worked boundary example

Moving validation from a CLI command into a domain module should not move terminal rendering or
process exit ownership. Return a domain result or raise the existing domain error; keep conversion
to exit status and user-facing output at the command boundary.

Stop if a move changes import-time behavior, breaks an established patch target without a migration
plan, or produces an artifact that differs from the source-tree test environment.

## Go

### Map the execution model

- Read `go.mod`, workspace configuration, build tags, generated-file markers, and module boundaries.
- Identify `internal` visibility, package initialization, registries, interfaces, and command roots.
- Find platform-specific files, embed directives, cgo boundaries, and generated mocks or clients.
- Map goroutine, channel, context cancellation, and resource ownership.

### Rename and move checks

- Use symbol-aware operations for identifiers, then search registration strings and configuration.
- Moving across packages changes identity; update import paths and assess public compatibility.
- Preserve exported names only when they remain part of the public contract.
- Recheck `internal` access rules and import cycles.
- Inspect `init` ordering and avoid introducing registration through incidental imports.
- Update generator inputs and run repository-owned generation commands.

### Extraction checks

- Keep context as the first parameter where the repository follows that convention.
- Preserve nil versus empty slices and maps when serialization or callers distinguish them.
- Preserve error wrapping so `errors.Is` and `errors.As` behavior remains stable.
- Preserve defer order and the ownership of closing bodies, files, channels, and timers.
- Avoid creating an interface at the implementation package; policy consumers should own it.
- Keep goroutine termination observable and tied to cancellation or completion.

### Verification

- Run focused package tests and the adjacent module test set.
- Run race detection when the repository already uses it and concurrency ownership changed.
- Compile affected commands and relevant build-tag or platform variants available locally.
- Check module/package dependency direction and cycles.
- Compare public API or documentation output when exported identifiers move.
- Exercise startup, cancellation, and shutdown for changed lifecycle code.

Stop if a new package cycle appears, an interface merely duplicates one implementation, or a
goroutine can outlive its former cancellation owner.

## Rust

### Map the execution model

- Read workspace and crate manifests, feature definitions, lockfile, and supported toolchain.
- Identify crate types, binaries, modules, public re-exports, build scripts, and generated bindings.
- Map ownership, borrowing, lifetimes, trait boundaries, unsafe blocks, and async runtimes.
- Find feature-gated and platform-gated code paths affected by the move.

### Rename and move checks

- Update module declarations, `use` paths, public re-exports, macro paths, and documentation links.
- Check whether moving changes privacy or the canonical public type path.
- Preserve trait coherence and feature availability.
- Search string paths in registries, configuration, snapshots, and proc-macro inputs.
- Regenerate bindings or schema-derived code through the owning build path.
- Verify downstream users can import the intended re-export rather than a private module.

### Extraction checks

- Preserve ownership and borrowing semantics rather than cloning merely to satisfy the move.
- Preserve error variants and source chains used by callers.
- Keep drop order and guard lifetime explicit where cleanup matters.
- Avoid moving an unsafe invariant without moving its safety documentation and tests.
- Preserve `Send` and `Sync` expectations across async or threaded boundaries.
- Keep cancellation and task-join ownership at a visible lifecycle boundary.

### Verification

- Run focused crate tests, workspace checks, and configured lint gates.
- Build relevant feature combinations already named by repository automation.
- Compare public documentation or API reports when exports move.
- Run doctests when examples are part of the contract.
- Exercise binaries or installed artifacts when command wiring changes.
- Inspect unsafe boundaries and generated output separately from ordinary diff review.

Stop if the refactor requires unexplained cloning, weakens an unsafe invariant, changes a public
type path without migration, or leaves spawned work without a join or cancellation owner.

## Package and distribution boundaries

Use this section for any language when users consume a built, packed, installed, or generated
artifact rather than the source checkout.

### Artifact map

Record:

| Surface | Question |
| --- | --- |
| Manifest | Does it point at the moved entry, type, binary, or resource? |
| Include rules | Is the new path present and the retired path absent? |
| Public import | Does a clean consumer resolve the documented path? |
| Runtime asset | Are templates, schemas, native files, or migrations located correctly? |
| Generation | Can the artifact be reproduced from owned source? |
| Installation | Does the installed command use this candidate rather than a local checkout? |

### Clean-consumer procedure

1. Build or pack with the repository's command.
2. Inspect the produced file list and metadata.
3. Install or reference the candidate in an isolated temporary consumer.
4. Run the smallest documented import or command.
5. Exercise one failure or configuration path affected by the refactor.
6. Remove temporary artifacts and verify no process remains.

Do not let workspace aliases, editable installs, global packages, or source-tree environment
variables masquerade as distribution proof.

## Cross-language evidence template

```markdown
### Runtime checkpoint
- Language/runtime declaration: <manifest and version source>
- Structural pattern: <rename, extract, move, split, invert, migrate>
- Module/package boundary: <before -> after>
- Public surface: <preserved or authorized migration>
- Generated owner: <command or none>
- Static diagnostic: <repository command and result>
- Focused behavior: <command and result>
- Feature/platform variants: <checked or reason unavailable>
- Artifact or real surface: <scenario and result>
- Cleanup/lifecycle: <observed result>
- Stop conditions reviewed: <none or named blocker>
```

The template is a routing aid, not a substitute for actual command output and diff inspection.
