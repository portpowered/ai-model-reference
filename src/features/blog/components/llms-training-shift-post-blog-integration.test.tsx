import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderBlogPostPage } from "@/app/(site)/site-renderers";
import { TRAINING_SIGNAL_BAND_LABELS } from "@/features/graphs/training-signal/training-signal-band-keys";
import {
  blogPostHref,
  loadBlogPostFromDisk,
} from "@/lib/content/blog-page-load";
import { getPublishedBlogPostBySlug } from "@/lib/content/blog-post-get";
import { renderBlogPostShell } from "@/lib/content/blog-shell-render";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { resolveRelatedRegistryDocs } from "@/lib/content/related-registry-docs";
import {
  loadTagResourceGroups,
  publishedBlogPostMatchesTag,
} from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  buildBlogSearchDocuments,
  loadBlogSearchPostSources,
} from "@/lib/search/build-blog-search-document";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "@/lib/verify/launch-playwright-browser";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";

const repoRoot = join(import.meta.dir, "../../../..");

const BLOG_SLUG = "llms-no-longer-wholly-reliant-on-the-internet";
const BLOG_ROUTE = `/blog/${BLOG_SLUG}`;

const RESPONSIVE_CONTAINER_WIDTHS = [
  { label: "mobile", width: "24.375rem" },
  { label: "desktop", width: "48rem" },
] as const;

const BLOG_VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1280, height: 800 },
] as const;

const DISCOVERY_SEARCH_QUERIES = [
  "LLM training shift",
  "internet pretraining",
  "mid-training post-training",
  "RLHF RLVR",
  "on-policy distillation",
] as const;

const MDX_COMPONENT_NAMES = [
  "TrainingSignalStackedChart",
  "BlogRelatedDocs",
  "TagPillList",
  "Callout",
] as const;

const EXPECTED_RELATED_DOC_IDS = [
  "training-regime.pretraining",
  "training-regime.mid-training",
  "training-regime.post-training",
  "training-regime.instruction-tuning",
  "training-regime.rlhf",
  "training-regime.rlvr",
  "concept.synthetic-data",
  "training-regime.distillation",
  "training-regime.on-policy-distillation",
  "concept.on-policy",
] as const;

const EXPECTED_RELATED_DOC_HREFS = [
  "/docs/training/pretraining",
  "/docs/training/mid-training",
  "/docs/training/post-training",
  "/docs/training/instruction-tuning",
  "/docs/training/rlhf",
  "/docs/training/rlvr",
  "/docs/concepts/synthetic-data",
  "/docs/training/distillation",
  "/docs/training/on-policy-distillation",
  "/docs/concepts/on-policy",
] as const;

async function assertServedTrainingSignalChartPlot(
  page: import("playwright").Page,
) {
  const chart = page.locator('[data-training-signal-chart="ready"]');
  await chart.waitFor({ state: "visible" });
  await page
    .locator('[data-training-signal-chart="ready"] .recharts-area-area')
    .first()
    .waitFor({ state: "attached" });

  const plot = await page.evaluate(() => {
    const figure = document.querySelector(
      '[data-training-signal-chart="ready"]',
    );
    if (!figure) {
      throw new Error("missing training-signal chart figure");
    }

    return {
      svgCount: figure.querySelectorAll("svg").length,
      pathCount: figure.querySelectorAll("path").length,
      areaCount: figure.querySelectorAll(".recharts-area-area").length,
      plotHeight:
        figure.querySelector(".recharts-wrapper")?.getBoundingClientRect()
          .height ?? 0,
    };
  });

  expect(plot.svgCount).toBeGreaterThan(0);
  expect(plot.pathCount).toBeGreaterThan(0);
  expect(plot.areaCount).toBe(6);
  expect(plot.plotHeight).toBeGreaterThan(0);
}

