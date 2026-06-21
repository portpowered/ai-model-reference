import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderTagLandingPage } from "@/app/(site)/site-renderers";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { TagLandingEmptyState } from "@/features/docs/tags/TagLandingEmptyState";
import {
  groupTagResourceEntriesByKind,
  loadTagLandingContext,
  loadTagResourceEntries,
  loadTagResourceGroups,
} from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("attention tag landing resources", () => {
  it("loads the attention tag record with localized title and summary", async () => {
    const messages = await loadUiMessages();
    const context = await loadTagLandingContext("attention", messages, "en");

    expect(context).toBeDefined();
    expect(context?.title).toBe("Attention");
    expect(context?.summary.length).toBeGreaterThan(0);
    expect(context?.categoryLabel).toBe("Module type");
  });

  it("includes causal-attention and grouped-query attention in the English module group", async () => {
    const messages = await loadUiMessages();
    const entries = await loadTagResourceEntries("attention", "en");
    const groupedQueryEntry = entries.find(
      (entry) => entry.url === "/docs/modules/grouped-query-attention",
    );
    const causalAttentionEntry = entries.find(
      (entry) => entry.url === "/docs/modules/causal-attention",
    );

    expect(groupedQueryEntry).toBeDefined();
    expect(groupedQueryEntry?.kind).toBe("module");
    expect(groupedQueryEntry?.title).toBe("Grouped-Query Attention");
    expect(causalAttentionEntry).toBeDefined();
    expect(causalAttentionEntry?.kind).toBe("module");
    expect(causalAttentionEntry?.title).toBe("Causal Attention");

    const groups = await loadTagResourceGroups("attention", messages, "en");
    const moduleGroup = groups.find((group) => group.kind === "module");

    expect(moduleGroup).toBeDefined();
    expect(moduleGroup?.kindLabel).toBe("Module");
    expect(moduleGroup?.resources.map((resource) => resource.url)).toEqual(
      expect.arrayContaining([
        "/docs/modules/attention",
        "/docs/modules/bidirectional-attention",
        "/docs/modules/causal-attention",
        "/docs/modules/grouped-query-attention",
      ]),
    );
  });

  it("omits empty kind groups and groups model, module, and glossary resources separately", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("attention", messages, "en");

    expect(groups.every((group) => group.resources.length > 0)).toBe(true);
    expect(groups.map((group) => group.kind)).toEqual([
      "model",
      "module",
      "paper",
      "glossary",
    ]);

    const modelGroup = groups.find((group) => group.kind === "model");
    expect(modelGroup?.resources.length).toBeGreaterThan(0);
    expect(
      modelGroup?.resources.some(
        (resource) => resource.url === "/docs/models/gpt-3",
      ),
    ).toBe(true);

    const paperGroup = groups.find((group) => group.kind === "paper");
    expect(paperGroup?.resources.length).toBeGreaterThan(0);
    expect(
      paperGroup?.resources.some(
        (resource) => resource.url === "/docs/papers/deepseek-v4",
      ),
    ).toBe(true);

    const glossaryGroup = groups.find((group) => group.kind === "glossary");
    expect(glossaryGroup?.resources[0]?.url).toBe(
      "/docs/glossary/autoregressive-generation",
    );
    expect(glossaryGroup?.resources.map((resource) => resource.url)).toEqual(
      expect.arrayContaining([
        "/docs/glossary/autoregressive-generation",
        "/docs/glossary/token",
      ]),
    );
  });

  it("sorts resources alphabetically by title within a kind group", async () => {
    const messages = await loadUiMessages();
    const groups = groupTagResourceEntriesByKind(
      [
        {
          title: "Zebra Module",
          summary: "Later alphabetically",
          url: "/docs/modules/zebra",
          slug: "zebra",
          kind: "module",
        },
        {
          title: "Alpha Module",
          summary: "Earlier alphabetically",
          url: "/docs/modules/alpha",
          slug: "alpha",
          kind: "module",
        },
      ],
      messages,
    );

    expect(groups[0]?.resources.map((resource) => resource.title)).toEqual([
      "Alpha Module",
      "Zebra Module",
    ]);
  });
});

describe("tag landing messages", () => {
  it("loads localized copy for tag landing pages", async () => {
    const messages = await loadUiMessages();
    expect(messages.tagLanding.listLabel.length).toBeGreaterThan(0);
    expect(messages.tagLanding.searchHandoff.length).toBeGreaterThan(0);
    expect(messages.tagLanding.searchEntryLink.length).toBeGreaterThan(0);
    expect(messages.tagLanding.emptyTitle.length).toBeGreaterThan(0);
  });
});

