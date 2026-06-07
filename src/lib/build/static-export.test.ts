import { describe, expect, test } from "bun:test";
import {
  isStaticExportBuild,
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
});
