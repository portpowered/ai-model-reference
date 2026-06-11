import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { HIDDEN_SIZE_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { expectGlossaryPresentationConvergence } from "@/lib/content/glossary-test-helpers";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = HIDDEN_SIZE_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("hidden size glossary page messages", () => {
  test("includes required localized fields without process-language callouts", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Hidden Size");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whyItMatters.body).toContain(
      "model capacity glossary entry",
    );
    expect(messages.callouts).toBeUndefined();
  });
});

describe("loadGlossaryPage hidden-size", () => {
  test("compiles MDX with localized title, related docs, and tag pills", async () => {
    const page = await loadGlossaryPage("hidden-size");

    expect(page.frontmatter.registryId).toBe("concept.hidden-size");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Hidden Size");

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
    expect(html).toContain("MLP expansion ratios");
    expect(html).not.toContain("Phase 1 bridge page");
    expect(html).not.toContain("Phase 2");
    expect(html).toContain('href="/tags/token-to-probability-chain"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
  });
});
