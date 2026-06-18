# General Website Standards

This document defines the baseline standards for website and frontend work in this repository. It is intentionally generic and should apply to most website surfaces regardless of framework or stack.

## Usage

Anyone changing website UI, frontend state, styling, interaction flows, or frontend tests **MUST** review this standard before implementation or review.

## Quick Rules

- Build UI from reusable components and clear layers, not page-specific one-offs.
- Keep data access centralized and stateful; do not scatter ad hoc network calls through rendering code.
- Preserve canonical domain or API models as the source of truth when they exist.
- Reuse shared patterns, controls, and tokens before inventing new local variants.
- Represent loading, empty, error, and success states explicitly for data-backed surfaces.
- Ship accessible semantics, keyboard support, visible focus, and adequate contrast by default.
- Design mobile-first and verify small, medium, and large viewports.
- Treat performance, resilience, localization, and observability as product requirements.
- Prove behavior with the smallest useful mix of automated and manual verification.

## Review Checklist

Before approval, reviewers **SHOULD** confirm:

- The change respects architecture and dependency boundaries.
- Data flow and ownership are clear.
- Shared UI patterns are reused where appropriate.
- Loading, empty, error, and success states are intentional.
- Accessibility, responsive behavior, localization, and browser support were considered.
- Test evidence matches the risk and user impact of the change.

## Regulations

### 1. Architecture and State

Website code **MUST** have clear structure and ownership.

Rules:

- Keep rendering, data access, state management, and pure logic separated where complexity warrants it.
- Shared UI primitives **MUST NOT** depend on feature-specific behavior.
- Feature-specific behavior **SHOULD** stay close to its owning feature.
- Network transport, parsing, and server contract handling **MUST NOT** live inline in rendering code.
- When a canonical domain or API model exists, editable state **SHOULD** preserve it.
- UI-library state, visual layout state, and presentation-specific shapes **SHOULD** be treated as projections, not the durable source of truth.
- Complex interactive surfaces **SHOULD** expose clear operations for actions such as add, remove, connect, reorder, validate, and save.

### 2. Components and Interaction

UI **MUST** be composed from reusable components with explicit contracts.

Rules:

- Components **MUST** have clear responsibilities and typed or otherwise explicit interfaces.
- Parent layers **SHOULD** own orchestration and data preparation; child components **SHOULD** render one understandable piece of UI.
- Components **SHOULD NOT** contain dense transformation logic that belongs in helpers, selectors, or hooks.
- Components **MUST** rely instead on styled equivalents of react components like selectors, inputs, such as via shadcn equivalents, and must not use react components directly.
- Interactive components **MUST** handle disabled, loading, and error-friendly states where relevant.
- Dense or repeated surfaces **SHOULD** favor concise actions and clear hierarchy over instructional clutter.
- Reuse existing shared controls before creating new variants.

Required states for data-backed UI:

- loading
- empty
- error
- success

Add partial, stale, permission-denied, or destructive-confirmation states when the behavior requires them.

### 3. Styling and Visual Consistency

Styling **MUST** follow a shared design direction.

Rules:

- Use shared tokens, scales, and patterns for color, spacing, typography, radius, elevation, and motion.
- Avoid one-off visual values when a shared token or established pattern expresses the same intent.
- Keep visual language consistent within the same product area.
- Prefer reusable primitives or variants over copied style clusters.
- Responsive behavior **MUST** use the project’s standard breakpoint system.

### 4. Accessibility

Accessibility is required behavior.

Rules:

- Use semantic HTML and native controls where possible.
- Every interactive element **MUST** be keyboard reachable and operable.
- Focus indicators **MUST** remain visible.
- Forms **MUST** provide labels, validation messaging, and correct programmatic relationships.
- Color **MUST NOT** be the only means of conveying meaning or state.
- Common patterns such as dialogs, menus, tables, disclosures, and drag interactions **MUST** follow expected accessibility behavior.
- Changes **MUST** target WCAG 2.2 AA behavior unless stricter requirements are documented elsewhere.

### 5. Responsive Design

Every website surface **MUST** work across supported viewport sizes.

Rules:

- Start from the smallest supported viewport and scale upward.
- Avoid unintended horizontal scrolling.
- Dense layouts, sticky panels, split views, and visualizations **MUST** degrade gracefully on narrow screens.
- Text and controls **MUST** remain readable and usable without special handling by the user.

### 6. Performance and Resilience

Website surfaces **MUST** remain usable under realistic load and failure conditions.

Rules:

- Avoid blocking initial render on non-critical data when progressive disclosure is possible.
- Move expensive work out of hot render paths when measurement or clear evidence shows it matters.
- Use virtualization, aggregation, or progressive rendering when scale demands it.
- Polling, realtime, or long-lived views **MUST** define refresh, teardown, and failure behavior explicitly.
- The UI **SHOULD** remain usable under slow or intermittent network conditions.
- Failures **SHOULD** degrade gracefully when partial functionality is preferable to full-surface failure.

### 7. Browser Compatibility and Progressive Enhancement

Critical flows **MUST** work across supported browsers.

Rules:

- Supported browsers **MUST** be defined for the product surface.
- High-risk or high-value changes **MUST** be verified on relevant supported browsers.
- Features that depend on newer browser capabilities **MUST** provide fallback behavior or graceful degradation when practical.

### 8. Localization

User-facing UI **MUST** be localizable without structural rewrites.

Rules:

- Product copy **MUST NOT** be buried inside reusable components or scattered unpredictably through the UI.
- Translation keys or message identifiers **MUST** be stable, descriptive, and organized by feature or domain.
- Dates, times, numbers, currencies, and similar locale-sensitive values **MUST** use locale-aware formatting.
- Validation, empty states, dialogs, toasts, and accessibility labels **MUST** be included in localization scope.
- Fallback locale behavior **MUST** be explicit.

### 9. Testing and Diagnostics

Frontend changes **MUST** include evidence at the right layer and remain diagnosable in production-like environments.

Rules:

- Test the behavior at the lowest layer that proves it clearly, then add broader coverage for high-risk user journeys.
- Pure logic **SHOULD** be tested directly.
- Rendered behavior **SHOULD** be tested through component or feature-level tests.
- End-to-end or integration tests **SHOULD** focus on critical flows, regressions, and cross-layer seams.
- Complex interactive surfaces **SHOULD** test both their underlying operations and their user-visible behavior.
- User-facing failures **SHOULD** provide actionable feedback where possible.
- Diagnostics **MUST NOT** leak secrets or sensitive data.

## Delivery Checklist

Before merge, authors **SHOULD** confirm:

- Architecture, state ownership, and dependencies are clear.
- Shared UI patterns are reused where practical.
- Required UI states exist for data-backed surfaces.
- Accessibility and responsive behavior were verified.
- Browser support, localization, and failure behavior were considered where relevant.
- Test evidence matches the risk of the change.
