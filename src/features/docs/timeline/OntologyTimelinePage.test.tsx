import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderTimelinePage } from "@/app/(site)/site-renderers";
import { loadPreloadedTimelineSelections } from "@/features/docs/timeline/OntologyTimelinePage";
import { getDefaultTimelineClassificationSelector } from "@/features/docs/timeline/timeline-query";
import { loadOntologyTimelineData } from "@/lib/content/ontology-timeline";

async function renderTimeline() {
  return renderToStaticMarkup(await renderTimelinePage("en"));
}

const timelineClassificationSlugs = [
  "activation-functions",
  "attention-mechanisms",
  "feed-forward-networks",
  "normalization-layers",
  "position-encoding-methods",
  "tokenization-methods",
  "transformer-block-structures",
] as const;

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
    const defaultClassification = getDefaultTimelineClassificationSelector();
    const activationTimeline = loadOntologyTimelineData("activation");
    const feedForwardTimeline = loadOntologyTimelineData(
      "feed-forward-networks",
    );
    const classificationCounts = new Map(
      timelineClassificationSlugs.map((slug) => {
        const timeline = loadOntologyTimelineData(slug);
        return [
          slug,
          timeline.status === "success" ? timeline.items.length : undefined,
        ];
      }),
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
    expect(html).not.toContain(
      'href="/docs/timeline?classification=activation"',
    );
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
    expect(extractChipEventCount(html, "attention-mechanisms")).toBe(
      classificationCounts.get("attention-mechanisms"),
    );
    expect(extractChipEventCount(html, "feed-forward-networks")).toBe(
      feedForwardTimeline.items.length,
    );
    expect(extractChipEventCount(html, "normalization-layers")).toBe(
      classificationCounts.get("normalization-layers"),
    );
    expect(extractChipEventCount(html, "position-encoding-methods")).toBe(
      classificationCounts.get("position-encoding-methods"),
    );
    expect(extractChipEventCount(html, "tokenization-methods")).toBe(
      classificationCounts.get("tokenization-methods"),
    );
    expect(extractChipEventCount(html, "transformer-block-structures")).toBe(
      classificationCounts.get("transformer-block-structures"),
    );
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
    expect(defaultClassification).toBe("activation-functions");
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

  test("preloads canonical and legacy selectors for client-side timeline hydration", () => {
    const preloaded = loadPreloadedTimelineSelections("en");

    expect(preloaded[getDefaultTimelineClassificationSelector()]).toMatchObject(
      {
        status: "success",
        classification: {
          classificationId: "classification.module.activation",
        },
      },
    );
    expect(preloaded["classification.module.feed-forward"]).toMatchObject({
      status: "success",
      classification: {
        classificationId: "classification.module.feed-forward",
      },
    });
    expect(preloaded["classification.feed-forward-networks"]).toMatchObject({
      status: "success",
      classification: {
        classificationId: "classification.module.feed-forward",
      },
    });
    expect(preloaded["feed-forward"]).toMatchObject({
      status: "success",
      classification: {
        classificationId: "classification.module.feed-forward",
      },
    });
  });
});
