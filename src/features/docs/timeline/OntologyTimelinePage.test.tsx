import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderTimelinePage } from "@/app/(site)/site-renderers";
import { loadOntologyTimelineData } from "@/lib/content/ontology-timeline";

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
    const timeline = loadOntologyTimelineData("activation");

    expect(timeline.status).toBe("success");
    if (timeline.status !== "success") {
      throw new Error("Expected activation timeline to resolve successfully");
    }

    expect(html).toContain("Activation Timeline");
    expect(html).toContain(
      `Showing ${timeline.items.length} dated events for activation function.`,
    );
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
    const activationTimeline = loadOntologyTimelineData("activation");
    const feedForwardTimeline = loadOntologyTimelineData(
      "feed-forward-networks",
    );

    expect(activationTimeline.status).toBe("success");
    expect(feedForwardTimeline.status).toBe("success");
    if (
      activationTimeline.status !== "success" ||
      feedForwardTimeline.status !== "success"
    ) {
      throw new Error("Expected preloaded timelines to resolve successfully");
    }

    expect(html).toContain(
      `Showing ${activationTimeline.items.length} dated events for activation function.`,
    );
    expect(html).toContain("Rectified Linear Unit");
    expect(html).toContain("Swish Gated Linear Unit");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(
      'href="/docs/timeline?classification=feed-forward-networks"',
    );
    expect(extractChipEventCount(html, "activation-functions")).toBe(
      activationTimeline.items.length,
    );
    expect(extractChipEventCount(html, "feed-forward-networks")).toBe(
      feedForwardTimeline.items.length,
    );
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
    const timeline = loadOntologyTimelineData("activation");

    expect(timeline.status).toBe("success");
    if (timeline.status !== "success") {
      throw new Error("Expected activation timeline to resolve successfully");
    }

    expect(html).toContain(
      `Showing ${timeline.items.length} dated events for activation function.`,
    );
    expect(extractChipEventCount(html, "activation-functions")).toBe(
      timeline.items.length,
    );
  });

  test("renders the localized timeline route without crashing when docs pages are only partially translated", async () => {
    const html = renderToStaticMarkup(await renderTimelinePage("ja"));

    expect(html).toContain("Activation Timeline");
    expect(html).toContain("Rectified Linear Unit");
    expect(html).toContain('href="/docs/modules/relu"');
    expect(html).toContain('data-testid="ontology-chrono-timeline"');
  });
});
