import { describe, expect, test } from "bun:test";
import { loadPageAssets, resolvePageAssetWithMessages } from "./assets";
import {
  groupedQueryAttentionPageDir,
  loadPageMessages,
  tokenGlossaryPageDir,
} from "./messages";

const conceptTemplateSectionKeys = [
  "whatItIs",
  "whyItMatters",
  "simpleExample",
  "whereItAppears",
  "commonConfusions",
] as const;

const moduleTemplateSectionKeys = [
  "whatItIs",
  "whatItOptimizes",
  "practicalBenefit",
  "howItWorks",
] as const;

describe("Phase 1 colocated page fixtures", () => {
  test("grouped-query-attention messages align with the module template", async () => {
    const messages = await loadPageMessages(groupedQueryAttentionPageDir, "en");

    expect(messages.title.length).toBeGreaterThan(0);
    expect(messages.description.length).toBeGreaterThan(0);
    expect(messages.problemStatement?.length).toBeGreaterThan(0);
    expect(messages.coreIdea?.length).toBeGreaterThan(0);

    for (const key of moduleTemplateSectionKeys) {
      expect(messages.sections?.[key]?.title?.length).toBeGreaterThan(0);
      expect(messages.sections?.[key]?.body?.length).toBeGreaterThan(0);
    }

    expect(messages.assets?.computeFlow?.alt?.length).toBeGreaterThan(0);
    expect(messages.assets?.computeFlow?.caption?.length).toBeGreaterThan(0);
  });

  test("grouped-query-attention assets resolve with message-backed keys", async () => {
    const assets = await loadPageAssets(groupedQueryAttentionPageDir);
    const computeFlow = await resolvePageAssetWithMessages(
      groupedQueryAttentionPageDir,
      "computeFlow",
    );

    expect(assets.computeFlow?.type).toBe("graph");
    expect(computeFlow.type).toBe("graph");
    if (computeFlow.type !== "graph") {
      throw new Error("expected graph asset");
    }
    expect(computeFlow.altKey).toBe("assets.computeFlow.alt");
    expect(computeFlow.captionKey).toBe("assets.computeFlow.caption");
  });

  test("token glossary messages align with the concept template", async () => {
    const messages = await loadPageMessages(tokenGlossaryPageDir, "en");

    expect(messages.title).toBe("Token");
    expect(messages.description.length).toBeGreaterThan(0);
    expect(messages.problemStatement?.length).toBeGreaterThan(0);
    expect(messages.coreIdea?.length).toBeGreaterThan(0);

    for (const key of conceptTemplateSectionKeys) {
      expect(messages.sections?.[key]?.title?.length).toBeGreaterThan(0);
      expect(messages.sections?.[key]?.body?.length).toBeGreaterThan(0);
    }

    expect(messages.assets?.conceptMap?.alt?.length).toBeGreaterThan(0);
    expect(messages.assets?.conceptMap?.caption?.length).toBeGreaterThan(0);
  });

  test("token glossary assets resolve with message-backed keys", async () => {
    const assets = await loadPageAssets(tokenGlossaryPageDir);
    const conceptMap = await resolvePageAssetWithMessages(
      tokenGlossaryPageDir,
      "conceptMap",
    );

    expect(assets.conceptMap?.type).toBe("graph");
    expect(conceptMap.type).toBe("graph");
    if (conceptMap.type !== "graph") {
      throw new Error("expected graph asset");
    }
    expect(conceptMap.graphId).toBe("graph.token-concept-map");
    expect(conceptMap.altKey).toBe("assets.conceptMap.alt");
    expect(conceptMap.captionKey).toBe("assets.conceptMap.caption");
  });
});
