import { describe, expect, test } from "bun:test";
import { DOCS_SEARCH_API_PATH } from "@/lib/search/docs-search-bootstrap-path";
import {
  EXPORT_SEARCH_BOOTSTRAP_RELATIVE_PATH,
  EXPORT_SEARCH_BOOTSTRAP_ROUTE,
  localizedExportSearchBootstrapRelativePath,
  resolveExportSearchBootstrapFilePath,
} from "./export-search-bootstrap";

describe("export search bootstrap paths", () => {
  test("bootstrap route matches the static search client fetch path", () => {
    expect(EXPORT_SEARCH_BOOTSTRAP_ROUTE).toBe(DOCS_SEARCH_API_PATH);
    expect(EXPORT_SEARCH_BOOTSTRAP_ROUTE).toBe("/api/search");
  });

  test("resolveExportSearchBootstrapFilePath maps to out/api/search", () => {
    expect(resolveExportSearchBootstrapFilePath("out", "/repo")).toBe(
      "/repo/out/api/search",
    );
    expect(resolveExportSearchBootstrapFilePath("out", "/repo", "vi")).toBe(
      "/repo/out/api/search.vi",
    );
    expect(resolveExportSearchBootstrapFilePath("out", "/repo", "ja")).toBe(
      "/repo/out/api/search.ja",
    );
    expect(EXPORT_SEARCH_BOOTSTRAP_RELATIVE_PATH).toBe("api/search");
  });

  test("localizedExportSearchBootstrapRelativePath suffixes non-default locales", () => {
    expect(localizedExportSearchBootstrapRelativePath("en")).toBe("api/search");
    expect(localizedExportSearchBootstrapRelativePath("vi")).toBe(
      "api/search.vi",
    );
    expect(localizedExportSearchBootstrapRelativePath("ja")).toBe(
      "api/search.ja",
    );
  });
});
