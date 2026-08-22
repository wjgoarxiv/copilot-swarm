---
name: csw-frontend
description: Design and implement polished, accessible interfaces through design-system audit, task-centered hierarchy, complete interaction states, responsive behavior, and fresh visual evidence.
---

# Frontend UI and UX

Use this skill for application screens, pages, components, dashboards, flows, and interactive
prototypes. A successful frontend change makes the primary task clearer, preserves the product's
language, works across states and viewports, and is verified on the rendered surface.

## Copilot CLI compatibility

- Inspect the repository and installed application before proposing a visual system.
- Use the host browser, screenshot, image-inspection, and terminal tools only through their
  documented permission and setup surfaces.
- Use host `task` workers only for independent analysis. Read-only workers require host-enforced
  non-mutating tools; writers require isolated worktrees.
- Run `csw-visual-qa` after changing a visible surface.
- This skill does not authorize deployment, analytics changes, external asset upload, or global
  tool installation.

## Required references

- [Design system audit](references/design-system-audit.md)
- [Accessibility and responsive behavior](references/accessibility-and-responsive.md)
- [Visual delivery checklist](references/visual-delivery-checklist.md)

## Intake contract

Before implementation, identify:

- primary user and task;
- entry point and desired completion state;
- existing product language and authoritative reference;
- supported routes, viewports, themes, locales, and input modes;
- required loading, empty, error, disabled, partial, and success states;
- accessibility and performance constraints;
- what must not be redesigned.

If visual direction materially changes branding or information architecture, present the decision
before coding. Do not hide a redesign inside a component request.

## Design system audit

Inspect live source and rendered output for:

- framework and routing;
- component library and primitives;
- tokens for color, type, spacing, radius, border, shadow, and motion;
- layout containers and breakpoints;
- form, table, dialog, navigation, feedback, and icon patterns;
- focus, validation, disabled, skeleton, and empty states;
- localization and CJK behavior;
- dark/high-contrast themes;
- accessibility utilities and tests.

Record the result using [Design system audit](references/design-system-audit.md). Reuse an existing
primitive unless it cannot express the required behavior. A new primitive needs a named contract,
states, accessibility behavior, and at least two credible consumers.

## Information hierarchy

Design from user decisions rather than containers:

1. Name the primary action or question.
2. Rank information required before that action.
3. Group secondary and exceptional controls.
4. Decide what is initially visible, progressively disclosed, or moved to another step.
5. Ensure heading, landmark, focus, and DOM order match the visual hierarchy.

Do not distribute emphasis evenly. One screen should not contain five competing primary actions.

## Flow model

Map the interaction:

| Stage | User intent | Required information | Action | Feedback | Recovery |
| --- | --- | --- | --- | --- | --- |
| Entry | | | | | |
| Work | | | | | |
| Submit | | | | | |
| Success | | | | | |
| Failure | | | | | |

Preserve browser navigation, deep links, refresh, repeated submission, and interrupted flows when
the product supports them.

## Interaction states

For each interactive unit, define applicable states:

- idle, hover, focus-visible, active;
- disabled with an understandable reason;
- loading and cancellation;
- empty and first-use guidance;
- validation and dependency error;
- partial or stale data;
- optimistic, pending, success, and rollback;
- read-only and unauthorized;
- offline or reconnecting when applicable.

Avoid controls that move, disappear, or change meaning without preserving context and focus.

## Responsive model

Specify behavior at narrow, medium, and wide widths. Decide whether content wraps, stacks, scrolls,
collapses, becomes a dialog/drawer, or changes density. Do not simply shrink desktop dimensions.

Test realistic long labels, translated content, large numbers, empty cells, many rows, and CJK text.
See [Accessibility and responsive behavior](references/accessibility-and-responsive.md).

## Accessibility

- Use semantic elements and landmarks before adding roles.
- Give every control an accessible name and visible or programmatically associated label.
- Preserve logical DOM and focus order.
- Make keyboard operation complete, including escape and focus restoration for overlays.
- Expose validation, loading, status, and error messages without unexpected interruption.
- Do not encode meaning by color, position, or icon alone.
- Respect reduced motion, zoom, text scaling, contrast, and target size.
- Keep destructive and irreversible actions distinguishable and confirmable.

Automated checks are necessary but cannot replace keyboard and screen-reader-oriented inspection.

## Visual system

### Typography

Use the established family and scale. Create hierarchy through size, weight, line height, measure,
and spacing—not arbitrary font variation. Verify numerals, code, long tokens, and CJK glyphs.

### Color

Use semantic tokens. Verify contrast in every state and theme. Reserve strong accent colors for
priority or status and do not create a rainbow of unrelated categories.

### Spacing and composition

Align to the existing rhythm. Prefer a small number of clear groups over decorative containers.
Use whitespace to show ownership and sequence. Avoid cards nested inside cards without a semantic
reason.

### Motion

Use motion to explain continuity, state, or causality. Keep it interruptible and provide reduced
motion behavior. A static screenshot cannot prove a sequence; capture the interaction.

### Visual detail

Keep borders, radius, shadows, icons, and illustrations consistent with the product. Avoid generic
gradient-heavy hero blocks, indiscriminate pills, decorative badges, and icon-only mystery actions.

## Content and data stress

Verify:

- minimum, typical, and maximum content;
- long unbroken values and translated labels;
- missing images and optional fields;
- zero, one, and many items;
- slow, stale, partial, and failed data;
- destructive permissions and unauthorized state;
- user-generated content and safe rendering.

Do not design only against ideal placeholder copy.

## Implementation loop

1. Pin current rendered behavior and tests.
2. Implement semantic structure and data flow.
3. Add interaction, validation, and error behavior.
4. Apply tokens and responsive layout.
5. Verify keyboard and accessibility semantics.
6. Capture fresh narrow and wide evidence.
7. Exercise loading, empty, error, and long-content states.
8. Run `csw-visual-qa` and fix every blocking verdict.

## Reference fidelity

Use a reference only when it is authoritative, current, and comparable to the same route/state.
Match hierarchy, spacing, typography, color, component behavior, and interaction—not just pixel
position. Document intentional differences caused by content, platform, or accessibility.

## Completion evidence

Run repository tests, typecheck, lint, and build. Capture the real interface at named viewports and
states, exercise keyboard navigation, verify at least one error or empty state, and record evidence
paths. Follow [Visual delivery checklist](references/visual-delivery-checklist.md). Report remaining
accessibility, browser, data, or reference-fidelity limitations honestly.
