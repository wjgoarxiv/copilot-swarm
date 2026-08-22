# Objective visual comparison

Use this reference when a change must be compared with an authoritative design,
an accepted baseline, or a previous product build. The purpose is to turn visual
similarity into reproducible observations without pretending that a pixel score is
the same thing as product correctness.

## Comparison contract

Write the contract before capturing either side:

| Field | Required value |
| --- | --- |
| target identity | commit, build ID, package version, or immutable artifact |
| reference identity | source file version, accepted capture ID, or product build |
| route or command | exact navigation path or terminal invocation |
| fixture | account, seed, locale, permissions, and data-state identity |
| geometry | CSS viewport and device scale, or terminal rows and columns |
| presentation | theme, font set, zoom, color mode, and reduced-motion mode |
| state | default, focused, open, loading, error, success, or named transition |
| capture time | timestamp plus the event that proves the surface settled |

If any comparison-critical field differs, label the pair `NOT LIKE-FOR-LIKE`.
Do not calculate a confidence-looking score for an incomparable pair.

## Identity and freshness gate

Before review, establish that both inputs are the intended inputs.

1. Record the current target revision and build command.
2. Confirm the running process serves that revision rather than an older bundle.
3. Make one harmless, revision-specific observation, such as a changed label or
   asset hash, visible in the rendered output.
4. Record the reference source and its version or approval date.
5. Reject a reference exported from an unknown branch, viewport, or data state.
6. Re-capture the target after the final code or asset change.
7. Keep superseded captures out of the final evidence directory.

Freshness is part of the evidence. A perfect comparison against a stale local
server proves the wrong build.

### Browser identity record

```text
scenario: account-settings/default
target_revision: <revision>
target_build: <build-id>
route: /settings/account
fixture: seeded-user-basic-v3
viewport_css_px: 1440x1000
device_scale_factor: 1
zoom: 100%
theme: light
locale: ko-KR
fonts_ready: yes
async_settle: network idle plus avatar rendered
capture: <durable-path>
```

### Terminal identity record

```text
scenario: task-list/long-cjk
target_revision: <revision>
command: <repository-approved-command>
fixture: mixed-width-tasks-v2
terminal: 100 columns x 32 rows
terminal_app: <name-and-version>
font: <name-and-size>
color_mode: 256-color
locale: ko_KR.UTF-8
capture: <durable-path>
```

## Capture normalization

Normalize only environmental noise. Never normalize away product behavior.

- Use the same content fixture, authentication state, and permissions.
- Match CSS viewport dimensions, not merely the screenshot bitmap dimensions.
- Match device scale factor and browser zoom independently.
- Wait for declared fonts and deterministic images to load.
- Freeze clocks, rotating banners, random IDs, and cursors when the product test
  harness supports deterministic fixtures.
- Use the same scrollbar policy; a visible scrollbar changes available width.
- Match terminal rows, columns, font, and ambiguous-width policy.
- Preserve loading or animation frames when those frames are the subject.

Do not resize a reference bitmap until it happens to overlay the target. That
hides geometry differences and creates interpolation noise.

## Compare from coarse to fine

Review in this order so local pixel noise does not distract from structural bugs.

### 1. State and content equivalence

Confirm both sides show the same product state, records, validation status,
expanded regions, focus target, and scroll position. A closed menu cannot be
compared with an open menu.

### 2. Global silhouette

Compare page regions, terminal panels, main whitespace masses, dominant edges,
and hierarchy. Ask whether a user would scan the surfaces in the same order.

### 3. Geometry

Measure container width, gutters, grid tracks, panel ratios, major offsets,
sticky boundaries, dialog bounds, and terminal column starts. Report measurements
in the coordinate system that controls the layout: CSS pixels or terminal cells.

### 4. Typography and wrapping

Compare font family, resolved fallback, weight, size, line height, letter spacing,
baseline, wrapping points, truncation, and text density. Font substitution can
create widespread differences without a component regression; record it rather
than silently accepting it.

### 5. Components and decoration

Inspect control sizes, icon optical alignment, borders, radii, shadows, dividers,
surface colors, image crops, and focus indicators. Confirm hit areas separately
from visible icon bounds.

### 6. Temporal behavior

Compare the trigger, intermediate frames, settled state, interruption behavior,
and reduced-motion outcome. A matching final frame does not excuse a disruptive
layout jump during the transition.

## Pixel metrics: what they can prove

A pixel comparison can locate and quantify raster differences under controlled
conditions. Useful measurements include:

- differing-pixel count and percentage;
- absolute channel-difference sum or mean;
- maximum per-channel difference;
- bounding boxes of connected difference regions;
- hotspot area, position, and repeated pattern;
- per-region measurements for header, content, dialog, or footer;
- alpha-only, RGB-only, and composite-on-background differences.

Record the metric definition and threshold. “Similarity 98%” is uninterpretable
without the comparison space, alpha treatment, tolerance, and image dimensions.

## Pixel metrics: what they cannot prove

Pixel metrics do not establish:

