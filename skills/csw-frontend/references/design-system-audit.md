# Design system audit

## Repository surfaces

Record framework, router, styling method, component library, icon set, token sources, themes,
localization, accessibility utilities, story/demo surfaces, tests, and build commands.

## Token inventory

| Domain | Source | Naming pattern | Used by target | Gap |
| --- | --- | --- | --- | --- |
| color | | | | |
| typography | | | | |
| spacing | | | | |
| radius/border | | | | |
| shadow | | | | |
| motion | | | | |
| breakpoint | | | | |

Do not copy raw values when a semantic token exists. If a needed semantic role is missing, define
the role and consumers before adding a token.

## Primitive inventory

Inspect button, link, input, select, checkbox, radio, field, form error, dialog, menu, tooltip,
table, pagination, tabs, navigation, toast/status, skeleton, empty state, and icon patterns.

For each relevant primitive, record variants, states, keyboard behavior, focus treatment, content
limits, and whether the rendered implementation matches its documented contract.

## Layout inventory

- page container and maximum width;
- grid or flex conventions;
- header, navigation, sidebar, and content relationships;
- fixed/sticky elements;
- safe areas and scroll ownership;
- breakpoints and density changes;
- overlay and portal roots.

## Existing product language

Capture representative routes at the same theme and viewport. Note recurring hierarchy, density,
alignment, typography, color, actions, feedback, and illustration style. Prefer installed/live
evidence over a source-only inference.

## New primitive decision

Create a new primitive only if:

- no existing unit expresses the behavior without misuse;
- the behavior has a stable name and responsibility;
- states and accessibility are defined;
- styling comes from existing tokens;
- at least two realistic consumers exist or it is an explicit public-system addition;
- visual and interaction tests are planned.

Otherwise compose or extend an existing primitive within its owned contract.

## Audit output

```text
Target route/component:
Primary user task:
Authoritative references:
Reusable primitives:
Missing states:
Token gaps:
Accessibility gaps:
Responsive gaps:
New primitive decision:
Verification commands:
Capture paths:
```

## Anti-patterns

- inventing tokens inside a feature stylesheet;
- copying a screenshot without understanding interaction;
- replacing a product pattern with a fashionable generic template;
- creating a universal component for one screen;
- documenting source conventions without opening the rendered application;
- treating a component-library demo as proof of product integration.

## Audit checklist

- [ ] Live target inspected.
- [ ] Tokens and primitives traced to source.
- [ ] Interaction states inventoried.
- [ ] Accessibility behavior recorded.
- [ ] Responsive behavior recorded.
- [ ] Reuse/new decision justified.
- [ ] Evidence paths retained.
