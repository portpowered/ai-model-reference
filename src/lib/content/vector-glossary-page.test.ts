import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { VECTOR_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { expectGlossaryPresentationConvergence } from "@/lib/content/glossary-test-helpers";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = VECTOR_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("vector glossary page messages", () => {
  test("includes required localized fields without process-language callouts", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Vector");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whyItMatters.body).toContain(
      "tensor and embedding glossary entries",
    );
    expect(messages.callouts).toBeUndefined();
  });
});

describe("loadGlossaryPage vector", () => {
  test("compiles MDX with localized title, related docs, and tag pills", async () => {
    const page = await loadGlossaryPage("vector");

    expect(page.frontmatter.registryId).toBe("concept.vector");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Vector");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryPresentationConvergence(html, {
      title: page.messages.title,
    });
    expect(html).toContain(
      "shape conventions, broadcasting, and framework dtypes",
    );
    expect(html).not.toContain("Phase 1 bridge page");
    expect(html).not.toContain("Phase 2");
    expect(html).toContain('href="/tags/token-to-probability-chain"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
  });
});
