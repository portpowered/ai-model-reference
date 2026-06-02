# High-Quality ML Documentation Website Checklist

## Notes: 
- this document is the intended baseline by which we structure the website. 
- the website must enforce quality using GATES like CI, or Linters, and we generally check of items off the checklist when things are generally constrained by the checklist, or have well defined checklists + templates off which we can govern the system. (Mechanisms + processes). We preference mechanisms generally when possible, but recognize when its not.

## Website fundamentals

### Operational

* Website deploys automatically via GitHub Actions.
* Website has CI checks on every pull request and merge.
* Merges to `main` are blocked unless CI passes.
* Deployments are reproducible from source control.
* Production deploys are versioned and traceable to a commit SHA.
* Rollbacks are supported and documented.
* Preview deployments are generated for pull requests.
* Deployment status is visible in GitHub checks.
* Environment variables and secrets are managed securely through the CI/CD provider.
* The build has deterministic install behavior through a lockfile.
* The website has a documented release process.
* The website has a documented incident rollback process.

## Testing

* Components are tested.
* Render integration tests confirm the website loads and core pages work.
* Lighthouse or equivalent performance tests are included.
* Storybook is used for visual testing and component review.
* Critical docs pages have smoke tests.
* Navigation, search, code blocks, graphs, math rendering, and MDX rendering are tested.
* Accessibility tests are included in CI.
* Broken link checks are included in CI.
* Visual regression tests exist for key pages and reusable components.
* Tests cover loading, empty, error, and success states.
* Test data is deterministic and does not depend on unstable external services.
* CI runs type checking, linting, unit tests, integration tests, and build validation.

## System structure

* Application state uses a clear state manager where needed, such as Zustand.
* Website pages are separate from reusable components.
* Domain-specific components are separate from generic UI components.
* Styles are primarily defined through Tailwind utilities and design tokens.
* Design tokens are defined for colors, spacing, typography, radius, shadows, breakpoints, and z-index.
* Tokens are used consistently across the website.
* Components avoid hard-coded numbers for padding, font sizes, colors, and layout values unless intentionally local.
* Shared logic is extracted into hooks, utilities, or view models.
* Rendering logic is separated from data transformation logic.
* The docs system has clear boundaries between content, rendering, navigation, search, and layout.
* ML-specific rendering, such as graphs and model diagrams, is isolated into dedicated components.

## Component quality

* Components support loading, empty, failed, and success states.
* Components expose variants in a controlled way, similar to shadcn/ui.
* Components avoid one-off styling unless the exception is documented.
* Components are tested across relevant variants, sizes, and states.
* Components support keyboard navigation where interactive.
* Components expose accessible labels and semantic HTML.
* Components are responsive by default.
* Components avoid hidden side effects.
* Components have stable props and documented usage examples.
* Components are composable instead of overly specialized.
* Components avoid directly fetching data unless they are explicitly data-bound components.
* Components are documented in Storybook or equivalent examples.

## Viewports

* The website renders correctly on mobile, tablet, laptop, desktop, and wide-screen layouts.
* Navigation works on small screens.
* Tables, code blocks, diagrams, and graphs remain usable on small screens.
* Large ML diagrams have pan, zoom, fit-to-screen, and reset controls.
* Content does not overflow horizontally unless intentionally scrollable.
* Touch interactions are supported for mobile and tablet.
* Hover-only interactions have keyboard and touch alternatives.
* Font sizes and line heights remain readable across viewport sizes.

## Package structure

Recommended structure:

```txt
src/
  app/                 # app shell, providers, routing entrypoints
  pages/               # route-level pages
  layouts/             # predefined page layouts
  components/          # shared UI components
  features/
    docs/              # docs-specific rendering, navigation, search
    models/            # ML model viewers, graph viewers, module diagrams
    state/             # feature-level state
    hooks/             # feature-level hooks
    messages/          # localized strings
  content/             # MDX docs content
  tokens/              # design tokens
  lib/                 # framework-agnostic utilities
  tests/               # shared test utilities
```

* Components are grouped by responsibility, not only by visual type.
* Feature-specific components live inside the feature.
* Generic reusable components live in `components`.
* Feature state lives in `features/<feature>/state`.
* Feature hooks live in `features/<feature>/hooks`.
* Localized strings live in `features/<feature>/messages` or a global i18n layer.
* Public APIs between packages are explicit.
* Internal modules are not imported across boundaries without a clear reason.
* Package exports are controlled through `package.json` exports where applicable.

