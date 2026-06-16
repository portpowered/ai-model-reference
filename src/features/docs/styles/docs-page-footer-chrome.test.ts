import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  docsPageFooterCardSelector,
  docsPageFooterSublabelInheritSelector,
} from "@/features/docs/styles/docs-page-footer-chrome";

const footerChromeCss = readFileSync(
  join(process.cwd(), "src/features/docs/styles/docs-page-footer-chrome.css"),
  "utf8",
);

function normalizeSelectorContract(value: string): string {
  return value.replaceAll(/\s+/g, "");
}

describe("docs page footer chrome CSS contract", () => {
  test("footer card selector targets accent-hover footer anchors with muted sublabels", () => {
    const normalizedCss = normalizeSelectorContract(footerChromeCss);

    expect(normalizedCss).toContain(
      normalizeSelectorContract(docsPageFooterCardSelector),
    );
    expect(normalizedCss).toContain(
      normalizeSelectorContract(docsPageFooterSublabelInheritSelector),
    );
    expect(footerChromeCss).toContain('class*="hover:bg-fd-accent"');
    expect(footerChromeCss).toContain(
      'class*="hover:text-fd-accent-foreground"',
    );
    expect(footerChromeCss).toContain("@layer utilities");
    expect(footerChromeCss).toContain("color: inherit");
    expect(footerChromeCss).toContain(":focus");
    expect(footerChromeCss).toContain(":focus-visible");
    expect(footerChromeCss).toContain("var(--color-fd-accent-foreground)");
    expect(footerChromeCss).toContain("outline-width: 2px");
    expect(footerChromeCss).toContain("box-shadow: 0 0 0 2px var(--ring)");
  });
});
