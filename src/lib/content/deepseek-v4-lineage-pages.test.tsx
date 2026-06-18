import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { RegistryAssociatedRecords } from "@/features/docs/components/RegistryAssociatedRecords";
import { loadModelPage } from "@/lib/content/model-page";

describe("DeepSeek-V4 paper lineage", () => {
  test("does not present on-policy distillation as an introduced record", () => {
    const html = renderToStaticMarkup(
      <RegistryAssociatedRecords
        registryId="paper.deepseek-v4"
        groups={[
          {
            id: "introduced",
            title: "Introduced records",
            fields: ["introducesIds"],
            emptyLabel: "No introduced records listed yet.",
            defaultOpen: true,
          },
        ]}
      />,
    );

    expect(html).toContain("DeepSeek-V4-Pro");
    expect(html).toContain('href="/docs/training/specialist-training"');
    expect(html).not.toContain("On-Policy Distillation");
  });

  test("paper copy distinguishes V4-specific work from earlier lineage", async () => {
    const { loadPaperPage } = await import("@/lib/content/paper-page");
    const page = await loadPaperPage("deepseek-v4");

    expect(page.messages.openingSummary).toContain(
      "combine new V4-specific modules with older techniques",
    );
    expect(page.messages.sections?.whatThePaperIntroduced.body).toContain(
      "uses earlier ideas such as on-policy distillation",
    );
    expect(page.messages.sections?.methodOrArchitecture.body).toContain(
      "multi-head latent attention from DeepSeek-V2",
    );
  });
});

describe("DeepSeek-V4 model lineage", () => {
  test("DeepSeek-V4-Pro copy says on-policy distillation and MLA predate V4", async () => {
    const page = await loadModelPage("deepseek-v4-pro");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("V4-specific additions");
    expect(html).toContain("earlier DeepSeek-V2");
    expect(html).toContain("multi-head latent attention");
    expect(html).toContain("on-policy distillation predates V4");
  });

  test("DeepSeek-V4-Flash copy says reused training and MLA lineage is older than V4", async () => {
    const page = await loadModelPage("deepseek-v4-flash");
    expect(page.messages.openingSummary).toContain(
      "older techniques reused from earlier work",
    );

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("earlier DeepSeek-V2 work");
    expect(html).toContain("adopts rather than invents");
  });
});
