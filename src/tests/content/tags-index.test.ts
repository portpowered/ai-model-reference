import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderTagsIndexPage } from "@/app/(site)/site-renderers";
import {
  groupTagIndexEntriesByCategory,
  loadPublishedTagIndexEntries,
  loadPublishedTagIndexGroups,
  sortTagIndexEntriesByTitle,
  type TagIndexEntry,
} from "@/lib/content/tags";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("loadPublishedTagIndexEntries", () => {
  it("returns published tag records with localized title, summary, and landing links", async () => {
    const messages = await loadUiMessages();
    const entries = await loadPublishedTagIndexEntries(messages, "en");

    const attention = entries.find((entry) => entry.slug === "attention");
    expect(attention).toBeDefined();
    expect(attention?.title).toBe("Attention");
    expect(attention?.url).toBe("/tags/attention");
    expect(attention?.categoryLabel).toBe("Module type");
    expect(attention?.summary.length).toBeGreaterThan(0);

    const kvCache = entries.find((entry) => entry.slug === "kv-cache");
    expect(kvCache).toBeDefined();
    expect(kvCache?.title).toBe("KV Cache");
    expect(kvCache?.url).toBe("/tags/kv-cache");
    expect(kvCache?.categoryLabel).toBe("Inference");
  });

  it("sorts tags alphabetically by title within a flat list", async () => {
    const messages = await loadUiMessages();
    const entries = await loadPublishedTagIndexEntries(messages, "en");
    for (let index = 1; index < entries.length; index += 1) {
      expect(
        entries[index - 1].title.localeCompare(entries[index].title, "en", {
          sensitivity: "base",
        }),
      ).toBeLessThanOrEqual(0);
    }
  });
});

describe("groupTagIndexEntriesByCategory", () => {
  it("groups tags by category in schema order", async () => {
    const messages = await loadUiMessages();
    const groups = await loadPublishedTagIndexGroups(messages, "en");

    expect(groups.map((group) => group.category)).toEqual([
      "architecture",
      "module-type",
      "inference",
      "model-family",
    ]);
    expect(groups[0]?.tags.map((tag) => tag.slug)).toEqual([
      "foundations",
      "taxonomy",
      "token-to-probability-chain",
    ]);
    expect(groups[1]?.tags.map((tag) => tag.slug)).toEqual(["attention"]);
    expect(groups[2]?.tags.map((tag) => tag.slug)).toEqual([
      "context-window",
      "kv-cache",
      "quantization",
    ]);
    expect(groups[3]?.tags.map((tag) => tag.slug)).toEqual(["model-family"]);
  });

  it("sorts tags alphabetically by title inside each category group", () => {
    const entries: TagIndexEntry[] = [
      {
        slug: "kv-cache",
        title: "KV Cache",
        summary: "Key-value cache",
        url: "/tags/kv-cache",
        category: "inference",
        categoryLabel: "Inference",
      },
      {
        slug: "softmax",
        title: "Softmax",
        summary: "Normalization",
        url: "/tags/softmax",
        category: "inference",
        categoryLabel: "Inference",
      },
    ];

    const groups = groupTagIndexEntriesByCategory(entries);
    expect(groups[0]?.tags.map((tag) => tag.title)).toEqual([
      "KV Cache",
      "Softmax",
    ]);
  });
});

describe("sortTagIndexEntriesByTitle", () => {
  it("sorts entries alphabetically by title", () => {
    const entries: TagIndexEntry[] = [
      {
        slug: "kv-cache",
        title: "KV Cache",
        summary: "Cache",
        url: "/tags/kv-cache",
        category: "inference",
        categoryLabel: "Inference",
      },
      {
        slug: "attention",
        title: "Attention",
        summary: "Mechanisms",
        url: "/tags/attention",
        category: "architecture",
        categoryLabel: "Architecture",
      },
    ];

    expect(
      sortTagIndexEntriesByTitle(entries).map((entry) => entry.title),
    ).toEqual(["Attention", "KV Cache"]);
  });
});

describe("tags index messages", () => {
  it("loads localized copy for the tags index page", async () => {
    const messages = await loadUiMessages();
    expect(messages.tagsIndex.title).toBe("Tags");
    expect(messages.tagsIndex.description.length).toBeGreaterThan(0);
    expect(messages.tagCategories.architecture).toBe("Architecture");
  });
});

describe("tags index page render", () => {
  it("lists foundational, attention, and inference tags with category labels and landing links", async () => {
    const page = await renderTagsIndexPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Tags");
    expect(html).toContain("Foundations");
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain("Taxonomy");
    expect(html).toContain('href="/tags/taxonomy"');
    expect(html).toContain("Model family");
    expect(html).toContain('href="/tags/model-family"');
    expect(html).toContain("Token-to-probability chain");
    expect(html).toContain('href="/tags/token-to-probability-chain"');
    expect(html).toContain("Attention");
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain("Module type");
    expect(html).toContain("KV Cache");
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain("Quantization");
    expect(html).toContain('href="/tags/quantization"');
    expect(html).toContain("Inference");
    expect(html).not.toContain("mt-8");
    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
  });

  it("renders localized vietnamese tag titles, categories, and links", async () => {
    const page = await renderTagsIndexPage("vi");
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Thẻ");
    expect(html).toContain("Nền tảng");
    expect(html).toContain('href="/vi/tags/foundations"');
    expect(html).toContain("Attention");
    expect(html).toContain('href="/vi/tags/attention"');
    expect(html).toContain("Loại module");
    expect(html).toContain("Cửa sổ ngữ cảnh");
    expect(html).toContain('href="/vi/tags/context-window"');
    expect(html).toContain("Lượng tử hóa");
    expect(html).toContain('href="/vi/tags/quantization"');
    expect(html).toContain("Suy luận");
  });
});
