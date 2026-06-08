import { describe, expect, test } from "bun:test";
import {
  exportClientBundleIncludesBootstrapFrom,
  resolveExportSearchBootstrapClientFrom,
} from "./verify-export-search-bootstrap-client-path";

describe("verify-export-search-bootstrap-client-path", () => {
  test("resolveExportSearchBootstrapClientFrom prefixes /api/search with basePath", () => {
    expect(resolveExportSearchBootstrapClientFrom("/ai-model-reference")).toBe(
      "/ai-model-reference/api/search",
    );
    expect(resolveExportSearchBootstrapClientFrom("")).toBe("/api/search");
  });

  test("exportClientBundleIncludesBootstrapFrom matches baked bootstrap literals", () => {
    const chunks = 'from:"/ai-model-reference/api/search",type:"static"';
    expect(
      exportClientBundleIncludesBootstrapFrom(
        chunks,
        "/ai-model-reference/api/search",
      ),
    ).toBe(true);
    expect(
      exportClientBundleIncludesBootstrapFrom(
        'from:"/other-site/search-bootstrap"',
        "/ai-model-reference/api/search",
      ),
    ).toBe(false);
  });
});