## Pages

* Pages primarily compose layouts and components.
* Pages avoid containing complex business logic.
* Pages are constrained to a predefined set of layouts.
* Static documentation pages are generated from MDX.
* Each page has clear metadata: title, description, canonical URL, and Open Graph metadata.
* Each page has a clear heading hierarchy.
* Each page supports deep links for important sections.
* Docs pages support previous/next navigation where useful.
* Docs pages support table of contents navigation.
* Pages degrade gracefully when optional enhanced components fail.
* Pages are optimized for search indexing where public docs are intended to be discoverable.

## Accessibility

* WCAG checks are included in CI.
* Components use semantic HTML whenever possible.
* Interactive components support keyboard navigation.
* Focus states are visible.
* Color contrast meets WCAG requirements.
* Images, diagrams, and graphs have accessible labels or text alternatives.
* Code blocks are readable by assistive technology.
* Navigation landmarks are present.
* ARIA is used only when semantic HTML is insufficient.
* Motion effects respect reduced-motion preferences.
* Forms and search inputs have labels and accessible error messages.
* Graph and model viewers provide a non-visual summary of the diagram.

## Localization

* Users can choose content localization where supported.
* Times, dates, and numbers are localized to the reader’s region.
* Locale is reflected in routing or user preference.
* Fallback language behavior is defined.
* Missing translations are detectable in CI or during build.
* Localized pages preserve canonical metadata and alternate-language links.
* Search supports localized content where applicable.
* Technical terms have a glossary or consistent translation policy.

## Quality

* Biome is used for linting and formatting.
* TypeScript strict mode is enabled.
* CI enforces type checking.
* CI enforces linting.
* CI enforces formatting.
* CI enforces build success.
* Code coverage thresholds are defined.
* Critical rendering paths should have strong coverage.
* Avoid mandating 100% coverage globally unless the team is willing to maintain it; prefer high coverage thresholds plus required coverage for critical utilities, rendering, and state logic.
* Dead code is detected and removed.
* Dependency updates are managed intentionally.
* Security scans are run for dependencies.
* Bundle size is tracked.
* Performance budgets are defined.
* Broken links are checked.
* Markdown and MDX content are linted.
* Public-facing docs are reviewed for grammar, clarity, and technical accuracy.

## Build systems

* Bun is used for package installation, build runtime, and testing.
* The root Makefile exposes standard commands.
* Commands are consistent locally and in CI.

Required commands:

```makefile
make ci        # run all CI checks
make test      # run tests
make build     # build the website
make lint      # run lint checks
make format    # format code
make typecheck # run TypeScript checks
make clean     # remove generated artifacts
```

* `make ci` should run linting, formatting checks, type checking, tests, build validation, accessibility checks, and link checks.
* Build output is deterministic.
* Generated files are either committed intentionally or excluded consistently.
* CI caching is configured for Bun dependencies and build artifacts where appropriate.

# Website-specific decisions

## Technology decisions

* The website is primarily static.
* The router is selected intentionally, such as Next.js routing, React Router, or the routing provided by the docs framework.
* Fumadocs is used for documentation rendering if it fits the desired docs architecture.
* Docs are authored in MDX.
* shadcn/ui is used as the base component system.
* Magic UI may be used for polished marketing or visual components, but core docs components should remain accessible, stable, and lightweight.
* Tailwind is used for styling.
* React Flow is used for model and module graph rendering.
* Math rendering is supported through a standard math/LaTeX renderer.
* Search is implemented with a suitable static or hosted search system.
* PDF export is supported for selected docs pages or doc sets.

## Documentation features

* Supports documentation search.
* Supports export to PDF.
* Supports in-page navigation.
* Supports cross-file navigation.
* Supports previous/next navigation.
* Supports versioned documentation.
* Supports changelog or release-note pages.
* Supports rendering graphs for ML models, modules, and pipelines.
* Supports math equations.
* Supports syntax-highlighted code blocks.
* Supports copy buttons for code snippets.
* Supports callouts such as notes, warnings, tips, and limitations.
* Supports diagrams and architecture visuals.
* Supports tables with responsive behavior.
* Supports glossary pages for ML terms.
* Supports citations or source references where technical claims need grounding.
* Supports model cards or structured model documentation.
* Supports API reference pages if the ML system exposes APIs.
* Supports downloadable assets where appropriate.
* Supports canonical URLs and sitemap generation.

