import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderTimelinePage } from "@/app/(site)/site-renderers";

async function renderTimeline() {
  return renderToStaticMarkup(await renderTimelinePage("en"));
}

function extractChipEventCount(
  html: string,
  classificationSlug: string,
): number | undefined {
  const match = html.match(
    new RegExp(
      `href="/docs/timeline\\?classification=${classificationSlug}"[\\s\\S]*?<span class="sr-only">(\\d+) dated events</span>`,
    ),
  );
  return match?.[1] ? Number(match[1]) : undefined;
}

describe("OntologyTimelinePage", () => {
  test("renders the activation chronology in the docs shell with Timeline Chrono", async () => {
    const html = await renderTimeline();

    expect(html).toContain("Activation Timeline");
    expect(html).toContain("Showing 6 dated events for activation function.");
    expect(html).toContain('data-testid="ontology-chrono-timeline"');
    expect(html).toContain("ontology-timeline__chrono-shell");
    expect(html).toContain("Loading timeline");
    expect(html).toContain("Preparing the interactive timeline renderer.");

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
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(
      'href="/docs/timeline?classification=feed-forward-networks"',
    );
    expect(extractChipEventCount(html, "activation-functions")).toBe(6);
    expect(extractChipEventCount(html, "feed-forward-networks")).toBe(4);
  });

  test("does not depend on searchParams during static prerender", async () => {
    const rejectedSearchParams = Promise.reject(
      new Error("timeline prerender must not await searchParams"),
    );
    rejectedSearchParams.catch(() => {});

    const html = renderToStaticMarkup(
      await renderTimelinePage("en", {
        searchParams: rejectedSearchParams,
      }),
    );

    expect(html).toContain("Showing 6 dated events for activation function.");
    expect(extractChipEventCount(html, "activation-functions")).toBe(6);
  });

  test("renders the localized timeline route without crashing when docs pages are only partially translated", async () => {
    const html = renderToStaticMarkup(await renderTimelinePage("ja"));

    expect(html).toContain("Activation Timeline");
    expect(html).toContain("Rectified Linear Unit");
    expect(html).toContain('href="/docs/modules/relu"');
    expect(html).toContain('data-testid="ontology-chrono-timeline"');
  });
});
