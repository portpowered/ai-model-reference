import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  AssetLoadError,
  loadPageAssets,
  resolvePageAsset,
  resolvePageAssetWithMessages,
} from "./assets";
import {
  getMessageString,
  groupedQueryAttentionPageDir,
  loadPageMessages,
  tokenGlossaryPageDir,
} from "./messages";

const validAssetConfig = {
  computeFlow: {
    type: "graph" as const,
    graphId: "graph.example-compute-flow",
    webRenderer: "react-flow" as const,
    printRenderer: "mermaid" as const,
    altKey: "assets.computeFlow.alt",
    captionKey: "assets.computeFlow.caption",
  },
};

describe("loadPageAssets", () => {
  test("loads baseline grouped-query-attention assets.json", async () => {
    const config = await loadPageAssets(groupedQueryAttentionPageDir);

    expect(config.computeFlow).toMatchObject({
      type: "graph",
      graphId: "graph.grouped-query-attention-compute-flow",
      webRenderer: "react-flow",
      printRenderer: "mermaid",
    });
  });

  test("loads baseline token glossary assets.json", async () => {
    const config = await loadPageAssets(tokenGlossaryPageDir);

    expect(config.conceptMap).toMatchObject({
      type: "graph",
      graphId: "graph.token-concept-map",
      webRenderer: "react-flow",
      printRenderer: "mermaid",
    });
  });
});

describe("resolvePageAsset", () => {
  test("resolves computeFlow with graph renderer fields", async () => {
    const asset = await resolvePageAsset(
      groupedQueryAttentionPageDir,
      "computeFlow",
    );

    expect(asset.type).toBe("graph");
    if (asset.type !== "graph") {
      throw new Error("expected graph asset");
    }
    expect(asset.graphId).toBe("graph.grouped-query-attention-compute-flow");
    expect(asset.webRenderer).toBe("react-flow");
    expect(asset.printRenderer).toBe("mermaid");
    expect(asset.altKey).toBe("assets.computeFlow.alt");
    expect(asset.captionKey).toBe("assets.computeFlow.caption");
  });
});

describe("resolvePageAssetWithMessages", () => {
  test("resolves graph altKey against default-locale messages for baseline pages", async () => {
    const moduleAsset = await resolvePageAssetWithMessages(
      groupedQueryAttentionPageDir,
      "computeFlow",
    );
    const moduleMessages = await loadPageMessages(
      groupedQueryAttentionPageDir,
      "en",
    );

    expect(moduleAsset.type).toBe("graph");
    if (moduleAsset.type !== "graph" || !moduleAsset.altKey) {
      throw new Error("expected graph asset with altKey");
    }
    expect(getMessageString(moduleMessages, moduleAsset.altKey)).toBe(
      moduleMessages.assets?.computeFlow?.alt,
    );

    const glossaryAsset = await resolvePageAssetWithMessages(
      tokenGlossaryPageDir,
      "conceptMap",
    );
    const glossaryMessages = await loadPageMessages(tokenGlossaryPageDir, "en");

    expect(glossaryAsset.type).toBe("graph");
    if (glossaryAsset.type !== "graph" || !glossaryAsset.altKey) {
      throw new Error("expected graph asset with altKey");
    }
    expect(getMessageString(glossaryMessages, glossaryAsset.altKey)).toBe(
      glossaryMessages.assets?.conceptMap?.alt,
    );
  });

  test("resolves image altKey to a string in default-locale messages", async () => {
    const tempPageDir = join(
      import.meta.dir,
      "__fixtures__",
      "page-asset-messages",
    );
    await mkdir(tempPageDir, { recursive: true });
    await mkdir(join(tempPageDir, "messages"), { recursive: true });
    await writeFile(
      join(tempPageDir, "messages", "en.json"),
      JSON.stringify({
        title: "Fixture",
        description: "Fixture page for image alt resolution.",
        assets: {
          hero: { alt: "Diagram of the fixture concept." },
        },
      }),
    );
    await writeFile(
      join(tempPageDir, "assets.json"),
      JSON.stringify({
        hero: {
          type: "image",
          src: "./assets/hero.png",
          altKey: "assets.hero.alt",
        },
      }),
    );

    const asset = await resolvePageAssetWithMessages(tempPageDir, "hero");
    const messages = await loadPageMessages(tempPageDir, "en");

    expect(asset.type).toBe("image");
    if (asset.type !== "image") {
      throw new Error("expected image asset");
    }
    expect(getMessageString(messages, asset.altKey)).toBe(
      "Diagram of the fixture concept.",
    );

    await rm(tempPageDir, { recursive: true, force: true });
  });
});

