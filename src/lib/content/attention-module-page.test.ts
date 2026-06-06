import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { ATTENTION_MODULE_PAGE_DIR } from "@/lib/content/content-paths";
import { loadModulePage } from "@/lib/content/module-page";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = ATTENTION_MODULE_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("attention module bridge page messages", () => {
  test("includes required localized fields and Phase 1 bridge callout", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Attention");
    expect(messages.problemStatement?.length).toBeGreaterThan(0);
    expect(messages.coreIdea?.length).toBeGreaterThan(0);
    expect(messages.callouts?.phase1Bridge?.title).toBe("Phase 1 bridge page");
    expect(messages.callouts?.phase1Bridge?.body).toContain("Phase 3");
  });
});

describe("loadModulePage attention", () => {
  test("compiles MDX with localized title, bridge callout, and tag pills", async () => {
    const page = await loadModulePage("attention");

    expect(page.frontmatter.registryId).toBe("module.attention");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Attention");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Attention");
    expect(html).toContain("Phase 1 bridge page");
    expect(html).toContain("Full attention-variant coverage");
    expect(html).toContain("Phase 3");
    expect(html).toContain('data-registry-id="module.attention"');
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('data-testid="tag-pill-list"');
  });
});
