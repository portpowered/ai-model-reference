import { describe, expect, test } from "bun:test";
import {
  getCitationById,
  listCitationRecords,
  resolveCitations,
} from "@/lib/content/citations";

describe("citations", () => {
  test("getCitationById returns GQA paper with MLA text", () => {
    const citation = getCitationById("citation.gqa-paper");
    expect(citation?.title).toContain("GQA");
    expect(citation?.mla).toContain("Ainslie, Joshua, et al.");
    expect(citation?.mla).toContain("https://arxiv.org/abs/2305.13245");
    expect(citation?.url).toBe("https://arxiv.org/abs/2305.13245");
  });

  test("resolveCitations preserves order and skips unknown IDs", () => {
    const resolved = resolveCitations([
      "citation.unknown",
      "citation.gqa-paper",
    ]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.id).toBe("citation.gqa-paper");
  });

  test("listCitationRecords includes fixture citation", () => {
    expect(
      listCitationRecords().some((r) => r.id === "citation.gqa-paper"),
    ).toBe(true);
  });
});