describe("loadPageAssets errors", () => {
  const tempPageDir = join(import.meta.dir, "__fixtures__", "page-assets");

  afterEach(async () => {
    await rm(tempPageDir, { recursive: true, force: true });
  });

  async function writeAssetsFixture(content: string | Record<string, unknown>) {
    await rm(tempPageDir, { recursive: true, force: true });
    await mkdir(tempPageDir, { recursive: true });
    const body =
      typeof content === "string" ? content : JSON.stringify(content);
    await writeFile(join(tempPageDir, "assets.json"), body);
  }

  test("throws when assets.json is missing", async () => {
    await mkdir(tempPageDir, { recursive: true });

    await expect(loadPageAssets(tempPageDir)).rejects.toMatchObject({
      name: "AssetLoadError",
      message: expect.stringContaining("Missing colocated assets file"),
      details: [expect.objectContaining({ type: "missing-file" })],
    });
  });

  test("throws when assets fail schema validation", async () => {
    await writeAssetsFixture({
      computeFlow: {
        type: "graph",
        graphId: "",
        webRenderer: "react-flow",
        printRenderer: "mermaid",
      },
    });

    await expect(loadPageAssets(tempPageDir)).rejects.toMatchObject({
      name: "AssetLoadError",
      message: expect.stringContaining("schema validation failed"),
    });
  });

  test("throws when assets JSON is invalid", async () => {
    await writeAssetsFixture("{ not-json");

    await expect(loadPageAssets(tempPageDir)).rejects.toBeInstanceOf(
      AssetLoadError,
    );
  });

  test("loads valid assets from a custom page directory fixture", async () => {
    await writeAssetsFixture(validAssetConfig);
    const config = await loadPageAssets(tempPageDir);
    expect(config.computeFlow?.type).toBe("graph");
  });
});

describe("resolvePageAssetWithMessages errors", () => {
  const tempPageDir = join(
    import.meta.dir,
    "__fixtures__",
    "page-asset-missing-alt",
  );

  afterEach(async () => {
    await rm(tempPageDir, { recursive: true, force: true });
  });

  test("throws when image altKey does not resolve in default-locale messages", async () => {
    await mkdir(join(tempPageDir, "messages"), { recursive: true });
    await writeFile(
      join(tempPageDir, "messages", "en.json"),
      JSON.stringify({
        title: "Fixture",
        description: "Missing alt key.",
        assets: {},
      }),
    );
    await writeFile(
      join(tempPageDir, "assets.json"),
      JSON.stringify({
        hero: {
          type: "image",
          src: "./assets/hero.png",
          altKey: "assets.hero.alt",
        },
      }),
    );

    await expect(
      resolvePageAssetWithMessages(tempPageDir, "hero"),
    ).rejects.toMatchObject({
      name: "AssetLoadError",
      message: expect.stringContaining("assets.hero.alt"),
      details: [
        expect.objectContaining({
          type: "missing-message-key",
          assetId: "hero",
          messageKey: "assets.hero.alt",
        }),
      ],
    });
  });
});

describe("resolvePageAsset errors", () => {
  const tempPageDir = join(
    import.meta.dir,
    "__fixtures__",
    "page-asset-resolve",
  );

  afterEach(async () => {
    await rm(tempPageDir, { recursive: true, force: true });
  });

  test("throws a clear error for an unknown asset id", async () => {
    await mkdir(tempPageDir, { recursive: true });
    await writeFile(
      join(tempPageDir, "assets.json"),
      JSON.stringify(validAssetConfig),
    );

    await expect(
      resolvePageAsset(tempPageDir, "missingAsset"),
    ).rejects.toMatchObject({
      name: "AssetLoadError",
      message: expect.stringContaining('Unknown asset id "missingAsset"'),
      details: [
        expect.objectContaining({
          type: "unknown-asset-id",
          assetId: "missingAsset",
          availableIds: ["computeFlow"],
        }),
      ],
    });
  });
});
