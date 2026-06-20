import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderTimelinePage } from "@/app/(site)/site-renderers";

async function renderTimeline(searchParams?: Record<string, string>) {
  return renderToStaticMarkup(
    await renderTimelinePage("en", {
      searchParams: Promise.resolve(searchParams ?? {}),
    }),
  );
}

describe("OntologyTimelinePage", () => {
  test("renders the activation chronology in the docs shell with Timeline Chrono", async () => {
    const html = renderToStaticMarkup(
      await renderTimelinePage("en", {
        searchParams: Promise.resolve({ classification: "activation" }),
      }),
    );

    expect(html).toContain("Activation Timeline");
    expect(html).toContain("Showing 6 dated events for activation function.");
    expect(html).toContain('data-testid="ontology-chrono-timeline"');
    expect(html).toContain("ontology-timeline__chrono-shell");
    expect(html).toContain("Loading timeline renderer...");

    for (const title of [
      "Rectified Linear Unit",
      "Leaky Rectified Linear Unit",
      "Sigmoid Linear Unit",
      "Swish Gated Linear Unit",
    ]) {
      expect(html).toContain(title);
    }

    expect(html).toContain('href="/docs/modules/relu"');
    expect(html).toContain('href="/docs/modules/swiglu"');
    expect(html).toContain("Open docs page");
  });

  test("defaults to the activation prototype when no classification parameter is provided", async () => {
    const html = await renderTimeline();

    expect(html).toContain("Showing 6 dated events for activation function.");
    expect(html).toContain("Rectified Linear Unit");
    expect(html).toContain("Swish Gated Linear Unit");
  });
});
