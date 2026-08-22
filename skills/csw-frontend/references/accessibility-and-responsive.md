# Accessibility and responsive behavior

## Semantic pass

- Use one logical heading hierarchy.
- Use landmarks for major page regions.
- Use buttons for actions and links for navigation.
- Associate labels, descriptions, and errors with fields.
- Keep tables semantic when data relationships are tabular.
- Use roles only when native elements cannot express the contract.

## Keyboard pass

Exercise the complete flow without a pointer:

- initial focus and skip path;
- tab and reverse-tab order;
- activation and selection keys;
- arrow-key patterns where appropriate;
- escape and cancellation;
- focus trap and restoration for overlays;
- disabled/read-only behavior;
- focus visibility in every theme.

Record the sequence and any focus loss. A visible outline alone does not prove correct keyboard
behavior.

## Status and errors

Loading, validation, asynchronous success, and dependency errors must be exposed at the right
urgency. Avoid moving focus for routine updates. Preserve entered data after recoverable failure
and offer a concrete next action.

## Responsive matrix

| State | Narrow | Medium | Wide |
| --- | --- | --- | --- |
| navigation | | | |
| primary action | | | |
| long content | | | |
| table/list | | | |
| dialog/drawer | | | |
| error/empty | | | |

Test actual dimensions and record them. Include zoom or text scaling where the product requires it.

## Content stress

Use:

- long translated labels;
- CJK text without spaces;
- long URLs and identifiers;
- large and negative numbers;
- missing optional content;
- one and many repeated items;
- validation messages spanning multiple lines;
- images with unexpected aspect ratio or failure.

Verify wrapping, truncation affordance, overflow, tooltip accessibility, alignment, and scroll
ownership. Do not hide essential content behind hover-only disclosure.

## Contrast and non-color cues

Check text, icons, borders, focus, disabled states, charts, and selected state in every supported
theme. Pair color with label, shape, pattern, or icon meaning that is also accessible.

## Motion and reduced motion

Motion must explain state or continuity, remain interruptible, and not block interaction. Under
reduced motion, replace large movement with instant or subtle state change while preserving
understanding.

## Touch and pointer

Verify target size, spacing, hover-independent access, drag alternatives, pointer cancellation,
and behavior under coarse input. Do not make swipe the only way to complete an action.

## Accessibility evidence

```text
Route/state:
Viewport/zoom/theme:
Keyboard sequence:
Focus result:
Semantic/accessibility observation:
Error or status observation:
Long-content result:
Capture path:
Remaining limitation:
```

## Checklist

- [ ] Semantic hierarchy correct.
- [ ] Full keyboard flow passes.
- [ ] Focus restoration passes.
- [ ] Errors and statuses exposed.
- [ ] Narrow/medium/wide layouts pass.
- [ ] Long and CJK content pass.
- [ ] Contrast and non-color cues pass.
- [ ] Reduced motion passes.
