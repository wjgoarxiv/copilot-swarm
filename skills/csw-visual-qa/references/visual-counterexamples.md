# Visual QA counterexamples

These counterexamples describe evidence that looks persuasive but cannot support
the claimed verdict. Use them while designing the capture matrix and again before
issuing `GOOD`.

## Counterexample 1: the high similarity score

### Misleading claim

> The images are 99.2% similar, so the implementation matches.

### Why it fails

A page-wide percentage gives equal numerical influence to empty background and
critical controls. A missing focus ring, clipped error, or displaced primary action
may occupy little area while materially harming the workflow. The score also says
nothing about route, state, scale, alpha, tolerance, or reference freshness.

### Required correction

- establish like-for-like identity and geometry;
- retain both original images;
- identify localized hotspots;
- inspect primary tasks and states directly;
- state the metric, tolerance, alpha handling, and exclusions;
- classify user impact independently of pixel area.

### Stop condition

Do not issue a fidelity verdict if the metric is available but the original pair
or comparison metadata is not.

## Counterexample 2: the pasted reference image

### Misleading claim

> The screenshot matches the design exactly.

### Failure mode

The implementation displays the design export as one image, or an overlay covers
the live controls during capture. Pixel comparison may be perfect while text is not
selectable, controls do not respond, content is fabricated, and accessibility is
absent.

### Detection probes

- select or inspect visible text;
- focus and activate each primary control;
- change fixture data and confirm content updates;
- resize and observe real reflow rather than bitmap scaling;
- hide images or inspect the rendered element structure with available read-only
  tools;
- capture hover, focus, loading, error, and success states;
- verify hit targets extend over the intended controls.

### Severity

Treat a flattened-image substitute for a required interactive surface as
`BLOCKER`, even if the image is visually exact.

## Counterexample 3: desktop-only success

### Misleading claim

> The page looks correct at 1440 pixels, so responsive QA passes.

### Hidden failures

- navigation disappears at a narrow width without an alternative;
- a dialog exceeds the viewport and hides its confirmation control;
- a table causes page-wide horizontal scrolling;
- sticky controls cover content at intermediate widths;
- long localized labels collide only near a breakpoint;
- a mobile layout changes visual order but not keyboard or reading order.

### Required matrix

Capture wide, narrow, and any structural intermediate breakpoint. Include realistic
long content, open overlays, keyboard focus, and error states at the risky width.
Record the exact CSS viewport and device scale.

### Stop condition

One width cannot prove responsive behavior. Mark the review `BLOCKED` when required
widths were not inspected.

## Counterexample 4: browser zoom confused with viewport resize

### Misleading claim

> The page was tested at 200% because we halved the viewport width.

### Why it fails

Browser zoom changes CSS-to-device-pixel mapping, effective viewport, text raster,
and sometimes media-query behavior. Resizing tests responsive layout; zoom tests
magnification and content reachability. They overlap but are not interchangeable.

### Required correction

- record physical screenshot dimensions, CSS viewport, device scale, and zoom;
- test the product's required zoom or large-text condition explicitly;
- check that content, focus, and controls remain reachable;
- distinguish intentional reflow from overlap, clipping, or hidden content;
- test fixed, sticky, modal, and tooltip regions at zoom.

### Severity

Hidden primary content or controls at a supported zoom is normally `MAJOR`.

## Counterexample 5: only the default state

### Misleading claim

> The component looks polished in the screenshot.

### Hidden failures

The default state can conceal unreadable validation text, a focus ring clipped by
overflow, a disabled state indistinguishable from enabled, a loading jump, an
empty state without recovery, or a success banner covering the next action.

### Required matrix

For changed controls, select relevant states from default, hover, focus, active,
selected, disabled, loading, empty, error, success, long content, and permission-
restricted. Pair each state with the transition that enters or leaves it.

### Stop condition

Do not generalize a default-state capture to unobserved states named by the
acceptance criteria.

## Counterexample 6: final-frame motion proof

### Misleading claim

> The menu animation is correct because the open state matches the design.

### Hidden failures

- the first frame flashes at the wrong origin;
- content shifts during font or image loading;
- rapid repeated activation strands an intermediate state;
- focus moves before the destination is visible;
- input is blocked after the visual transition finishes;
- reduced-motion mode still performs large spatial movement;
- a closing overlay remains clickable or visible for one frame.

### Required evidence

Capture before activation, first response, meaningful intermediate frame, settled
state, interruption or repeated activation, and reduced-motion outcome. Record the
trigger and timing basis.

### Severity

Motion that causes task failure, lost focus, or inaccessible controls is `MAJOR`.
Minor easing drift without task impact may be `MINOR`.

## Counterexample 7: color screenshot proves accessibility

### Misleading claim

> Statuses are easy to distinguish because green and red are visually different.

### Why it fails

Color-only state encoding can fail for users with color-vision differences, in
forced colors, in terminal color-off mode, or on a low-quality display. A screenshot
also cannot prove accessible names or error associations.

### Required correction

- include text, iconography, shape, position, or another non-color cue;
- inspect focus and forced-color or color-off evidence when promised;
- verify labels and associations with semantic inspection where available;
- record contrast measurements with their exact foreground and background;
- do not infer semantics from appearance.

## Counterexample 8: ASCII-only terminal capture

### Misleading claim

> Every column aligns in the terminal screenshot.

