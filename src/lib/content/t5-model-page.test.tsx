/**
 * Retained per derived-page-validation policy: T5 route rendering, derived
 * related docs, module list, training summary, tags, and citations cannot be
 * expressed as derived bundle invariants.
 */
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";
import { getModelById } from "@/lib/content/registry-runtime";

describe("t5 model page discovery surfaces", () => {
  test("registry keeps T5 relative position bias as an explicit curated discovery path", () => {
    const record = getModelById("model.t5");
    expect(record?.relatedIds).toContain("module.t5-relative-position-bias");
    expect(record?.relatedIds).toContain(
      "training-regime.supervised-fine-tuning",
    );
  });

  test("derived related docs surface tokenization, position bias, and training links", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="model.t5"
        groups={[
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ]}
      />,
    );

    expect(
      html.match(/href="\/docs\/modules\/sentencepiece"/g) ?? [],
    ).toHaveLength(1);
    expect(
      html.match(/href="\/docs\/modules\/t5-relative-position-bias"/g) ?? [],
    ).toHaveLength(1);
    expect(
      html.match(/href="\/docs\/training\/pretraining"/g) ?? [],
    ).toHaveLength(1);
    expect(
      html.match(/href="\/docs\/training\/supervised-fine-tuning"/g) ?? [],
    ).toHaveLength(1);
    expect(html).toMatch(
      /data-related-group="curated-related"[\s\S]*href="\/docs\/modules\/t5-relative-position-bias"/,
    );
  });

  test("page renders related docs, modules, training, tags, and citations without empty placeholders", async () => {
    const page = await loadModelPage("t5");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).not.toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/sentencepiece"');
    expect(html).toContain('href="/docs/modules/t5-relative-position-bias"');
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/training/supervised-fine-tuning"');
    expect(html).toContain('id="important-modules"');
    expect(html).toContain('id="tags"');
    expect(html).toContain('id="references"');
    expect(html).not.toContain("No modules listed yet.");
    expect(html).not.toContain("No training regimes listed yet.");
    expect(html).toContain("Exploring the Limits of Transfer Learning");
  });
});
