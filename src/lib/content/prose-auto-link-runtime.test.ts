import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { ProseAutoLinkText } from "@/features/docs/components/ProseAutoLinkText";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { PROSE_AUTO_LINK_PHRASES } from "@/lib/content/prose-auto-link-runtime";

function resolvePhraseHref(phrase: string): string | undefined {
  const normalized = phrase.toLowerCase();
  return PROSE_AUTO_LINK_PHRASES.find(
    (entry) => entry.phrase.toLowerCase() === normalized,
  )?.href;
}

const BRIDGE_PHRASE_HREFS = [
  { phrase: "token", href: "/docs/glossary/token" },
  { phrase: "vector", href: "/docs/glossary/vector" },
  { phrase: "dense vector", href: "/docs/glossary/vector" },
  { phrase: "hidden size", href: "/docs/glossary/hidden-size" },
  { phrase: "model width", href: "/docs/glossary/hidden-size" },
  { phrase: "attention", href: "/docs/modules/attention" },
  { phrase: "self-attention", href: "/docs/concepts/self-attention" },
  { phrase: "low-bit inference", href: "/docs/concepts/quantization" },
  { phrase: "transformer model", href: "/docs/glossary/transformer" },
] as const;

describe("prose auto-link runtime bridge phrases", () => {
  test("published bridge aliases resolve to canonical glossary and module routes", () => {
    for (const { phrase, href } of BRIDGE_PHRASE_HREFS) {
      expect(resolvePhraseHref(phrase)).toBe(href);
    }
  });

  test("embedding glossary prose links vector and hidden size through auto-link", async () => {
    const page = await loadGlossaryPage("embedding");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/glossary/vector"');
    expect(html).toContain('href="/docs/glossary/hidden-size"');
    expect(html).toContain('data-prose-auto-link="true"');
  });

  test("ProseAutoLinkText links bridge phrases with word boundaries", () => {
    const html = renderToStaticMarkup(
      createElement(ProseAutoLinkText, {
        text: "A dense vector with model width matching hidden size uses attention, self-attention, and low-bit inference inside a transformer model.",
      }),
    );

    expect(html).toContain('href="/docs/glossary/vector"');
    expect(html).toContain('href="/docs/glossary/hidden-size"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/concepts/self-attention"');
    expect(html).toContain('href="/docs/concepts/quantization"');
    expect(html).toContain('href="/docs/glossary/transformer"');
  });
});