### Hidden failures

The fixture contains only single-cell ASCII. Real user input includes Hangul, CJK
ideographs, emoji, combining marks, variation selectors, and ambiguous-width
characters. Code-point length calculations can shift borders, truncation, and
selection by multiple cells.

### Required fixture

```text
ASCII: build-status
Hangul: 빌드 상태
CJK: 構建狀態
Combining: café
Emoji: 상태 ✅
Long: 매우-긴-작업-이름-끝
```

Capture default, narrow, scroll, selected, and color-off states. Record terminal
rows, columns, emulator, font, locale, and relevant width policy.

### Severity

Misalignment that hides critical values or makes the primary TUI path unusable is
`MAJOR`; a local decorative border defect is usually `MINOR`.

## Counterexample 9: fixed terminal bitmap dimensions

### Misleading claim

> Both PNG files are 1200 by 800, so the terminal conditions match.

### Why it fails

Bitmap size does not establish terminal rows and columns. Different fonts, font
sizes, padding, device scales, or emulator chrome can yield different cell grids in
the same image dimensions.

### Required correction

Compare rows, columns, font, emulator, locale, and content fixture. Use cell
coordinates for alignment findings and pixels only for raster-level decoration.

## Counterexample 10: stale success capture

### Misleading claim

> This screenshot proves the final change works.

### Failure mode

The capture came from a server launched before the last build, a different branch,
a cached service worker, or a superseded fixture. Its filename looks current, but
its content identity is not established.

### Required correction

- record revision and build identity;
- prove one revision-specific visible fact;
- rebuild and recapture after final changes;
- clear only repository-approved caches and state;
- separate retained evidence from superseded captures;
- record timestamp and launch command.

### Stop condition

Unknown freshness makes the affected scenario `BLOCKED`, not `GOOD`.

## Counterexample 11: reference from another environment

### Misleading claim

> The target is wrong because every line wraps differently from the reference.

### Hidden mismatch

The reference used another font, locale, scrollbar policy, data fixture, browser,
or viewport. A widespread raster diff may be environmental rather than a product
regression.

### Required correction

Mark the pair `NOT LIKE-FOR-LIKE`, identify the mismatched fields, and obtain a
valid pair. If the environment difference itself is a supported product condition,
test it as its own scenario instead of forcing an overlay.

## Counterexample 12: evidence selected after seeing the result

### Misleading claim

> These three frames show a smooth transition.

### Failure mode

Only flattering frames were retained from a recording that contains flicker,
layout shift, or a broken interruption. Post-hoc selection hides temporal defects.

### Required correction

- predeclare temporal checkpoints;
- retain the source sequence or trace;
- include interruption and repeated activation when relevant;
- state frame timing and sampling limits;
- ask an independent reviewer to inspect the sequence, not only exports.

## Counterexample 13: the reviewer consensus shortcut

### Misleading claim

> Two workers said GOOD, so the conductor can accept the result.

### Why it fails

Workers may share the same missing evidence, anchor on the same description, or
misread an artifact. Agreement is not a machine or visual receipt.

### Required correction

The conductor opens cited captures, checks coverage, reproduces blocker and major
claims, reconciles discrepancies, and owns the final verdict. Keep independent
packet scopes separate until both reports are complete.

## Counterexample 14: visual polish hides a broken task

### Misleading claim

> The page is visually excellent, so this is only a minor issue.

### Failure mode

The primary action is attractive but disabled, outside the keyboard order, covered
by an invisible overlay, or wired to the wrong state. Aesthetic quality cannot
lower the severity of task failure.

### Required correction

Pair visual inspection with repository-approved interaction evidence for the
primary path. Classify inability to complete the required task as `BLOCKER` or
`MAJOR` according to scope, regardless of appearance.

## Evidence challenge template

Use this for any apparently strong visual claim:

```markdown
Claim: <what the evidence is said to prove>
Scenario: <route-or-command, state, fixture, geometry>
Target identity: <revision-and-build>
Evidence: <paths>
What is directly observable: <facts>
What is inferred: <claims not visible in the artifact>
Alternative explanation: <stale build, environment, flattened image, etc.>
Additional probe: <smallest evidence needed>
Severity if confirmed: BLOCKER / MAJOR / MINOR / NOTE
Decision: supported / unsupported / incomparable / blocked
```

## Pre-verdict counterexample check

- [ ] No aggregate similarity score substitutes for hotspot inspection.
- [ ] The surface is interactive implementation, not a flattened substitute.
- [ ] Required responsive widths were captured with exact metadata.
- [ ] Zoom and viewport resize were tested as distinct conditions.
- [ ] Changed states extend beyond the most flattering default view.
- [ ] Motion claims include intermediate, interruption, and reduced-motion evidence.
- [ ] Color-independent cues and visible focus were inspected where relevant.
- [ ] TUI fixtures include supported mixed-width content.
- [ ] Terminal rows, columns, font, and emulator are recorded.
- [ ] Every retained capture corresponds to the final target identity.
- [ ] Target and reference are genuinely like-for-like.
- [ ] Original captures remain beside any derived diff or metric.
- [ ] Independent reviewers did not replace conductor verification.
- [ ] Severity follows user impact rather than visual area or polish.

If any required item fails, return `NEEDS WORK` or `BLOCKED` and name the missing
proof. Never reduce the completion bar because the available screenshot looks
convincing.
