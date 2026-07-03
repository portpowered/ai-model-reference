import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = getDocsPageDir("concepts", "text-to-image-conditioning");
const messagesPath = join(pageDir, "messages/en.json");
const CONCEPT_URL = "/docs/concepts/text-to-image-conditioning";

describe("text-to-image-conditioning concept page (text-to-image-conditioning-concept-page-002)", () => {
  test("messages teach conditioning mechanism, CLIP history, and denoising distinctions", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    const whatItIs = messages.sections?.whatItIs.body?.toLowerCase() ?? "";
    const simpleExample =
      messages.sections?.simpleExample.body?.toLowerCase() ?? "";
    const whereItAppears =
      messages.sections?.whereItAppears.body?.toLowerCase() ?? "";
    const commonConfusions =
      messages.sections?.commonConfusions.body?.toLowerCase() ?? "";

    expect(messages.openingSummary?.toLowerCase()).toContain(
      "extra information",
    );
    expect(whatItIs).toContain("extra information supplied");
    expect(whatItIs).toContain("text encoder");
    expect(whatItIs).toContain("vectors");
    expect(whatItIs).toContain("denoising updates");
    expect(whatItIs).toContain("guidance input");
    expect(whatItIs).toContain("denoising is the separate");

    expect(simpleExample).toContain("denoising step");
    expect(simpleExample).toContain("conditioning vectors");

    expect(whereItAppears).toContain("clip-style");
    expect(whereItAppears).toContain("contrastive");
    expect(whereItAppears).toContain("shared embedding");
    expect(whereItAppears).toContain("other text encoders");
    expect(whereItAppears).toContain("multimodal");

    expect(commonConfusions).toContain("prompt engineering");
    expect(commonConfusions).toContain("classifier-free guidance");
    expect(commonConfusions).toContain("clip");
    expect(commonConfusions).toContain("diffusion model objective");
    expect(commonConfusions).toContain("not the loss function");
  });

  test("page renders core teaching sections without missing-content placeholders", async () => {
    const page = await loadConceptPage("text-to-image-conditioning");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(
      "concept.text-to-image-conditioning",
    );

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("Simple Example");
    expect(html).toContain("Where It Appears");
    expect(html).toContain("Common Confusions");
    expect(html).toContain("extra information");
    expect(html).toContain("CLIP-style");
    expect(html).toContain("classifier-free guidance");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing content");
    expect(CONCEPT_URL).toBe("/docs/concepts/text-to-image-conditioning");
  });
});
