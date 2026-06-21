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

    expect(html).toContain("Activation chronology");
    expect(html).toContain('data-testid="ontology-chrono-timeline"');
    expect(html).toContain("Loading timeline");
    expect(html).toContain("Preparing the interactive timeline renderer.");
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

    expect(html).toContain('aria-current="page"');
    expect(html).toContain(
      'href="/docs/timeline?classification=attention-mechanisms"',
    );
    expect(html).toContain(
      'href="/docs/timeline?classification=feed-forward-networks"',
    );
    expect(html).toContain(
      'href="/docs/timeline?classification=normalization-layers"',
    );
    expect(html).toContain(
      'href="/docs/timeline?classification=position-encoding-methods"',
    );
    expect(html).toContain(
      'href="/docs/timeline?classification=tokenization-methods"',
    );
    expect(html).toContain(
      'href="/docs/timeline?classification=transformer-block-structures"',
    );
    expect(extractChipEventCount(html, "activation-functions")).toBe(
      activationTimeline.items.length,
    );
    expect(extractChipEventCount(html, "attention-mechanisms")).toBe(14);
    expect(extractChipEventCount(html, "feed-forward-networks")).toBe(
      feedForwardTimeline.items.length,
    );
    expect(extractChipEventCount(html, "normalization-layers")).toBe(5);
    expect(extractChipEventCount(html, "position-encoding-methods")).toBe(13);
    expect(extractChipEventCount(html, "tokenization-methods")).toBe(5);
    expect(extractChipEventCount(html, "transformer-block-structures")).toBe(1);
    expect(activationTimeline.items.map((item) => item.registryId)).toEqual([
      "module.tanh",
      "module.sigmoid",
      "module.relu",
      "module.leaky-relu",
      "module.gelu",
      "module.silu",
    ]);
    expect(feedForwardTimeline.items.map((item) => item.registryId)).toEqual([
      "module.feed-forward-network",
      "module.mixture-of-experts",
      "module.standard-ffn",
      "module.swiglu",
      "module.deepseekmoe",
    ]);
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

    expect(extractChipEventCount(html, "activation-functions")).toBe(
      timeline.items.length,
    );
  });

  test("renders the localized timeline route without crashing when docs pages are only partially translated", async () => {
    const html = renderToStaticMarkup(await renderTimelinePage("ja"));

    expect(html).toContain("Activation chronology");
    expect(html).toContain('data-testid="ontology-chrono-timeline"');
  });
});
