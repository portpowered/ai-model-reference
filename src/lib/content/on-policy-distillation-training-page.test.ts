import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CitationList } from "@/features/docs/components/CitationList";
import { RegistryAssociatedRecords } from "@/features/docs/components/RegistryAssociatedRecords";
import { TrainingRegimeAtAGlance } from "@/features/models/components/TrainingRegimeAtAGlance";
import { TRAINING_DOCS_ROOT } from "@/lib/content/content-paths";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";

const pageDir = join(TRAINING_DOCS_ROOT, "on-policy-distillation");
const messagesPath = join(pageDir, "messages/en.json");

describe("on-policy-distillation training page messages", () => {
  test("lead with the general method rather than DeepSeek as the origin", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("On-Policy Distillation");
    expect(messages.description).toBe(
      "A distillation regime where the student is refined on trajectories produced under its current policy rather than only on frozen offline traces.",
    );
    expect(messages.sections?.whatItIs.body).toContain(
      "general training method",
    );
    expect(messages.sections?.whatItIs.body).toContain("ICLR 2024");
    expect(messages.sections?.modelsAndPapers.body).toContain(
      "DeepSeek-V4 appears here as a paper and model that use the regime",
    );
  });
});

describe("loadTrainingRegimePage on-policy-distillation", () => {
  test("loads the training page bundle with the corrected origin description", async () => {
    const page = await loadTrainingRegimePage("on-policy-distillation");

    expect(page.frontmatter.registryId).toBe(
      "training-regime.on-policy-distillation",
    );
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("On-Policy Distillation");
    expect(page.messages.description).toBe(
      "A distillation regime where the student is refined on trajectories produced under its current policy rather than only on frozen offline traces.",
    );
  });

  test("renders corrected origin metadata in the at-a-glance card", async () => {
    const atAGlance = await TrainingRegimeAtAGlance({
      registryId: "training-regime.on-policy-distillation",
    });
    const html = renderToStaticMarkup(atAGlance);

    expect(html).toContain("January 2024");
    expect(html).toContain("Rishabh Agarwal, Nino Vieillard, Yongchao Zhou");
    expect(html).not.toContain("DeepSeek-AI");
  });

  test("renders origin citations separately from downstream DeepSeek usage", () => {
    const citationsHtml = renderToStaticMarkup(
      createElement(CitationList, {
        registryId: "training-regime.on-policy-distillation",
      }),
    );
    const associatedHtml = renderToStaticMarkup(
      createElement(RegistryAssociatedRecords, {
        registryId: "training-regime.on-policy-distillation",
        groups: [
          {
            id: "models",
            title: "Used by models",
            fields: ["usedByModelIds"],
            emptyLabel: "No linked models listed yet.",
            defaultOpen: true,
          },
          {
            id: "papers",
            title: "Paper sources",
            fields: ["paperIds"],
            emptyLabel: "No linked paper pages listed yet.",
            defaultOpen: true,
          },
        ],
      }),
    );

    expect(citationsHtml).toContain(
      "On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes",
    );
    expect(citationsHtml).toContain(
      'href="https://openreview.net/forum?id=3zKtaqxLhW"',
    );
    expect(citationsHtml).toContain("DeepSeek-V4 Technical Report");
    expect(associatedHtml).toContain("DeepSeek-V4-Pro");
    expect(associatedHtml).toContain('href="/docs/models/deepseek-v4-pro"');
    expect(associatedHtml).toContain('href="/docs/papers/deepseek-v4"');
  });
});
