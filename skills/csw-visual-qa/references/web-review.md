# Web visual review

Review the rendered product in two passes: system integrity first, precision and
reference fidelity second. Fixing small pixels before hierarchy and flow wastes
effort and can preserve the wrong structure.

## Pass 1: task hierarchy

Start at the first viewport without interacting.

- Can a new user identify the screen purpose and primary action?
- Does the reading order match the task order?
- Are page title, section headings, labels, helper text, and actions visually
  distinct without excessive decoration?
- Are destructive and secondary actions appropriately subdued?
- Does the default state show enough context to proceed?

Then walk the primary task. Verify that confirmation, error, and next-step feedback
appear near the action they explain.

## Pass 2: layout system

Inspect:

- maximum content width and page gutters;
- grid alignment across header, content, sidebars, and footers;
- consistent spacing increments inside and between components;
- intentional density for forms, tables, cards, and navigation;
- sticky and fixed regions that do not cover reachable content;
- stable layout while fonts, images, and data load.

At narrow viewports, confirm the layout reflows according to priority. A desktop
grid squeezed into a tiny width is not responsive even if nothing technically
overflows.

## Component consistency

Compare visible controls with the product's existing shared components and tokens:

- button hierarchy and size;
- input, select, checkbox, radio, and switch states;
- card, table, list, badge, alert, tooltip, menu, and dialog variants;
- radius, border, shadow, color, and typography roles;
- icon family, optical size, stroke, and alignment;
- disabled, busy, selected, invalid, and destructive styling.

Flag one-off styling when a shared component already expresses the same role.
Preserve intentional special components when their distinct role is clear.

## Responsive review

Capture just below and above meaningful breakpoints. Check:

- navigation transformation and reachability;
- column collapse order;
- tables, charts, code, and long values;
- dialogs and menus within viewport bounds;
- touch target spacing;
- fixed actions above browser chrome or safe areas;
- no accidental horizontal scrolling;
- content remains readable without pinch zoom.

For hidden content, confirm it is deliberately moved or summarized and remains
accessible through an obvious control.

## Content stress

Exercise long content, missing content, and many rows. Look for:

- clipped labels without a way to reveal the full value;
- uncontrolled height growth or overlapping controls;
- broken word wrapping and unbounded identifiers;
- image aspect-ratio distortion and empty-image artifacts;
- pagination or scroll controls detached from their data;
- empty state that leaves the user without a next action;
- error messages that push important controls offscreen.

Use realistic user-facing content rather than repeated placeholder text.

## Keyboard and focus

Complete the primary path without a pointer.

1. start from the address or initial focus position;
2. traverse interactive elements in logical visual order;
3. confirm every active element has a visible focus indication;
4. open and close menus, dialogs, and drawers;
5. confirm focus is trapped only when appropriate and restored to the trigger;
6. activate the primary action and recover from a validation error;
7. confirm hidden or disabled controls do not receive focus.

Capture representative focus states. A DOM inspection alone does not prove visible
focus or sensible order.

## Accessibility visual checks

Inspect high-risk perceptual behavior:

- text and control contrast in every state;
- status not communicated by color alone;
- focus ring not clipped or hidden by overlays;
- form error and helper text visibly associated with the relevant field;
- labels remain visible when placeholders disappear;
- large text or zoom does not overlap or hide content;
- motion can be reduced where the product promises reduced-motion support;
- icon-only controls have a visible or programmatically discoverable name.

Automated accessibility output is useful evidence, but it does not replace keyboard
and visual inspection.

## Loading, empty, error, and success

Review all implemented states at the same dimensions as the primary path.

### Loading

- retained layout reduces shift;
- progress indication is perceivable;
- stale actions cannot fire incorrectly;
- focus does not disappear;
- slow loading remains understandable.

### Empty state

- absence is explained in product language;
- the next useful action is visible;
- layout does not look broken or unfinished;
- filters and permissions are distinguished from truly empty data.

### Error

- the message is specific enough to act on;
- recovery is visible and keyboard reachable;
- existing user input is preserved when safe;
- repeated retry does not duplicate content or overlays.

### Success

- feedback is timely and perceivable;
- the resulting data or next location is clear;
- temporary messages do not steal focus or cover primary controls;
- repeat submission is prevented when required.

## Motion review

Capture initial, intermediate, and final frames for changed transitions. Verify:

- duration and easing fit the product system;
- movement clarifies spatial or state change;
- repeated activation does not stack animations;
- interruption leaves a valid stable state;
- reduced-motion behavior removes nonessential movement;
- loading and route transitions avoid flashes and major layout shifts;
- focus ends on the correct target.

Do not judge motion from a single screenshot.

## Reference comparison

Only compare captures with matching state, content, dimensions, scale, theme, and
font environment. Review in this order:

1. silhouette and hierarchy;
2. major geometry and density;
3. typography and wrapping;
4. color and elevation;
5. component and icon precision;
6. small alignment and rendering artifacts.

Explain every material difference. It may be a defect, an approved product-system
adaptation, an environmental variance, or an incomparable reference.

## Findings

Each finding states:

```text
Severity:
Matrix scenario:
Evidence path:
Observed:
Expected:
User impact:
Reproduction:
Suggested correction boundary:
```

Prefer measurable descriptions: “the error action is outside the 390 px viewport”
is actionable; “the layout feels strange” is not.