## ML-specific documentation quality

* Model pages clearly state model purpose, inputs, outputs, and constraints.
* Model pages document architecture at a high level.
* Model pages document important modules, such as attention, normalization, feed-forward layers, embeddings, tokenizers, and output heads.
* Model pages document training regime where relevant.
* Model pages document evaluation metrics and benchmark caveats.
* Model pages document hardware assumptions and performance characteristics.
* Model pages distinguish between conceptual explanation and implementation detail.
* Graphs show clear labels, legends, and directional flow.
* Graphs avoid visual ambiguity between data flow, control flow, and dependency relationships.
* Model diagrams have textual summaries for accessibility and search.
* Mathematical notation is consistent across docs.
* Terms such as tokens, embeddings, KV cache, attention heads, hidden size, and parameters are defined consistently.
* Performance claims include context, such as hardware, batch size, sequence length, precision, and measurement method.
* Limitations and failure modes are documented.
* Security, safety, and privacy considerations are documented where relevant.

## Graph and model rendering

* Uses React Flow for model and module rendering.
* Has a standard graph viewer component.
* Has a standard model viewer component.
* Graph viewer supports pan, zoom, fit-to-view, reset, minimap where useful, and keyboard navigation where possible.
* Graph nodes use consistent visual semantics.
* Graph edges use consistent visual semantics.
* Graphs support legends.
* Graphs support node details panels.
* Graphs support deep linking to selected nodes where useful.
* Graphs support responsive behavior.
* Graph data is separated from graph rendering.
* Graph schemas are versioned.
* Graph rendering has tests for layout, node rendering, and interaction.
* Large graphs have performance safeguards.
* Graphs provide text alternatives or summaries for accessibility.

## Components

* Uses standard shadcn/ui components where possible.
* Uses Magic UI components only when they improve communication and do not harm accessibility or performance.
* Has a standard graph viewer component.
* Has a standard model viewer component.
* Has standard page layout components.
* Has standard docs navigation components.
* Has standard callout components.
* Has standard code block components.
* Has standard math rendering components.
* Has standard table components.
* Has standard search components.
* Has standard loading, empty, error, and fallback components.
* Has standard SEO metadata helpers.
* Has standard analytics/event helpers if analytics are used.

## Content governance

* Docs have owners.
* Docs have a review process.
* Docs have a freshness or last-reviewed date.
* Outdated docs can be marked as deprecated.
* Technical claims are reviewed before publication.
* Breaking changes are reflected in docs before or during release.
* Docs include examples that are tested where practical.
* Public docs avoid undocumented internal assumptions.
* Terminology is consistent across the site.
* A style guide defines tone, formatting, terminology, and code example conventions.

## Observability and analytics

* Website errors are tracked.
* Build and deploy failures are visible.
* Core Web Vitals are monitored.
* Search queries can be analyzed to identify missing docs.
* 404s are tracked.
* Popular pages and drop-off points are tracked if analytics are enabled.
* Analytics respect privacy requirements.
* Performance regressions are detected before release where possible.

## Security and privacy

* No secrets are committed to the repository.
* Environment variables are scoped appropriately.
* Dependencies are scanned.
* External scripts are minimized and reviewed.
* Content Security Policy is considered for production.
* User analytics, if used, are privacy-conscious.
* Forms, if any, validate inputs and avoid leaking sensitive data.
* PDF export does not accidentally include private or draft-only content.

## Performance

* Static pages are pre-rendered where possible.
* Images are optimized.
* Fonts are optimized and loaded intentionally.
* JavaScript bundle size is tracked.
* Heavy interactive components, such as graph viewers, are lazy-loaded where appropriate.
* Search index size is monitored.
* Code splitting is used where useful.
* Core docs pages remain fast without requiring heavy client-side JavaScript.
* Performance budgets are enforced in CI where practical.

## Definition of done

A page or feature is not considered complete until:

* It builds successfully.
* It passes type checking.
* It passes linting and formatting.
* It has appropriate tests.
* It works on mobile, tablet, and desktop.
* It has accessible labels and keyboard behavior where relevant.
* It has loading, empty, and error states where relevant.
* It follows design tokens and layout rules.
* It has documentation or examples if reusable.
* It does not introduce broken links.
* It does not exceed performance budgets.
* It has been reviewed for technical accuracy.
