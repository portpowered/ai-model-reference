import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { httpGetText } from "./http-harness";
import { createStaticExportHttpServer } from "./static-export-http-server";

describe("createStaticExportHttpServer", () => {
  test("serves index, route HTML, and api/search bootstrap JSON", async () => {
    const root = mkdtempSync(join(tmpdir(), "static-export-server-"));
    writeFileSync(join(root, "index.html"), "<html>home</html>");
    writeFileSync(join(root, "search.html"), "<html>search</html>");
    mkdirSync(join(root, "api"), { recursive: true });
    writeFileSync(
      join(root, "api", "search"),
      JSON.stringify({ type: "advanced", ok: true }),
    );

    const session = await createStaticExportHttpServer({
      outDir: root,
      port: 3188,
    });

    try {
      const home = await httpGetText(`${session.baseUrl}/`);
      expect(home.status).toBe(200);
      expect(home.body).toContain("home");

      const search = await httpGetText(`${session.baseUrl}/search`);
      expect(search.status).toBe(200);
      expect(search.body).toContain("search");

      const bootstrap = await httpGetText(`${session.baseUrl}/api/search`);
      expect(bootstrap.status).toBe(200);
      expect(bootstrap.body).toContain('"type":"advanced"');
    } finally {
      await session.cleanup();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
