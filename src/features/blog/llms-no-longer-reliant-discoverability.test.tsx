/**
 * Consolidated discoverability and responsive-reading proof for
 * `/blog/llms-no-longer-wholly-reliant-on-the-internet` (story 005).
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { renderBlogIndexPage } from "@/app/(site)/site-renderers";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "@/lib/verify/launch-playwright-browser";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";

const BLOG_SLUG = "llms-no-longer-wholly-reliant-on-the-internet";
const BLOG_ROUTE = `/blog/${BLOG_SLUG}`;
const BLOG_TITLE = "LLMs are no longer wholly reliant on the internet";
const BLOG_DESCRIPTION =
  "Why modern language-model quality still starts with internet-scale pretraining but increasingly depends on mid-training, post-training, preference feedback, verifiable rewards, and distillation loops.";

const DISCOVERY_QUERIES = [
  "LLM training internet",
  "post-training loops",
  "instruction tuning RLHF RLVR",
  "on-policy distillation",
] as const;

const BLOG_VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1280, height: 800 },
] as const;

type LayoutRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

function rectsOverlap(a: LayoutRect, b: LayoutRect): boolean {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

function blogPostHrefPosition(html: string, slug: string): number {
  const position = html.indexOf(`href="/blog/${slug}"`);
  expect(position).toBeGreaterThanOrEqual(0);
  return position;
}

describe("llms-no-longer-reliant blog discoverability (005)", () => {
  test("blog index lists the post with title, description, published date, and tags", async () => {
    const page = await renderBlogIndexPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain(BLOG_TITLE);
    expect(html).toContain(BLOG_DESCRIPTION);
    expect(html).toContain('dateTime="2026-07-08"');
    expect(html).toContain("July 8, 2026");
    expect(html).toContain("Foundations");
    expect(html).toContain("Alignment");
    expect(html).toContain(`href="${BLOG_ROUTE}"`);
    expect(html).toContain(`aria-label="Read blog post: ${BLOG_TITLE}"`);
  });

  test("blog index orders the post ahead of older published entries", async () => {
    const page = await renderBlogIndexPage();
    const html = renderToStaticMarkup(page);

    expect(blogPostHrefPosition(html, BLOG_SLUG)).toBeLessThan(
      blogPostHrefPosition(html, "roofline-throughput-explorer"),
    );
  });

  test.each(DISCOVERY_QUERIES.map((query) => [query] as const))(
    "search surfaces the post for %s",
    async (query) => {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === BLOG_ROUTE)).toBe(true);
    },
    { timeout: 20_000 },
  );

  test("foundations and alignment tag landings include the post in blog groups", async () => {
    const messages = await loadUiMessages();

    for (const tagSlug of ["foundations", "alignment"] as const) {
      const groups = await loadTagResourceGroups(tagSlug, messages, "en");
      const blogGroup = groups.find((group) => group.kind === "blog");

      expect(blogGroup).toBeDefined();
      expect(
        blogGroup?.resources.some((resource) => resource.slug === BLOG_SLUG),
      ).toBe(true);
      expect(
        blogGroup?.resources.some((resource) => resource.title === BLOG_TITLE),
      ).toBe(true);
    }
  });
});

describe("llms-no-longer-reliant responsive reading verification (005)", () => {
  const repoRoot = join(import.meta.dir, "../../..");

  test.each(
    BLOG_VIEWPORTS.map((viewport) => [viewport.label, viewport] as const),
  )(
    "served blog route keeps title, chart, timeline, tags, and related docs readable without overlap at %s width",
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

        const layout = await page.evaluate(() => {
          const pageClientWidth = document.documentElement.clientWidth;
          const pageScrollWidth = document.documentElement.scrollWidth;

          function readRect(element: Element | null, name: string): LayoutRect {
            if (!element) {
              throw new Error(`missing region ${name}`);
            }
            const rect = element.getBoundingClientRect();
            return {
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            };
          }

          const title = document.querySelector("h1");
          const summary = Array.from(document.querySelectorAll("h2")).find(
            (node) => node.textContent?.trim() === "Summary",
          );
          if (!summary) {
            throw new Error("missing Summary heading");
          }
          const chart = document.querySelector(
            '[data-training-signal-chart="ready"]',
          );
          const timeline = Array.from(document.querySelectorAll("h2")).find(
            (node) =>
              node.textContent?.includes(
                "How training signals accumulated over time",
              ),
          );
          const relatedDocs = document.querySelector(
            '[data-testid="blog-related-docs"]',
          );
          const tagLinks = Array.from(
            document.querySelectorAll('a[href^="/tags/"]'),
          ).filter((node) =>
            ["foundations", "alignment"].includes(
              node.getAttribute("href")?.replace("/tags/", "") ?? "",
            ),
          );

          const titleRect = readRect(title, "title");
          const summaryRect = readRect(summary, "summary");
          const chartRect = readRect(chart, "chart");
          const timelineRect = readRect(timeline ?? null, "timeline");
          const relatedDocsRect = readRect(relatedDocs, "related-docs");
          const tagRects = tagLinks.map((node, index) =>
            readRect(node, `tag-${index}`),
          );

          return {
            page: {
              clientWidth: pageClientWidth,
              scrollWidth: pageScrollWidth,
            },
            titleRect,
            summaryRect,
            chartRect,
            timelineRect,
            relatedDocsRect,
            tagRects,
          };
        });

        expect(layout.page.scrollWidth).toBeLessThanOrEqual(
          layout.page.clientWidth + 1,
        );
        expect(layout.titleRect.height).toBeGreaterThan(0);
        expect(layout.summaryRect.height).toBeGreaterThan(0);
        expect(layout.chartRect.height).toBeGreaterThan(0);
        expect(layout.timelineRect.height).toBeGreaterThan(0);
        expect(layout.relatedDocsRect.height).toBeGreaterThan(0);
        expect(layout.tagRects.length).toBeGreaterThanOrEqual(2);

        expect(layout.titleRect.bottom).toBeLessThanOrEqual(
          layout.summaryRect.top + 8,
        );
        expect(layout.summaryRect.bottom).toBeLessThanOrEqual(
          layout.chartRect.top + 8,
        );
        expect(layout.chartRect.bottom).toBeLessThanOrEqual(
          layout.timelineRect.top + 8,
        );
        expect(layout.timelineRect.bottom).toBeLessThanOrEqual(
          layout.relatedDocsRect.top + 8,
        );

        for (let index = 0; index < layout.tagRects.length; index += 1) {
          for (
            let other = index + 1;
            other < layout.tagRects.length;
            other += 1
          ) {
            expect(
              rectsOverlap(layout.tagRects[index], layout.tagRects[other]),
            ).toBe(false);
          }
        }

        await page.close();
      } finally {
        await closePlaywrightBrowserWithTimeout(browser);
        await session.cleanup();
      }
    },
    120_000,
  );
});
