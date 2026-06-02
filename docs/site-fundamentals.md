# Site Fundamentals

## Product Frame

The site is **Model Reference**: a documentation-native reference for modern AI
models. It should cover transformers, diffusers, multimodal models, omni
models, world models, training methods, datasets, serving systems, and papers
through one consistent docs shell.

Every page should feel like a documentation page, including the home page,
glossary pages, tag pages, architecture pages, model pages, module pages, and
paper pages.

## Visual Direction

The design direction is a restrained technical atlas with subtle fantasy and
game-world influence. It should feel like a weathered model-system field guide,
not a marketing site and not a rainbow dashboard.

Use:

* dark documentation surfaces
* mostly white, off-white, and muted gray text
* dull blue-teal for focus and navigation state
* pastel pink/coral as a sparse editorial highlight
* weathered cream, charcoal, teal-gray, and pale pink atlas textures
* etched grid, compass, and technical linework as low-contrast background detail

Avoid:

* many saturated colors competing on one page
* bright red as the default primary color
* bright cyan focus states
* purple gradients
* colorful tag chips by default
* dashboard-like home-page segmentation

## shadcn Theme Tokens

Use shadcn's semantic token model: components should consume tokens such as
`background`, `foreground`, `primary`, `accent`, `border`, `ring`, and
`sidebar`, rather than hard-coded brand colors.

The default product theme is dark. A light theme can be added later, but Phase 1
should implement the dark token set first.

```css
:root {
  --radius: 0.5rem;

  /* Base document shell */
  --background: oklch(0.145 0.018 205);
  --foreground: oklch(0.955 0.018 82);

  /* Cards, panels, popovers, tables, and inline doc figures */
  --card: oklch(0.18 0.018 205);
  --card-foreground: oklch(0.955 0.018 82);
  --popover: oklch(0.17 0.018 205);
  --popover-foreground: oklch(0.955 0.018 82);

  /* Dull blue-teal focus color */
  --primary: oklch(0.59 0.07 205);
  --primary-foreground: oklch(0.98 0.01 82);

  /* Quiet secondary surfaces */
  --secondary: oklch(0.24 0.018 205);
  --secondary-foreground: oklch(0.9 0.014 82);

  /* Muted text and inactive UI */
  --muted: oklch(0.24 0.012 205);
  --muted-foreground: oklch(0.68 0.018 82);

  /* Pastel pink/coral editorial highlight */
  --accent: oklch(0.74 0.105 21);
  --accent-foreground: oklch(0.16 0.02 205);

  /* Destructive state, used sparingly and not as brand color */
  --destructive: oklch(0.56 0.16 24);
  --destructive-foreground: oklch(0.98 0.01 82);

  /* Hairlines and input states */
  --border: oklch(0.32 0.018 205);
  --input: oklch(0.28 0.018 205);
  --ring: oklch(0.59 0.07 205);

  /* Optional chart palette: low saturation, atlas compatible */
  --chart-1: oklch(0.59 0.07 205);
  --chart-2: oklch(0.74 0.105 21);
  --chart-3: oklch(0.78 0.055 92);
  --chart-4: oklch(0.55 0.035 165);
  --chart-5: oklch(0.72 0.025 75);

  /* Sidebar shell */
  --sidebar: oklch(0.155 0.018 205);
  --sidebar-foreground: oklch(0.9 0.014 82);
  --sidebar-primary: oklch(0.59 0.07 205);
  --sidebar-primary-foreground: oklch(0.98 0.01 82);
  --sidebar-accent: oklch(0.24 0.018 205);
  --sidebar-accent-foreground: oklch(0.955 0.018 82);
  --sidebar-border: oklch(0.29 0.018 205);
  --sidebar-ring: oklch(0.59 0.07 205);
}
```

If the app uses shadcn's Tailwind v4 `@theme inline` setup, map these variables
to Tailwind color utilities using the standard shadcn pattern:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}
```

## Color Usage Rules

Default text should be `foreground`, `muted-foreground`, or opacity variants of
those values. Most icons, borders, labels, chips, table text, and cards should
remain monochrome.

Use `primary` for:

* focused inputs
* active top-nav underline
* active right-table-of-contents dot
* selected links when blue focus is more useful than pink emphasis
* one compact affordance inside a section, such as a link arrow

Use `accent` for:

* the home-page brush-stroke header treatment
* sparse title or subtitle emphasis
* selected sidebar state when a warmer editorial highlight is needed
* occasional links such as `View all papers`

Do not use `accent` for every tag, badge, icon, and table highlight. Pastel pink
should feel intentional, not decorative noise.

Use `destructive` only for real error/destructive states. Do not use it as a
brand red.

## Home Page Header

The Model Atlas home page should use a broad irregular brush-stroke header
behind the title and subtitle area. The brush stroke may mix pastel coral,
weathered cream, charcoal ink, and dull teal-gray. It should not be a rectangular
banner or a separate callout card.

The search bar and page sections should follow after the header in normal docs
article flow.

## Typography

```css
--font-heading: "Cormorant Garamond", serif;
--font-body: "Inter", sans-serif;
--font-display: "Bebas Neue", sans-serif;
```

General page, section, sidebar, and navigation headings should be capitalized.
Body text should remain sentence case for readability.

## Layout Rules

Use the same docs shell for every page type:

* top navigation
* left docs sidebar
* central article column
* right `On this page` rail

The home page is page zero of the docs system. It should not become a marketing
landing page or a dashboard with unrelated columns.
