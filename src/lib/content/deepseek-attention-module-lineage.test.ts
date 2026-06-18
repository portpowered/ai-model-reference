import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModulePage } from "@/lib/content/module-page";

async function renderModulePage(slug: string) {
  const page = await loadModulePage(slug);
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("DeepSeek attention module lineage", () => {
  test("MLA renders the DeepSeek-V2 citation metadata", async () => {
    const html = await renderModulePage("multi-head-latent-attention");

    expect(html).toContain("May 2024");
    expect(html).toContain(
      "DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model",
    );
    expect(html).toContain('href="https://arxiv.org/abs/2405.04434"');
  });

  test("CSA separates V4-specific variant language from earlier sparse-attention lineage", async () => {
    const html = await renderModulePage("compressed-sparse-attention");

    expect(html).toContain("builds on earlier");
    expect(html).toContain("ideas instead of replacing their history");
    expect(html).toContain("DeepSeek-V4 Technical Report");
    expect(html).toContain(
      "Generating Long Sequences with Sparse Transformers",
    );
    expect(html).toContain(
      "Native Sparse Attention: Hardware-Aligned and Natively Trainable Sparse Attention",
    );
  });

  test("HCA keeps earlier sparse-attention lineage separate from the V4-specific variant", async () => {
    const html = await renderModulePage("heavily-compressed-attention");

    expect(html).toContain("built on earlier");
    expect(html).toContain("than those earlier papers do");
    expect(html).toContain("DeepSeek-V4 Technical Report");
    expect(html).toContain(
      "Generating Long Sequences with Sparse Transformers",
    );
    expect(html).toContain(
      "Native Sparse Attention: Hardware-Aligned and Natively Trainable Sparse Attention",
    );
  });
});
