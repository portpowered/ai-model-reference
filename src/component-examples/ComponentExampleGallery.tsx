import {
  componentExamples,
  groupExamplesByComponent,
} from "@/component-examples/registry";
import type { ComponentExampleContext } from "@/component-examples/types";

type ComponentExampleGalleryProps = {
  context: ComponentExampleContext;
};

export function ComponentExampleGallery({
  context,
}: ComponentExampleGalleryProps) {
  const grouped = groupExamplesByComponent();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-6 py-10">
      <header className="space-y-3 border-b border-border pb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Dev-only component harness
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Shared docs component examples
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Lightweight Storybook-style gallery for Phase 2 MDX building blocks.
          Examples use grouped-query-attention fixtures and search metadata so
          reviewers can inspect default and alternate states without loading
          full MDX pages.
        </p>
      </header>

      {[...grouped.entries()].map(([componentName, examples]) => (
        <section key={componentName} className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{componentName}</h2>
            <p className="text-sm text-muted-foreground">
              {examples.length} example{examples.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="grid gap-6">
            {examples.map((example) => (
              <article
                key={example.id}
                id={example.id}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="border-b border-border bg-muted/30 px-4 py-3">
                  <h3 className="text-sm font-medium">
                    {example.variantLabel}
                  </h3>
                  {example.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {example.description}
                    </p>
                  ) : null}
                </div>
                <div className="p-6">{example.render(context)}</div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
        Registry exports {componentExamples.length} examples across{" "}
        {grouped.size} components.
      </footer>
    </div>
  );
}
