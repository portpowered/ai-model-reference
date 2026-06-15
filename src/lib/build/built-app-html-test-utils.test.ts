import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  normalizeBuiltAppHtmlInternalPaths,
  readBuiltAppServerHtml,
} from "@/lib/build/built-app-html-test-utils";
import { writeBuildSourceFingerprint } from "@/lib/verify/build-source-fingerprint";
import { VERIFY_PRODUCTION_INTEGRATION_TESTS_ENV } from "@/lib/verify/server-lifecycle";

describe("normalizeBuiltAppHtmlInternalPaths", () => {
  test("strips GitHub Pages base path from internal hrefs", () => {
    const html =
      '<a href="/ai-model-reference/docs/glossary/vector">vector</a><a href="/docs/glossary/token">token</a>';
    expect(normalizeBuiltAppHtmlInternalPaths(html)).toBe(
      '<a href="/docs/glossary/vector">vector</a><a href="/docs/glossary/token">token</a>',
    );
  });

  test("leaves unprefixed production HTML unchanged", () => {
    const html = '<a href="/docs/glossary/vector">vector</a>';
    expect(normalizeBuiltAppHtmlInternalPaths(html)).toBe(html);
  });
});

describe("readBuiltAppServerHtml", () => {
  test("returns null when production integration tests are not opted in", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "built-app-html-trust-"));
    mkdirSync(join(projectRoot, ".next", "server", "app", "docs", "glossary"), {
      recursive: true,
    });
    writeFileSync(join(projectRoot, ".next", "BUILD_ID"), "fixture");
    writeFileSync(
      join(
        projectRoot,
        ".next",
        "server",
        "app",
        "docs",
        "glossary",
        "token.html",
      ),
      "<html>token</html>",
    );

    try {
      expect(
        readBuiltAppServerHtml("docs/glossary/token.html", projectRoot),
      ).toBeNull();
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test("reads HTML when integration tests are opted in and fingerprint matches", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "built-app-html-read-"));
    mkdirSync(join(projectRoot, "src"), { recursive: true });
    writeFileSync(join(projectRoot, "package.json"), '{"name":"fixture"}\n');
    writeFileSync(join(projectRoot, "src", "app.ts"), "export {};\n");
    mkdirSync(join(projectRoot, ".next", "server", "app", "docs", "glossary"), {
      recursive: true,
    });
    writeFileSync(join(projectRoot, ".next", "BUILD_ID"), "fixture");
    writeFileSync(
      join(
        projectRoot,
        ".next",
        "server",
        "app",
        "docs",
        "glossary",
        "token.html",
      ),
      '<html><a href="/docs/glossary/vector">vector</a></html>',
    );
    writeBuildSourceFingerprint(projectRoot);
    const previous = process.env[VERIFY_PRODUCTION_INTEGRATION_TESTS_ENV];
    process.env[VERIFY_PRODUCTION_INTEGRATION_TESTS_ENV] = "1";

    try {
      expect(
        readBuiltAppServerHtml("docs/glossary/token.html", projectRoot),
      ).toContain('href="/docs/glossary/vector"');
    } finally {
      if (previous === undefined) {
        delete process.env[VERIFY_PRODUCTION_INTEGRATION_TESTS_ENV];
      } else {
        process.env[VERIFY_PRODUCTION_INTEGRATION_TESTS_ENV] = previous;
      }
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