describe("tag landing empty state", () => {
  it("exposes accessible output, navigation links, and search handoff", async () => {
    const messages = await loadUiMessages();
    const html = renderToStaticMarkup(
      createElement(TagLandingEmptyState, {
        messages,
        tagSlug: "attention",
        searchQuery: "attention",
      }),
    );

    expect(html).toContain("<output");
    expect(html).toContain(messages.tagLanding.emptyTitle);
    expect(html).toContain(messages.tagLanding.emptyDescription);
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/tags"');
    expect(html).toContain("data-search");
    expect(html).toContain(messages.tagLanding.searchHandoff);
  });
});

describe("attention tag landing page render", () => {
  it("renders the English attention landing with causal-attention discovery links and search handoff", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "attention" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Attention");
    expect(html).toContain("Module");
    expect(html).toContain("Glossary");
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain("Causal Attention");
    expect(html).toContain('href="/docs/modules/causal-attention"');
    expect(html).toContain("Grouped-Query Attention");
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain("Autoregressive Generation");
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain("Token");
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/search?tag=attention"');
    expect(html).toContain("data-search");
    expect(html).not.toContain("mt-8");
    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
  });

  it("loads localized vietnamese tag copy and shipped vi resources", async () => {
    const messages = await loadUiMessages("vi");
    const context = await loadTagLandingContext("attention", messages, "vi");

    expect(context).toBeDefined();
    expect(context?.title).toBe("Attention");
    expect(context?.summary).toContain("Self-attention");

    const groups = await loadTagResourceGroups("attention", messages, "vi");
    expect(groups.map((group) => group.kind)).toEqual(["module", "glossary"]);
    expect(groups[0]?.resources.length).toBeGreaterThan(0);
    expect(
      groups[0]?.resources.some(
        (resource) => resource.url === "/vi/docs/modules/attention",
      ),
    ).toBe(true);
    expect(groups[1]?.resources.length).toBeGreaterThan(0);
    expect(
      groups[1]?.resources.some(
        (resource) =>
          resource.url === "/vi/docs/glossary/autoregressive-generation",
      ),
    ).toBe(true);
  });

  it("renders localized /vi attention landing content and locale-preserving links", async () => {
    const page = await renderTagLandingPage(
      {
        params: Promise.resolve({ slug: "attention" }),
      },
      "vi",
    );
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Tìm trong thẻ này");
    expect(html).toContain("Tài nguyên theo loại");
    expect(html).toContain('href="/vi/search?tag=attention"');
    expect(html).toContain('href="/vi/docs/modules/attention"');
    expect(html).toContain("Sinh tự hồi quy");
    expect(html).toContain(
      'href="/vi/docs/glossary/autoregressive-generation"',
    );
  });

  it("loads localized japanese tag copy and the shipped ja attention proof set", async () => {
    const messages = await loadUiMessages("ja");
    const context = await loadTagLandingContext("attention", messages, "ja");

    expect(context).toBeDefined();
    expect(context?.title).toBe("Attention");
    expect(context?.summary).toContain("自己注意");

    const groups = await loadTagResourceGroups("attention", messages, "ja");
    expect(groups.map((group) => group.kind)).toEqual(["module", "glossary"]);
    expect(groups[0]?.resources.map((resource) => resource.url)).toEqual([
      "/ja/docs/modules/attention",
      "/ja/docs/modules/grouped-query-attention",
      "/ja/docs/modules/sliding-window-attention",
      "/ja/docs/modules/multi-query-attention",
      "/ja/docs/modules/multi-head-attention",
      "/ja/docs/modules/linear-attention",
    ]);
    expect(groups[1]?.resources.map((resource) => resource.url)).toEqual([
      "/ja/docs/glossary/token",
    ]);
  });

  it("renders localized /ja attention landing content, includes the shipped proof set, and omits unshipped japanese attention links", async () => {
    const page = await renderTagLandingPage(
      {
        params: Promise.resolve({ slug: "attention" }),
      },
      "ja",
    );
    const html = renderToStaticMarkup(page);

    expect(html).toContain("このタグを検索");
    expect(html).toContain("種類別リソース");
    expect(html).toContain('href="/ja/search?tag=attention"');
    expect(html).toContain('href="/ja/docs/modules/attention"');
    expect(html).toContain('href="/ja/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/ja/docs/modules/linear-attention"');
    expect(html).toContain('href="/ja/docs/modules/multi-head-attention"');
    expect(html).toContain('href="/ja/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/ja/docs/modules/sliding-window-attention"');
    expect(html).toContain('href="/ja/docs/glossary/token"');
    expect(html).not.toContain(
      'href="/ja/docs/modules/multi-head-latent-attention"',
    );
    expect(html).not.toContain('href="/ja/docs/modules/sparse-attention"');
    expect(html).not.toContain(
      'href="/ja/docs/glossary/autoregressive-generation"',
    );
  });
});
