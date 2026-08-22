---
name: csw-visual-qa
description: Verify web and terminal interfaces with fresh scenario captures, interaction and accessibility checks, reference-aware review, and explicit evidence-backed verdicts.
---

# Visual QA

Use this skill after a visible web UI or terminal UI change and whenever the user
asks whether a surface looks or behaves correctly. Visual QA is a scenario test: a
single attractive screenshot cannot prove responsive layout, keyboard operation,
state transitions, motion, or wide-character alignment.

## Copilot CLI compatibility

Use the host's browser, screenshot, image-inspection, or terminal-capture surfaces
when available. A read-only worker needs host-enforced non-mutating tools, and its
opinion remains a claim until the conductor inspects the actual captures.

Never treat a green unit suite, generated HTML, or worker summary as visual
evidence. Capture the final runnable surface after the final build.

## Read the focused references

- [Capture matrix](references/capture-matrix.md) — choose routes, states, viewport
  or terminal dimensions, themes, and interaction sequences.
- [Web review](references/web-review.md) — review hierarchy, layout, components,
  responsive behavior, keyboard access, content stress, and motion.
- [TUI and CJK review](references/tui-and-cjk-review.md) — verify resize, scrolling,
  color-off behavior, box drawing, clipping, and wide character alignment.
- [Verdict template](references/verdict-template.md) — produce a reproducible
  `GOOD`, `NEEDS WORK`, or `BLOCKED` result with severity and evidence paths.
- [Objective comparison](references/objective-comparison.md) — establish
  like-for-like identity and freshness, interpret pixel hotspots and alpha, and
  compare terminal cells or motion without overclaiming similarity metrics.
- [Independent reviewer packets](references/reviewer-packets.md) — dispatch two
  host-enforced read-only reviews with native `task`, supervise them through
  `/tasks`, and reconcile their claims against the actual evidence.
- [Visual QA counterexamples](references/visual-counterexamples.md) — challenge
  misleading similarity, flattened-image, responsive, zoom, state, motion, and
  mixed-width terminal evidence before issuing a verdict.

## Phase 1: define the visual contract

Before launching a surface, identify:

1. changed routes, screens, components, or terminal panels;
2. primary user task and success path;
3. authoritative reference, if one exists;
4. design-system tokens and shared components the change should use;
5. relevant states: default, hover, focus, active, selected, disabled, loading,
   empty state, error, success, and long content;
6. relevant viewport, zoom, terminal size, theme, locale, and reduced-motion modes;
7. functional preconditions and deterministic fixture data.

If no authoritative reference exists, review internal consistency and usability.
Do not invent pixel fidelity to a screenshot that represents a different viewport,
data state, font environment, or product version.

## Phase 2: build the capture matrix

Choose the smallest matrix that covers every changed visual risk.

For web surfaces, normally include:

- a wide desktop viewport;
- a narrow mobile viewport;
- one intermediate width when layout structure changes there;
- keyboard focus on the primary path;
- loading, empty state, error, and long content where supported;
- dark or alternate theme when the product promises it;
- zoom or large-text stress for dense layouts;
- a motion sequence when transition timing or intermediate layout matters.

For terminal surfaces, normally include:

- expected default dimensions;
- narrow and short resize boundaries;
- scrollable content at the top, middle, and bottom;
- color-on and color-off modes;
- long ASCII plus wide character/CJK content;
- a progress, loading, error, and completion state;
- an interaction sequence for selection, cancellation, or focus changes.

Every capture record names scenario, dimensions, state, data fixture, theme, build
identity, and evidence path. A path without scenario metadata is hard to audit.

## Phase 3: prepare fresh evidence

1. Build or launch the final local surface using the repository's documented path.
2. Verify that the rendered build includes the intended change.
3. Seed deterministic data and reset stale local state.
4. Capture after fonts, images, and async data have settled, except when the target
   is the loading transition itself.
5. Preserve a short sequence for motion or interaction rather than selecting only
   the most flattering frame.
6. Store durable evidence in the repository's approved evidence location. Keep
   disposable captures outside tracked product paths and remove them afterward.

Record the exact route or command and viewport or terminal dimensions so another
reviewer can reproduce the same surface.

## Phase 4: web system-integrity review

Inspect the complete user path rather than isolated components.

