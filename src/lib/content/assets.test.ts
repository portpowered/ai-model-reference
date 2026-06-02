import { describe, expect, test } from "bun:test";
import assetFixture from "@/lib/content/__fixtures__/page-assets.json";
import messageFixture from "@/lib/content/__fixtures__/page-messages.json";
import {
  InvalidPageAssetConfigError,
  MissingAssetIdError,
  lookupAsset,
  parsePageAssetConfig,
  resolveAsset,
  resolveAssetText,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import type { PageAssetConfig, PageMessages } from "@/lib/content/schemas";

const assets = assetFixture as PageAssetConfig;
const messages = messageFixture as PageMessages;

describe("parsePageAssetConfig", () => {
  test("accepts a valid image and graph fixture", () => {
    expect(parsePageAssetConfig(assetFixture)).toEqual(assets);
  });

  test("rejects broken asset config at parse time", () => {
    expect(() =>
      parsePageAssetConfig({
        broken: { type: "image", src: "", altKey: "" },
      }),
    ).toThrow(InvalidPageAssetConfigError);
  });
});

describe("lookupAsset", () => {
  test("resolves an image-type asset", () => {
    const result = lookupAsset(assets, "hero");
    expect(result).toEqual({
      ok: true,
      assetId: "hero",
      asset: {
        type: "image",
        src: "./assets/gqa-hero.png",
        altKey: "assets.hero.alt",
        captionKey: "assets.hero.caption",
      },
    });
  });

  test("resolves a graph-type asset", () => {
    const result = lookupAsset(assets, "computeFlow");
    expect(result).toEqual({
      ok: true,
      assetId: "computeFlow",
      asset: {
        type: "graph",
        graphId: "graph.grouped-query-attention-compute-flow",
        webRenderer: "react-flow",
        printRenderer: "mermaid",
        altKey: "assets.computeFlow.alt",
        captionKey: "assets.computeFlow.caption",
      },
    });
  });

  test("reports missing asset IDs", () => {
    expect(lookupAsset(assets, "missingAsset")).toEqual({
      ok: false,
      assetId: "missingAsset",
      reason: "missing",
    });
  });
});

describe("resolveAsset", () => {
  test("returns the configured asset", () => {
    expect(resolveAsset(assets, "hero").type).toBe("image");
  });

  test("throws MissingAssetIdError for unknown IDs", () => {
    expect(() => resolveAsset(assets, "unknown")).toThrow(MissingAssetIdError);
  });
});

describe("resolveAssetText", () => {
  test("resolves alt and caption for an image asset", () => {
    const asset = resolveAsset(assets, "hero");
    expect(resolveAssetText(messages, asset)).toEqual({
      alt: "Diagram comparing multi-head attention and grouped-query attention head grouping.",
      caption:
        "Query heads share fewer key-value heads in grouped-query attention.",
    });
  });

  test("resolves alt and caption for a graph asset", () => {
    const asset = resolveAsset(assets, "computeFlow");
    expect(resolveAssetText(messages, asset)).toEqual({
      alt: "Compute flow diagram for grouped-query attention.",
      caption: "GQA compute flow from queries through shared KV heads.",
    });
  });
});

describe("validatePageAssetReferences", () => {
  test("returns no issues when message keys resolve", () => {
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });

  test("reports missing alt and caption keys", () => {
    const sparseMessages: PageMessages = {
      title: "Grouped-Query Attention",
      description: "Example",
    };
    const issues = validatePageAssetReferences(assets, sparseMessages);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((issue) => issue.field === "altKey")).toBe(true);
  });
});
