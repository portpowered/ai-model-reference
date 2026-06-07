import { describe, expect, test } from "bun:test";
import {
  GITHUB_PAGES_BASE_PATH_ENV,
  isStaticExportBuild,
  normalizeGitHubPagesBasePath,
  resolveGitHubPagesBasePath,
  resolveNextConfigForBuildMode,
  STATIC_EXPORT_ENV,
  staticExportNextConfig,
} from "./static-export";

describe("static export build mode", () => {
  test("is disabled unless NEXT_STATIC_EXPORT=1", () => {
    expect(isStaticExportBuild({})).toBe(false);
    expect(isStaticExportBuild({ [STATIC_EXPORT_ENV]: "0" })).toBe(false);
    expect(isStaticExportBuild({ [STATIC_EXPORT_ENV]: "1" })).toBe(true);
  });

  test("enables export output settings only in export mode", () => {
    expect(resolveNextConfigForBuildMode({})).toEqual({});
    expect(resolveNextConfigForBuildMode({ [STATIC_EXPORT_ENV]: "1" })).toEqual(
      staticExportNextConfig,
    );
  });

  test("static export config keeps images unoptimized for GitHub Pages", () => {
    expect(staticExportNextConfig.output).toBe("export");
    expect(staticExportNextConfig.images).toEqual({ unoptimized: true });
  });

  test("normalizes GitHub Pages base path values", () => {
    expect(normalizeGitHubPagesBasePath(undefined)).toBe("");
    expect(normalizeGitHubPagesBasePath("")).toBe("");
    expect(normalizeGitHubPagesBasePath("/")).toBe("");
    expect(normalizeGitHubPagesBasePath("ai-model-reference")).toBe(
      "/ai-model-reference",
    );
    expect(normalizeGitHubPagesBasePath("/ai-model-reference/")).toBe(
      "/ai-model-reference",
    );
  });

  test("reads base path only during static export builds", () => {
    expect(
      resolveGitHubPagesBasePath({
        [GITHUB_PAGES_BASE_PATH_ENV]: "/ai-model-reference",
      }),
    ).toBe("");
    expect(
      resolveGitHubPagesBasePath({
        [STATIC_EXPORT_ENV]: "1",
        [GITHUB_PAGES_BASE_PATH_ENV]: "ai-model-reference",
      }),
    ).toBe("/ai-model-reference");
  });

  test("applies basePath and assetPrefix during export when configured", () => {
    expect(
      resolveNextConfigForBuildMode({
        [STATIC_EXPORT_ENV]: "1",
        [GITHUB_PAGES_BASE_PATH_ENV]: "/ai-model-reference",
      }),
    ).toEqual({
      ...staticExportNextConfig,
      basePath: "/ai-model-reference",
      assetPrefix: "/ai-model-reference",
    });
  });
});
