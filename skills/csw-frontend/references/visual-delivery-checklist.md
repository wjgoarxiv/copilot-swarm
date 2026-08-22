# Visual delivery checklist

## Build packet

Record target route, component, user task, authoritative reference, changed files, commands, data
fixture, supported themes, and capture matrix.

## State matrix

- [ ] initial/idle;
- [ ] hover and focus-visible;
- [ ] active/selected;
- [ ] disabled/read-only;
- [ ] loading/cancellation;
- [ ] empty/first use;
- [ ] validation error;
- [ ] dependency error and recovery;
- [ ] success/confirmation;
- [ ] long and missing content;
- [ ] unauthorized/offline when applicable.

## Visual review

- Information hierarchy matches the primary task.
- Typography scale and line length are deliberate.
- Spacing communicates grouping and sequence.
- Color and contrast work in each theme.
- Icons align, have names, and do not carry meaning alone.
- Borders, radius, shadows, and density match product language.
- No clipping, accidental scroll, layout shift, or unstable control position.
- Reference differences are intentional and documented.

## Interaction review

- Pointer and keyboard paths reach the same outcome.
- Loading prevents duplicate destructive actions without trapping the user.
- Errors preserve recoverable input and offer next action.
- Overlays restore focus and scrolling.
- Motion communicates transition and honors reduced motion.
- Browser back, refresh, and repeated submission behave intentionally.

## Capture matrix

| Route/state | Viewport | Theme | Locale/content | Interaction | Evidence path |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

Capture after the final build. Record exact dimensions. Do not reuse a screenshot from before the
last layout or token change.

## Verification commands

Run repository-defined focused tests, accessibility tests, typecheck, lint, format check, build,
and browser/visual scenarios. Record exit status. Automated screenshot success does not replace
opening and inspecting the image.

## Evidence path rules

- use stable scenario names;
- keep only final and diagnostically necessary captures;
- redact private user data;
- include motion log or sequence when static output is insufficient;
- clean temporary servers and browser contexts.

## Delivery report

```text
Primary task:
Design-system reuse:
States implemented:
Responsive result:
Accessibility result:
Reference fidelity:
Tests/build:
Capture paths:
Cleanup:
Remaining limitations:
```

## Completion gate

The result is incomplete when the happy screenshot looks correct but an error, empty, keyboard,
long-content, or narrow state is unverified. It is also incomplete when tests pass but the final
rendered evidence has not been inspected.

## Regression comparison packet

When the change replaces an existing surface, retain a matched before/after pair for each
high-risk scenario. Match route, fixture, viewport, theme, zoom, and state so the comparison is
meaningful. Explain changes to hierarchy, wrapping, component choice, and interaction instead of
reporting an unexplained pixel delta.

```text
Scenario:
Before evidence:
After evidence:
Intended visual change:
Unexpected difference:
Interaction or focus change:
Accepted by:
```

## Failure triage order

When a capture differs from the intended result, investigate in this order:

1. confirm the final build and correct route are loaded;
2. confirm fixture, viewport, theme, fonts, and feature state;
3. reproduce the issue manually at the same dimensions;
4. identify whether layout, token, component, content, or async state owns it;
5. correct the smallest owning layer;
6. rerun focused behavior checks and recapture every affected matrix row;
7. inspect the new evidence before closing the finding.

Do not update a reference image merely because the implementation differs. A reference changes
only through an explicit product decision.
