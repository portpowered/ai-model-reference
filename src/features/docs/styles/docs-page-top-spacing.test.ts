import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const globalsCss = readFileSync(
  join(process.cwd(), "src/app/globals.css"),
  "utf8",
);

function normalizeCss(value: string): string {
  return value.replaceAll(/\s+/g, "");
}

describe("docs page top spacing CSS contract", () => {
  test("tightens the first article section under the page title", () => {
    const normalizedCss = normalizeCss(globalsCss);

    expect(normalizedCss).toContain(
      normalizeCss("article[data-registry-id] > section:first-of-type"),
    );
    expect(normalizedCss).toContain(normalizeCss("margin-top: 1rem;"));
    expect(normalizedCss).toContain(
      normalizeCss("article[data-registry-id] > section:first-of-type > h2"),
    );
    expect(normalizedCss).toContain(normalizeCss("margin-top: 0;"));
  });
});