- that the correct route, build, fixture, or state was captured;
- that keyboard focus, labels, hit targets, or screen-reader semantics work;
- that responsive reflow works outside the captured width;
- that an animated transition is stable between sampled frames;
- that a pasted reference image is not covering a broken implementation;
- that text is selectable, controls are interactive, or data is live;
- that a visually small difference has low user impact;
- that a large difference is a regression rather than an approved redesign.

Use metrics to direct inspection, then classify the product consequence.

## Hotspot analysis

Prefer localized regions over one page-wide percentage.

1. Produce a difference image without altering either input.
2. Group adjacent differences into meaningful regions.
3. Map each region to a product element or environmental cause.
4. Inspect high-impact regions first: primary actions, errors, focus, navigation,
   critical values, and clipping boundaries.
5. Separate repeated font antialiasing noise from coherent layout displacement.
6. Record regions intentionally excluded and the reason for each exclusion.

A thin full-height hotspot often indicates a width or scrollbar mismatch. Repeated
halos around every glyph often indicate font rasterization. A solid displaced
rectangle usually deserves layout investigation even if its total area is small.

## Alpha and transparency

Transparent pixels can make comparisons misleading.

- Compare raw alpha and color channels when source assets are under review.
- Also composite both images over the same declared background.
- Reject RGB differences in fully transparent pixels as visible-product evidence.
- Inspect premultiplied-alpha and edge-fringe behavior after compositing.
- Test translucent overlays against each supported surface or theme.
- Do not compare a transparent design export directly with an opaque browser
  screenshot and call the result a product mismatch.

Record whether the metric used straight alpha, premultiplied alpha, ignored alpha,
or composited output.

## Terminal cell comparison

For a TUI, pixels are secondary to terminal-cell geometry.

- Record rows and columns, not only bitmap dimensions.
- Measure string display width, not code-point count or byte length.
- Exercise ASCII, Hangul, CJK ideographs, emoji, combining marks, and variation
  selectors present in supported user content.
- Confirm borders join at the same cell positions after mixed-width text.
- Inspect truncation markers and preserved access to critical values.
- Repeat at narrow and short boundaries to expose stale cells and clipped controls.
- Check color-off mode so hierarchy is not encoded only by color.

If renderers disagree on ambiguous-width characters, record the terminal and font
environment. Do not hide the disagreement by editing the fixture after capture.

## Motion comparison

Define temporal checkpoints relative to an event:

```text
t0: immediately before activation
t1: first rendered response
t2: midpoint or maximum displacement
t3: settled visual state
t4: state after interruption or repeated activation
```

Capture the same checkpoints for reference and target. Compare duration, easing,
opacity, transform, layout shift, focus movement, input availability, and reduced-
motion behavior. If clocks cannot be synchronized, describe the sampling error.

## Difference classification

Classify every material hotspot:

- `REGRESSION`: target violates the accepted product contract;
- `INTENTIONAL`: approved design or system adaptation with a recorded reason;
- `ENVIRONMENT`: font, renderer, platform, or capture variance;
- `REFERENCE DEFECT`: authoritative input is stale, inconsistent, or impossible;
- `INCOMPARABLE`: required identity or geometry does not match;
- `UNRESOLVED`: evidence is insufficient and more capture is required.

Severity follows user impact, not pixel area. A one-pixel focus indicator removal
may be major; a large approved background change may be informational.

## Evidence table

```markdown
| Region | Metric or observation | Classification | Severity | Evidence |
| --- | --- | --- | --- | --- |
| primary action | 6 CSS px lower than reference | REGRESSION | MINOR | <path> |
| all body text | repeated glyph-edge noise | ENVIRONMENT | NOTE | <path> |
| modal focus | indicator absent after open | REGRESSION | MAJOR | <path> |
```

Include the original pair, difference visualization if used, scenario metadata,
measurement method, and reproduction steps. Never retain only the diff image.

## Stop conditions

Stop and return `BLOCKED` or `NOT LIKE-FOR-LIKE` when:

- target or reference identity cannot be established;
- the final build cannot be launched or distinguished from stale output;
- required fonts, assets, fixtures, or product state are unavailable;
- viewport, zoom, scale, terminal geometry, or locale cannot be matched;
- only a flattened screenshot is available for a functional claim;
- capture tooling changes the state being measured;
- a motion claim has only one cherry-picked frame.

Do not compensate for missing proof by lowering a threshold.

## Completion checklist

- [ ] Both inputs have immutable or reproducible identities.
- [ ] Capture metadata proves like-for-like conditions.
- [ ] State and content equivalence were checked before pixels.
- [ ] Structural, typographic, component, and temporal passes were completed.
- [ ] Pixel metrics state their comparison space and alpha treatment.
- [ ] Hotspots map to product elements and user impact.
- [ ] TUI review uses cell width with mixed-width content where relevant.
- [ ] Intentional and environmental differences have explicit reasons.
- [ ] Every must-fix finding names scenario, reproduction, and evidence.
- [ ] Superseded captures are excluded from the final evidence set.
