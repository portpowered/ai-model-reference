import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";

const TOKEN_GLOSSARY_ROUTE = {
  path: "/docs/glossary/token",
  file: ".next/server/app/docs/glossary/token.html",
} as const;

function readBuiltRouteHtml(relativePath: string): string | null {
  const absolutePath = join(process.cwd(), relativePath);
  if (!existsSync(absolutePath)) {
    return null;
  }
  return readFileSync(absolutePath, "utf8");
}

function readBundledAppCss(): string | null {
  const cssRoots = [
    join(process.cwd(), ".next/static/css"),
    join(process.cwd(), ".next/static/chunks"),
  ];

  const cssFiles = cssRoots.flatMap((root) => {
    if (!existsSync(root)) {
      return [];
    }

    return readdirSync(root)
      .filter((name) => name.endsWith(".css"))
      .map((name) => join(root, name));
  });

  if (cssFiles.length === 0) {
    return null;
  }

  return cssFiles.map((file) => readFileSync(file, "utf8")).join("\n");
}

function extractFooterNavHtml(visibleHtml: string): string {
  const previousMarker = ">Previous Page<";
  const nextMarker = ">Next Page<";
  const previousIndex = visibleHtml.indexOf(previousMarker);
  const nextIndex = visibleHtml.indexOf(nextMarker);

  if (previousIndex === -1 && nextIndex === -1) {
    return "";
  }

  const start = Math.min(
    previousIndex === -1 ? Number.POSITIVE_INFINITY : previousIndex,
    nextIndex === -1 ? Number.POSITIVE_INFINITY : nextIndex,
  );

  const footerStart = visibleHtml.lastIndexOf("<a ", start);
  const footerEnd = visibleHtml.indexOf("</a>", start);

  if (footerStart === -1 || footerEnd === -1) {
    return "";
  }

  return visibleHtml.slice(footerStart, footerEnd + "</a>".length);
}

describe("docs page footer hover convergence (built HTML)", () => {
  test(`${TOKEN_GLOSSARY_ROUTE.path} footer cards include muted sublabels inside accent-hover anchors`, () => {
    const html = readBuiltRouteHtml(TOKEN_GLOSSARY_ROUTE.file);
    if (!html) {
      return;
    }

    const visibleHtml = stripHtmlScripts(html);
    expect(visibleHtml).toContain("Previous Page");
    expect(visibleHtml).toContain("Next Page");
    expect(visibleHtml).toMatch(
      /hover:text-fd-accent-foreground[\s\S]*text-fd-muted-foreground truncate[\s\S]*Previous Page/,
    );
    expect(visibleHtml).toMatch(
      /hover:text-fd-accent-foreground[\s\S]*text-fd-muted-foreground truncate[\s\S]*Next Page/,
    );

    const footerNav = extractFooterNavHtml(visibleHtml);
    expect(footerNav).toContain('class="text-fd-muted-foreground truncate"');
    expect(footerNav).toContain("hover:text-fd-accent-foreground");
  });

  test("bundled app CSS includes footer sublabel hover/focus inherit rule", () => {
    const bundledCss = readBundledAppCss();
    if (!bundledCss) {
      return;
    }

    expect(bundledCss).toContain("color:inherit");
    expect(bundledCss).toMatch(
      /#nd-page[\s\S]*hover\\:text-fd-accent-foreground[\s\S]*:focus-visible[\s\S]*text-fd-muted-foreground[\s\S]*color:inherit/,
    );
  });
});