describe("llms training shift post blog integration", () => {
  test("published blog post renders on /blog/llms-no-longer-wholly-reliant-on-the-internet", async () => {
    const post = await loadBlogPostFromDisk(BLOG_SLUG);
    const html = renderBlogPostShell(post);

    expect(blogPostHref(BLOG_SLUG)).toBe(
      "/blog/llms-no-longer-wholly-reliant-on-the-internet",
    );
    expect(post.frontmatter.status).toBe("published");
    expect(post.frontmatter.messageNamespace).toBe("local");
    expect(post.frontmatter.assetNamespace).toBe("local");
    expect(post.frontmatter.authors).toEqual(["site-team"]);
    expect(post.frontmatter.relatedDocIds).toEqual([
      ...EXPECTED_RELATED_DOC_IDS,
    ]);
    for (const registryId of EXPECTED_RELATED_DOC_IDS) {
      expect(PUBLISHED_DOCS_REGISTRY_IDS.has(registryId)).toBe(true);
    }
    const resolvedRelatedDocs = resolveRelatedRegistryDocs(
      post.frontmatter.relatedDocIds,
    );
    expect(resolvedRelatedDocs.unavailable).toEqual([]);
    expect(resolvedRelatedDocs.available.map((item) => item.href)).toEqual([
      ...EXPECTED_RELATED_DOC_HREFS,
    ]);
    expect(html).toContain("LLMs are no longer wholly reliant on the internet");
    expect(html).toContain(
      "Internet-scale pretraining remains the foundation of modern LLMs",
    );
    expect(html).toContain("The training-signal shift");
    expect(html).toContain(
      "additional signals reshape behavior: curated demonstrations",
    );
    expect(html).toContain("How training signals accumulated over time");
    expect(html).toContain("conceptual illustration");
    expect(html).toContain('data-training-signal-chart="ready"');
    expect(html).toContain('data-value-mode="conceptual"');
    expect(html).toContain("Conceptual illustration");
    expect(html).toContain(
      "Illustrative training-signal mix across three eras",
    );
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.pretrainingCorpus);
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.instructionSupervised);
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.preferenceSignal);
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.verifiableRl);
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.syntheticTraces);
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.onPolicyDistillation);
    expect(html).toContain("Conceptual chart");
    expect(html).toContain(
      "communicate direction and relative emphasis, not quantitative market shares",
    );
    expect(html).toContain("Few-shot prompting");
    expect(html).toContain("inference-time");
    expect(html).toContain("without any weight update");
    expect(html).toContain("Mid-training");
    expect(html).toContain("bridge that narrows a wide foundation");
    expect(html).toContain("Instruction tuning");
    expect(html).toContain("Preference feedback");
    expect(html).toContain("Verifiable reward loops");
    expect(html).toContain("Synthetic and model-generated traces");
    expect(html).toContain("On-policy distillation and self-distillation");
    expect(html).toContain("Key post-training and feedback loops");
    expect(html).toContain("Reinforcement learning from human feedback (RLHF)");
    expect(html).toContain(
      "Reinforcement learning from verifiable rewards (RLVR)",
    );
    expect(html).toContain(
      "supervised learning from prompt-and-answer demonstrations",
    );
    expect(html).toContain("preference-driven behavior shaping");
    expect(html).toContain("externally checkable outcomes");
    expect(html).toContain("current or recently updated policy");
    expect(html).toContain(
      "generated traces, answers, critiques, or trajectories",
    );
    expect(html).toContain(
      "Comparing signal source, scoring, and weight updates",
    );
    expect(html).toContain("without changing weights");
    expect(html).toContain("Post-training does not erase pretraining");
    expect(html).toContain('data-testid="blog-related-docs"');
    for (const href of EXPECTED_RELATED_DOC_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/alignment"');
    for (const registryId of EXPECTED_RELATED_DOC_IDS) {
      expect(html).not.toContain(registryId);
    }
    expect(html).not.toContain(
      'data-testid="related-registry-docs-unavailable"',
    );
  });
});

describe("llms training shift post discovery", () => {
  test.each([...DISCOVERY_SEARCH_QUERIES])(
    "search returns the post for %s",
    async (query) => {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === BLOG_ROUTE)).toBe(true);
    },
    { timeout: 20_000 },
  );

  test("search document indexes title, description, headings, and narrative body without MDX component names", async () => {
    const indexes = await loadRegistry();
    const posts = await loadBlogSearchPostSources();
    const post = await loadBlogPostFromDisk(BLOG_SLUG);
    const [document] = buildBlogSearchDocuments(
      posts.filter((entry) => entry.slug === BLOG_SLUG),
      indexes,
    );

    expect(document).toBeDefined();
    expect(document).toMatchObject({
      url: BLOG_ROUTE,
      title: post.messages.title,
      description: post.messages.description,
      tags: ["foundations", "alignment"],
    });
    expect(document?.bodyText).toContain(
      "Internet-scale pretraining remains the foundation of modern LLMs",
    );
    expect(document?.bodyText).toContain(
      "Treat broad web-scale pretraining as the base layer",
    );
    expect(document?.bodyText).toContain("The training-signal shift");
    expect(document?.bodyText).toContain("Few-shot prompting");
    expect(document?.bodyText).toContain("On-policy distillation");
    expect(document?.headings).toContain(
      "How training signals accumulated over time",
    );
    expect(document?.headings).toContain(
      "Key post-training and feedback loops",
    );

    for (const componentName of MDX_COMPONENT_NAMES) {
      expect(document?.bodyText).not.toContain(componentName);
      expect(
        document?.headings.some((heading) => heading.includes(componentName)),
      ).toBe(false);
    }
  });

  test("published post appears on foundations and alignment tag landing groups", async () => {
    const post = await getPublishedBlogPostBySlug(BLOG_SLUG);
    if (!post) {
      throw new Error(`missing published blog post ${BLOG_SLUG}`);
    }
    const messages = await loadUiMessages();

    for (const tagSlug of ["foundations", "alignment"] as const) {
      expect(publishedBlogPostMatchesTag(post, tagSlug)).toBe(true);

      const groups = await loadTagResourceGroups(tagSlug, messages, "en");
      const blogGroup = groups.find((group) => group.kind === "blog");

      expect(blogGroup?.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            slug: BLOG_SLUG,
            url: BLOG_ROUTE,
            title: post.messages.title,
            summary: post.messages.description,
          }),
        ]),
      );
    }
  });
});

