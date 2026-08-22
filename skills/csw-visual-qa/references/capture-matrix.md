# Capture matrix

Build a risk-based matrix before taking screenshots. The matrix prevents a polished
default state from hiding failures in loading, empty, error, long-content,
responsive, keyboard, motion, or terminal-width scenarios.

## Matrix fields

Use one row per distinct scenario:

| Field | Required detail |
| --- | --- |
| ID | Stable short identifier |
| Surface | Route, component, command, or terminal panel |
| User task | What the user is trying to complete |
| State | Default, focus, loading, empty, error, success, long content, etc. |
| Dimensions | Viewport and scale, or terminal rows and columns |
| Theme / locale | Relevant display mode and language |
| Fixture | Deterministic data or setup condition |
| Interaction | Keys, clicks, resize, scroll, or motion sequence |
| Expected invariant | What must remain usable or visually coherent |
| Evidence path | Fresh capture, sequence, or trace |
| Result | Pass, issue severity, or blocked |

Record the build identity or final-change timestamp once for the packet and repeat
it when evidence was captured from different builds.

## Web baseline matrix

Choose applicable rows; do not include unsupported states just to fill a table.

| Scenario | Wide | Narrow | Intermediate |
| --- | --- | --- | --- |
| Primary success path | required | required | when structure changes |
| Keyboard focus path | required | when keyboard applies | when navigation changes |
| Loading | when async | when async | optional |
| Empty state | when possible | when possible | optional |
| Error and recovery | when possible | when possible | optional |
| Long content | required for user content | required | when tables/grids change |
| Dialog/menu open | when changed | when changed | at breakpoint boundary |
| Alternate theme | when promised | when promised | optional |
| Large text / zoom | at dense surface | at dense surface | optional |
| Motion sequence | when changed | when changed | at breakpoint boundary |

Pick dimensions from product breakpoints and user reality rather than generic
device names. Capture just below and above a breakpoint when the change affects its
layout rule.

## Terminal baseline matrix

| Scenario | Default size | Narrow | Short |
| --- | --- | --- | --- |
| Initial screen | required | required | required |
| Loading/progress | when present | required | when vertical flow matters |
| Error/recovery | required | required | required |
| Selection/focus | required | required | when clipped |
| Scroll top/middle/bottom | when content scrolls | required | required |
| Color off | required | required | optional |
| Wide character/CJK | required | required | required |
| Long unbroken value | required | required | optional |
| Cancellation/completion | when present | required | required |

Use the smallest supported size as a boundary, not an impossible dimension. If the
application declares a minimum, verify the behavior immediately above it and the
error or fallback immediately below it.

## State coverage rules

For every state changed by the implementation, capture:

1. entry into the state;
2. the stable state;
3. recovery or transition out of it.

For loading, prove that layout does not jump materially and that progress does not
hide keyboard focus. For empty state, prove that the next action is visible. For
error, prove the message and recovery control. For success, prove that feedback is
perceivable and does not obscure the next task.

## Content stress fixtures

Include realistic adversarial content:

- very short and very long labels;
- multi-line titles and descriptions;
- long paths, identifiers, and unbroken tokens;
- zero, one, and many list rows;
- missing optional image or metadata;
- CJK text and mixed Latin/CJK strings;
- duplicate-looking entries that require secondary labels;
- validation messages on multiple fields.

Do not use secrets or production personal data in fixtures.

## Interaction sequences

A static screenshot is insufficient when the risk involves time or focus. Capture a
sequence for:

- opening and closing a dialog, menu, or drawer;
- keyboard traversal and focus restoration;
- async loading through success or error;
- drag, resize, expansion, or reordering;
- terminal selection, scrolling, cancellation, and completion;
- reduced-motion versus normal-motion behavior.

Record exact actions and pause points. The final frame alone may hide flicker,
layout shift, or a momentarily stranded focus target.

## Evidence naming

Use names that remain understandable out of context:

```text
<matrix-id>_<surface>_<state>_<dimensions>_<theme>.<ext>
```

Avoid `final.png`, `new.png`, or reused paths that can silently point to an older
build. If the evidence system provides immutable artifact identifiers, cite them in
addition to friendly paths.

## Matrix completion

Before verdict:

- every required row has fresh evidence or a named blocker;
- captures correspond to the final build;
- dimensions and fixtures are recorded;
- state transitions include recovery;
- unreviewed optional rows are called out;
- disposable data, servers, and captures are cleaned up.

An incomplete required row makes the result `NEEDS WORK` or `BLOCKED`, never
`GOOD`.
