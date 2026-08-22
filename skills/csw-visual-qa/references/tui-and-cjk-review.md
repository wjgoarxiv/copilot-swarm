# Terminal UI and CJK review

Terminal interfaces render into cells, not pixels. A correct review must account
for terminal dimensions, cell width, color capability, resize behavior, scrolling,
and input focus.

## Environment record

For reproducibility, capture:

- terminal application or host surface;
- rows and columns;
- color capability and theme;
- locale and encoding;
- font and fallback font when known;
- shell only when it affects launch behavior;
- command and deterministic fixture;
- build identity and evidence path.

Do not include secrets or a full environment dump.

## Geometry baseline

At the default supported size, inspect:

- top-level panel boundaries;
- title, status, content, help, and input regions;
- consistent inner padding;
- box-drawing joins at corners and intersections;
- column headers and row values;
- cursor and active-focus position;
- whether the last row is unintentionally consumed by wrapping.

Capture the full terminal, not a cropped content fragment that hides boundary
failures.

## Resize behavior

Test default, narrow, and short dimensions, plus the documented minimum boundary.

During resize, verify:

- no panic, crash, or uncontrolled log output;
- borders redraw without stale fragments;
- controls remain reachable or a clear minimum-size fallback appears;
- layout chooses intentional truncation, wrapping, stacking, or hiding;
- selection remains attached to the same logical item;
- scroll position stays meaningful;
- the cursor remains inside the active region;
- restoring size produces a clean layout.

Capture both the constrained state and the restored state. A surface that recovers
only after restart has failed resize behavior.

## Wide character and CJK fixtures

Use mixed content that exposes terminal-cell assumptions:

```text
ASCII short
한글 항목과 English 123
日本語の長い項目 mixed-value
emoji where the product supports it
a-long-unbroken-identifier-or-path
```

Verify:

- column separators align across rows;
- truncation counts rendered cell width rather than codepoints or bytes;
- ellipsis does not split a grapheme or leave a dangling combining mark;
- search, selection, and highlights cover the visible glyph cells;
- borders after wide text remain aligned;
- cursor movement does not land inside a rendered wide glyph;
- wrapping preserves complete labels and does not overwrite the next row.

Different terminals may disagree on emoji width. If emoji is supported, record the
tested environment and avoid relying on ambiguous glyphs for essential geometry.

## Scrolling and long content

Use content longer than both the viewport height and width. Inspect:

- top, middle, and bottom scroll positions;
- visible indication that more content exists;
- selected row or cursor remains visible;
- header/footer or key hints do not cover rows;
- page, line, and jump navigation stop at correct boundaries;
- long values truncate or horizontally scroll according to the product contract;
- new output during scrolling does not unexpectedly steal position.

For logs or streaming output, verify pause/follow behavior and whether the user can
return to the latest entry intentionally.

## Color-off and contrast

Disable color through the product's supported mode or a compatible terminal
setting. Confirm:

- selection, focus, success, warning, and error remain distinguishable by text,
  symbols, borders, or emphasis;
- disabled actions are understandable without low contrast alone;
- links or commands remain recognizable;
- no raw escape sequences appear;
- redirected or non-interactive output remains readable.

Then review color-on mode for legibility in the tested light or dark theme. Color is
an enhancement, not the only carrier of state.

## State transitions

Capture loading, progress, error, cancellation, and completion where present.

- loading indicators update without shifting unrelated regions;
- progress lines replace or update rather than multiplying uncontrollably;
- errors preserve enough context and show recovery or exit keys;
- cancellation leaves a stable terminal and accurate status;
- completion does not erase the result before it can be read;
- repeated commands reset stale state;
- input during a transition is either handled or clearly disabled.

For animated spinners or progress, use a short recording or sequence. One frame
cannot prove cleanup or temporal stability.

## Keyboard and focus

Exercise every documented key path relevant to the change:

- move forward and backward through controls;
- switch panels or modes;
- scroll and select;
- submit, cancel, and quit;
- open and close help;
- recover from an invalid action.

The displayed key hints must match actual behavior. Focus styling must remain visible
in color-off mode and after resize.

## Streaming and asynchronous updates

When background work updates the TUI, verify:

- redraws are atomic enough to avoid mixed frames;
- input is not echoed into output regions;
- late messages do not overwrite prompts;
- cancellation stops further visual updates;
- the final state agrees with the underlying command result;
- terminal control sequences are restored on normal exit and failure.

After exit, check that the cursor, input echo, and screen mode are restored.

## Findings and verdict impact

Classify as `BLOCKER` when the user cannot exit, input is corrupted, the terminal is
left unusable, or the primary task cannot complete. Use `MAJOR` for broken resize,
scrolling, wide-character alignment, or inaccessible error recovery on a supported
path. Use `MINOR` for local border, spacing, or precision issues.

Each finding includes the exact rows/columns, fixture, state, evidence path,
observed cells, expected behavior, and reproduction keys.

## Cleanup

Stop background commands and recorders. Exit alternate-screen and raw-input modes.
Verify no process continues writing to the terminal. Remove disposable captures and
fixtures, and retain only evidence tied to the final build.