describe("llms training shift post responsive layout", () => {
  test.each(
    RESPONSIVE_CONTAINER_WIDTHS.map(
      (viewport) => [viewport.label, viewport.width] as const,
    ),
  )("keeps title, timeline sections, chart, tags, and related docs readable at %s width", async (_label, width) => {
    const page = await renderBlogPostPage(BLOG_SLUG);
    const html = renderToStaticMarkup(
      createElement("div", { style: { maxWidth: width, width: "100%" } }, page),
    );

    expect(html).toContain("LLMs are no longer wholly reliant on the internet");
    expect(html).toContain("How training signals accumulated over time");
    expect(html).toContain("Key post-training and feedback loops");
    expect(html).toContain(TRAINING_SIGNAL_BAND_LABELS.pretrainingCorpus);
    expect(html).toContain("Related reference pages");
    expect(html).toContain('data-testid="blog-related-docs"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/alignment"');
  });

  test.each(
    BLOG_VIEWPORTS.map((viewport) => [viewport.label, viewport] as const),
  )(
    "served blog route keeps timeline, chart, tags, and related docs visible without horizontal overflow at %s width",
    async (_label, viewport) => {
      if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
        return;
      }

      const session = await acquireVerifyServerSession({
        projectRoot: repoRoot,
      });
      const browser = await launchPlaywrightBrowser();

      try {
        const page = await browser.newPage({
          viewport: { width: viewport.width, height: viewport.height },
        });
        page.setDefaultTimeout(30_000);
        await page.goto(`${session.baseUrl}${BLOG_ROUTE}`, {
          waitUntil: "load",
        });

        await page
          .getByRole("heading", {
            name: "LLMs are no longer wholly reliant on the internet",
          })
          .first()
          .waitFor({ state: "visible" });
        await page
          .getByRole("heading", {
            name: "How training signals accumulated over time",
          })
          .waitFor({ state: "visible" });
        await page.locator('[data-training-signal-chart="ready"]').waitFor({
          state: "visible",
        });
        await assertServedTrainingSignalChartPlot(page);
        await page.locator('[data-testid="blog-related-docs"]').waitFor({
          state: "visible",
        });

        const layout = await page.evaluate(() => {
          const pageClientWidth = document.documentElement.clientWidth;
          const pageScrollWidth = document.documentElement.scrollWidth;
          const title = document.querySelector("h1");
          const timeline = Array.from(document.querySelectorAll("h2")).find(
            (node) =>
              node.textContent?.includes(
                "How training signals accumulated over time",
              ),
          );
          const chart = document.querySelector(
            '[data-training-signal-chart="ready"]',
          );
          const relatedDocs = document.querySelector(
            '[data-testid="blog-related-docs"]',
          );

          function readHeight(element: Element | null, name: string): number {
            if (!element) {
              throw new Error(`missing ${name}`);
            }
            return element.getBoundingClientRect().height;
          }

          return {
            page: {
              clientWidth: pageClientWidth,
              scrollWidth: pageScrollWidth,
            },
            titleHeight: readHeight(title, "title"),
            timelineHeight: readHeight(timeline ?? null, "timeline heading"),
            chartHeight: readHeight(chart, "chart"),
            relatedDocsHeight: readHeight(relatedDocs, "related docs"),
          };
        });

        expect(layout.page.scrollWidth).toBeLessThanOrEqual(
          layout.page.clientWidth + 1,
        );
        expect(layout.titleHeight).toBeGreaterThan(0);
        expect(layout.timelineHeight).toBeGreaterThan(0);
        expect(layout.chartHeight).toBeGreaterThan(0);
        expect(layout.relatedDocsHeight).toBeGreaterThan(0);

        await page.close();
      } finally {
        await closePlaywrightBrowserWithTimeout(browser);
        await session.cleanup();
      }
    },
    120_000,
  );
});
