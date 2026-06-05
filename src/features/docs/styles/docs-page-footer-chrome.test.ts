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

describe("docs page footer chrome CSS contract", () => {
  test("footer card selector mirrors hover and focus-visible foreground on sublabel", () => {
    const normalizedCss = footerChromeCss.replaceAll(/\s+/g, " ");

    expect(footerChromeCss).toContain(docsPageFooterCardSelector);
    expect(normalizedCss).toContain(
      docsPageFooterSublabelInheritSelector.replaceAll(/\s+/g, " "),
    );
    expect(footerChromeCss).toContain("color: inherit");
    expect(footerChromeCss).toContain(":focus-visible");
    expect(footerChromeCss).toContain("var(--color-fd-accent-foreground)");
  });
});
