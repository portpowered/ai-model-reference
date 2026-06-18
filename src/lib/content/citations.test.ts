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

  test("getCitationById returns Vaswani attention paper with MLA text", () => {
    const citation = getCitationById("citation.attention-is-all-you-need");
    expect(citation?.title).toBe("Attention Is All You Need");
    expect(citation?.mla).toContain("Vaswani, Ashish, et al.");
    expect(citation?.url).toBe("https://arxiv.org/abs/1706.03762");
  });

  test("getCitationById returns Shazeer MQA paper with MLA text", () => {
    const citation = getCitationById("citation.shazeer-mqa-paper");
    expect(citation?.title).toBe(
      "Fast Transformer Decoding: One Write-Head is All You Need",
    );
    expect(citation?.mla).toContain("Shazeer, Noam.");
    expect(citation?.url).toBe("https://arxiv.org/abs/1911.02150");
  });

  test("getCitationById returns T5 paper with MLA text", () => {
    const citation = getCitationById("citation.raffel-t5");
    expect(citation?.title).toBe(
      "Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer",
    );
    expect(citation?.mla).toContain("Raffel, Colin, et al.");
    expect(citation?.url).toBe("https://arxiv.org/abs/1910.10683");
  });

  test("getCitationById returns YaRN paper with MLA text", () => {
    const citation = getCitationById("citation.peng-yarn");
    expect(citation?.title).toBe(
      "YaRN: Efficient Context Window Extension of Large Language Models",
    );
    expect(citation?.mla).toContain("Peng, Bowen, et al.");
    expect(citation?.url).toBe("https://arxiv.org/abs/2309.00071");
  });

  test("getCitationById returns LongRoPE paper with MLA text", () => {
    const citation = getCitationById("citation.ding-longrope");
    expect(citation?.title).toBe(
      "LongRoPE: Extending LLM Context Window Beyond 2 Million Tokens",
    );
    expect(citation?.mla).toContain("Ding, Yiran, et al.");
    expect(citation?.url).toBe("https://arxiv.org/abs/2402.13753");
  });

  test("listCitationRecords includes SuperHOT, positional interpolation, and LongRoPE citations", () => {
    const ids = listCitationRecords().map((record) => record.id);
    expect(ids).toContain("citation.kaiokendev-superhot");
    expect(ids).toContain("citation.chen-positional-interpolation");
    expect(ids).toContain("citation.ding-longrope");
  });
});
