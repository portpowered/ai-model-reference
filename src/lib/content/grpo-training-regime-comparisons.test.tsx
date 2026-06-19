import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadTrainingRegimePageFromDisk } from "@/lib/content/training-regime-page-load";

describe("grpo training regime comparisons", () => {
  test("page explains nearby alignment methods and renders stable reader links", async () => {
    const page = await loadTrainingRegimePageFromDisk("grpo");
    const stream = await renderToReadableStream(
      createElement(
        ModulePageProviders,
        {
          messages: page.messages,
          assets: page.assets,
        },
        page.content,
      ),
    );
    await stream.allReady;
    const html = await new Response(stream).text();
    const normalizedHtml = html.toLowerCase();

    expect(page.frontmatter.registryId).toBe("training-regime.grpo");
    expect(normalizedHtml).toContain(
      "reinforcement learning from human feedback",
    );
    expect(html).toContain("Proximal Policy Optimization");
    expect(html).toContain("Direct Preference Optimization");
    expect(html).toContain("pairwise objective");
    expect(html).toContain("relative ranking inside one sampled group");
    expect(html).toContain(">Alignment<");
    expect(html).toContain(">RLHF<");
    expect(html).toContain(">PPO<");
    expect(html).toContain(">DPO<");
    expect(html).toContain('href="/docs/glossary/alignment"');
    expect(html).toContain('href="/search?q=ppo"');
    expect(html).toContain('href="/search?q=dpo"');
  });

  test("page renders the graph title, legend, and symbol-only math definitions for the GRPO loop", async () => {
    const page = await loadTrainingRegimePageFromDisk("grpo");
    const stream = await renderToReadableStream(
      createElement(
        ModulePageProviders,
        {
          messages: page.messages,
          assets: page.assets,
        },
        page.content,
      ),
    );
    await stream.allReady;
    const html = await new Response(stream).text();

    expect(html).toContain("GRPO training flow");
    expect(html).toContain("Graph legend");
    expect(html).toContain("One prompt anchors the whole local comparison.");
    expect(html).toContain('data-page-math-variable-definitions="inline"');
    expect(html).toContain("normalized advantage for sampled answer i");
    expect(html).toContain("reward score assigned to sampled answer i");
    expect(html).toContain("number of sampled answers in the comparison group");
  });
});
