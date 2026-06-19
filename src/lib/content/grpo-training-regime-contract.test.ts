import { describe, expect, test } from "bun:test";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { getTrainingRegimeById } from "@/lib/content/registry-runtime.generated";
import { docsSearchApi } from "@/lib/search/search-server";
import { source } from "@/lib/source";

describe("grpo training regime contract", () => {
  test("canonical route, localized content, registry metadata, and discovery query resolve together", async () => {
    const [page, searchResults] = await Promise.all([
      loadLocalDocsPage({
        section: "training",
        slug: "grpo",
      }),
      docsSearchApi.search("group relative preference optimization"),
    ]);

    const route = source.getPage(["training", "grpo"]);
    const record = getTrainingRegimeById("training-regime.grpo");

    expect(route?.url).toBe("/docs/training/grpo");
    expect(record).toBeDefined();
    if (!record) {
      throw new Error("Expected training-regime.grpo registry record to exist");
    }
    expect(page.frontmatter.registryId).toBe(record.id);
    expect(page.messages.title).toBe("Group Relative Policy Optimization");
    expect(page.messages.openingSummary).toContain(
      "samples several answers to one prompt",
    );
    expect(page.messages.sections?.howItWorks?.body).toContain(
      "normalized within that group",
    );

    expect(record.kind).toBe("training-regime");
    expect(record.slug).toBe("grpo");
    expect(record.aliases).toEqual(
      expect.arrayContaining([
        "GRPO",
        "group relative preference optimization",
      ]),
    );
    expect(record.relatedIds).toContain("concept.alignment");
    expect(record.variantGroup).toBe("group-relative-reinforcement-learning");

    expect(searchResults[0]?.url).toBe("/docs/training/grpo");
  });
});
