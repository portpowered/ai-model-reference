import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderBrowseIndexPage } from "@/app/(site)/site-renderers";
import {
  getModuleById,
  listClassificationMembers,
} from "@/lib/content/registry-runtime";
import {
  getSidebarGroupLabel,
  resolveModulesSidebarGroupWithSource,
} from "@/lib/content/sidebar-grouping";
import {
  getTopologyClassificationSummary,
  getTopologyNavigationLabels,
  listTopologyNavigationOptions,
} from "@/lib/content/topology-navigation";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { source } from "@/lib/source";

describe("tokenizer and positional embedding module family split (tokenizers-001)", () => {
  test("topology browse exposes tokenizers and positional embeddings as separate classifications", async () => {
    const messages = await loadUiMessages();
    const labels = getTopologyNavigationLabels(messages);
    const options = listTopologyNavigationOptions({ labels });

    const tokenizers = options.find(
      (option) =>
        option.classificationId === "classification.module.tokenization",
    );
    const positional = options.find(
      (option) =>
        option.classificationId === "classification.module.positional-encoding",
    );

    expect(tokenizers?.classificationSlug).toBe("tokenization-methods");
    expect(positional?.classificationSlug).toBe("position-encoding-methods");
    expect(tokenizers?.label).toBe("Tokenizers");
    expect(positional?.label).toBe("Positional Embeddings");
    expect(tokenizers?.label).not.toBe(positional?.label);
    expect(
      getTopologyClassificationSummary("tokenization-methods", labels),
    ).toContain("discrete units");
    expect(
      getTopologyClassificationSummary("position-encoding-methods", labels),
    ).toContain("order, distance");
  });

  test("sidebar navigation groups tokenizer and positional modules under separate headings", () => {
    const modulesFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Modules",
    );
    expect(modulesFolder?.type).toBe("folder");
    if (modulesFolder?.type !== "folder") {
      throw new Error("expected Modules folder in docs sidebar");
    }

    const separatorLabels = modulesFolder.children
      .filter((node) => node.type === "separator")
      .map((node) => node.name);

    expect(separatorLabels).toContain("Tokenizers");
    expect(separatorLabels).toContain("Positional Embeddings");
    expect(separatorLabels).not.toContain("Positional And Sequence Encoding");

    const tokenIndex = separatorLabels.indexOf("Tokenizers");
    const positionalIndex = separatorLabels.indexOf("Positional Embeddings");
    expect(tokenIndex).toBeGreaterThanOrEqual(0);
    expect(positionalIndex).toBeGreaterThanOrEqual(0);
    expect(tokenIndex).not.toBe(positionalIndex);
  });

  test("representative tokenizer and positional modules resolve to distinct sidebar groups", () => {
    expect(
      resolveModulesSidebarGroupWithSource(
        getModuleById("module.bpe") ?? { primaryClassificationId: undefined },
      ),
    ).toEqual({
      groupId: "tokenizers",
      source: "derived-taxonomy",
    });
    expect(
      resolveModulesSidebarGroupWithSource(
        getModuleById("module.rope") ?? { primaryClassificationId: undefined },
      ),
    ).toEqual({
      groupId: "positional-embeddings",
      source: "derived-taxonomy",
    });
    expect(getSidebarGroupLabel("modules", "tokenizers")).toBe("Tokenizers");
    expect(getSidebarGroupLabel("modules", "positional-embeddings")).toBe(
      "Positional Embeddings",
    );
  });

  test("classification membership keeps tokenizer and positional families disjoint", () => {
    const tokenizerMembers = listClassificationMembers(
      "classification.module.tokenization",
    ).map((member) => member.record.id);
    const positionalMembers = listClassificationMembers(
      "classification.module.positional-encoding",
    ).map((member) => member.record.id);

    expect(tokenizerMembers).toContain("module.bpe");
    expect(positionalMembers).toContain("module.rope");
    expect(positionalMembers).toContain("module.nope");
    expect(tokenizerMembers).not.toContain("module.rope");
    expect(positionalMembers).not.toContain("module.bpe");
  });

  test("browse page renders tokenizer and positional family summaries on first load", async () => {
    const page = await renderBrowseIndexPage(undefined, {
      searchParams: Promise.resolve({
        classification: "tokenization-methods",
        mode: "graph-map",
      }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Tokenizers Graph Map");
    expect(html).toContain(
      "Tokenizer modules convert raw text, bytes, or image patches into discrete units the model can consume.",
    );
    expect(html).toContain(
      'href="/browse?classification=position-encoding-methods&amp;mode=graph-map"',
    );
    expect(html).not.toContain("Positional And Sequence Encoding");
  });
});
