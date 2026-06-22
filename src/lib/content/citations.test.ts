import { describe, expect, test } from "bun:test";
import {
  getCitationById,
  listCitationRecords,
  resolveCitations,
} from "@/lib/content/citations";

const REPRESENTATIVE_CITATIONS = [
  {
    id: "citation.gqa-paper",
    title: "GQA",
    mla: "Ainslie, Joshua, et al.",
    url: "https://arxiv.org/abs/2305.13245",
  },
  {
    id: "citation.attention-is-all-you-need",
    title: "Attention Is All You Need",
    mla: "Vaswani, Ashish, et al.",
    url: "https://arxiv.org/abs/1706.03762",
  },
  {
    id: "citation.shazeer-mqa-paper",
    title: "Fast Transformer Decoding: One Write-Head is All You Need",
    mla: "Shazeer, Noam.",
    url: "https://arxiv.org/abs/1911.02150",
  },
  {
    id: "citation.raffel-t5",
    title:
      "Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer",
    mla: "Raffel, Colin, et al.",
    url: "https://arxiv.org/abs/1910.10683",
  },
  {
    id: "citation.gpt-2-report",
    title: "Language Models are Unsupervised Multitask Learners",
    mla: "Radford, Alec, et al.",
    url: "https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf",
  },
  {
    id: "citation.peng-yarn",
    title: "YaRN: Efficient Context Window Extension of Large Language Models",
    mla: "Peng, Bowen, et al.",
    url: "https://arxiv.org/abs/2309.00071",
  },
  {
    id: "citation.ding-longrope",
    title: "LongRoPE: Extending LLM Context Window Beyond 2 Million Tokens",
    mla: "Ding, Yiran, et al.",
    url: "https://arxiv.org/abs/2402.13753",
  },
] as const;

describe("citations", () => {
  test("resolveCitations preserves order and skips unknown IDs", () => {
    const resolved = resolveCitations([
      "citation.unknown",
      "citation.gqa-paper",
    ]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.id).toBe("citation.gqa-paper");
  });

  test("representative citation lookups preserve existing caller-visible metadata", () => {
    for (const fixture of REPRESENTATIVE_CITATIONS) {
      const citation = getCitationById(fixture.id);
      expect(citation?.title).toContain(fixture.title);
      expect(citation?.mla).toContain(fixture.mla);
      expect(citation?.url).toBe(fixture.url);
    }
  });

  test("listCitationRecords round-trips representative citation lookups without a committed inventory assertion", () => {
    const records = listCitationRecords();
    const ids = new Set(records.map((record) => record.id));

    expect(records.length).toBeGreaterThan(0);
    expect(ids.size).toBe(records.length);
    for (const fixture of REPRESENTATIVE_CITATIONS) {
      expect(ids.has(fixture.id)).toBe(true);
      expect(records.find((record) => record.id === fixture.id)).toEqual(
        getCitationById(fixture.id),
      );
    }
  });
});