### Hierarchy and flow

- Is the primary task obvious within the first scan?
- Do heading levels, grouping, whitespace, and action prominence reflect task
  priority?
- Is destructive or secondary action styling proportional to its role?
- Are loading, empty, error, and success states located where users expect the
  result or recovery action?

### Layout and responsive structure

- Do containers, grids, and alignment use the product system consistently?
- Does the layout reflow rather than merely shrink at a narrow viewport?
- Are navigation, dialogs, tables, and sticky regions usable without hidden
  controls or accidental horizontal scrolling?
- Does long content wrap or truncate intentionally, with access to the full value
  where needed?

### Components and content

- Are existing shared components reused with the correct variants?
- Are typography, color, radius, elevation, icon scale, and spacing tokens coherent?
- Does realistic long content expose overlap, clipping, or layout jump?
- Do empty state and error messages explain the next action rather than merely the
  absence of data?

### Accessibility and interaction

- Can the primary flow be completed by keyboard?
- Is focus visible, ordered logically, and restored after modal or menu closure?
- Do text, controls, and state indicators remain perceivable without color alone?
- Do labels, names, error associations, and touch targets match visible intent?
- At zoom or large text, is important content still reachable and non-overlapping?

## Phase 5: reference fidelity and precision review

When an authoritative reference exists, compare like-for-like captures. Check:

- global silhouette, density, and hierarchy before individual pixels;
- content width, gutters, column ratios, and vertical rhythm;
- typography family, weight, size, line height, wrapping, and baseline;
- color roles, borders, dividers, shadows, and surface elevation;
- icon shape, optical alignment, and control hit area;
- image crop, aspect ratio, loading behavior, and rendering artifacts;
- state-specific differences at the same dimensions and content.

Pixel differences are evidence, not the verdict. Explain whether a difference is a
bug, an intentional system adaptation, environment variance, or an incomparable
reference condition.

## Phase 6: terminal review

Inspect both geometry and interaction:

- box-drawing joins and panel borders remain continuous;
- columns align across ASCII and wide character/CJK rows;
- resize does not strand controls, panic, or leave stale fragments;
- scrolling reveals all content and preserves a meaningful selection;
- color-off mode retains hierarchy through text and symbols;
- truncation respects terminal-cell width and exposes critical values;
- progress, loading, error, cancellation, and completion states replace one another
  cleanly;
- cursor, focus, and key hints match the actual active control.

Text-codepoint counts are not terminal-cell widths. Verify rendered columns with
real mixed-width content.

## Phase 7: motion and temporal behavior

Static captures cannot prove animation, layout stability during async transitions,
or focus after navigation. For relevant changes, review:

- initial, intermediate, and final frames;
- duration and easing consistency;
- interruption and repeated activation;
- reduced-motion behavior;
- layout shift while content or fonts load;
- focus and screen state after transition completion.

Record a short sequence or trace and cite its path in the verdict.

## Phase 8: classify findings

Assign severity from user impact:

- `BLOCKER`: primary task cannot be completed, content is inaccessible, or the
  surface crashes or becomes unusable;
- `MAJOR`: important state, viewport, keyboard path, or content type is broken;
- `MINOR`: visible inconsistency or precision issue with a clear local fix;
- `NOTE`: intentional difference, preservation point, or optional improvement.

Each issue needs scenario, evidence path, observed behavior, expected behavior, and
reproduction steps. Avoid vague findings such as “spacing feels off.”

## Verdict rules

Return:

- `GOOD` when all required scenarios were inspected and no blocker, major, or
  unaccepted material regression remains;
- `NEEDS WORK` when a reproducible must-fix visual or interaction issue remains;
- `BLOCKED` when the runnable surface, authoritative input, required environment,
  or capture capability is unavailable.

A partially reviewed matrix cannot receive `GOOD`. Name unreviewed scenarios and
why they matter.

## Cleanup and evidence integrity

Stop temporary servers, browser sessions, terminal sessions, and recording
processes. Remove captures that are not retained as evidence. Confirm the evidence
paths exist and correspond to the final build, not a superseded iteration.

The final report lists the matrix reviewed, verdict, must-fix issues, strengths to
preserve, evidence paths, reproduction steps, unreviewed risks, and cleanup result.
