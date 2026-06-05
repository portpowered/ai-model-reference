import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  TAG_LIST_CUSTOMER_ASK_CHECKS,
  TAG_LIST_CUSTOMER_ASK_REASONS,
  TAG_LIST_CUSTOMER_ASK_ROUTES,
} from "./customer-ask-tag-list-convergence";
import { runCustomerAskTagListChecks } from "./customer-ask-tag-list-convergence-http";

const POST_REPAIR_TAGS_INDEX_HTML = `
  <section class="flex flex-col gap-8" aria-label="Tags">
    <section aria-labelledby="tag-category-module-type">
      <h2 id="tag-category-module-type">Module type</h2>
      <ul class="mt-3 flex list-none flex-col gap-3">
        <li><a href="/tags/attention">Attention</a></li>
      </ul>
    </section>
  </section>
`;

const POST_REPAIR_ATTENTION_LANDING_HTML = `
  <section class="flex flex-col gap-8" aria-label="Resources">
    <section aria-labelledby="tag-resources-module">
      <h2 id="tag-resources-module">Module</h2>
      <ul class="mt-3 flex list-none flex-col gap-3">
        <li><a href="/docs/modules/grouped-query-attention">Grouped-Query Attention</a></li>
      </ul>
    </section>
  </section>
`;

const PRE_REPAIR_TAGS_INDEX_HTML = `
  <section class="mt-8 flex flex-col gap-8" aria-label="Tags">
    <section aria-labelledby="tag-category-module-type">
      <h2 id="tag-category-module-type">Module type</h2>
      <ul class="mt-3 flex list-disc flex-col gap-3">
        <li><a href="/tags/attention">Attention</a></li>
      </ul>
    </section>
  </section>
`;

function listenOnEphemeralPort(
  httpServer: ReturnType<typeof createHttpServer>,
): Promise<number> {
  return new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", () => {
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        reject(new Error("Expected bound TCP port"));
        return;
      }
      resolve(address.port);
    });
  });
}

function createTagListStubServer(
  htmlByPath: Record<string, string>,
  statusByPath: Record<string, number> = {},
): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "/";
    const status = statusByPath[path] ?? 200;
    const body = htmlByPath[path] ?? "<html>not found</html>";
    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  });
}

describe("runCustomerAskTagListChecks", () => {
  test("returns all pass rows when stub server serves post-repair tag routes", async () => {
    const httpServer = createTagListStubServer({
      [TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex]: `<html>${POST_REPAIR_TAGS_INDEX_HTML}</html>`,
      [TAG_LIST_CUSTOMER_ASK_ROUTES.attentionLanding]: `<html>${POST_REPAIR_ATTENTION_LANDING_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskTagListChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(rows).toHaveLength(4);
      expect(rows.every((row) => row.status === "pass")).toBe(true);
      expect(rows.map((row) => row.checkId)).toEqual([
        TAG_LIST_CUSTOMER_ASK_CHECKS.groupedListSpacing.checkId,
        TAG_LIST_CUSTOMER_ASK_CHECKS.listDiscNonProse.checkId,
        TAG_LIST_CUSTOMER_ASK_CHECKS.attentionGroupedListSpacing.checkId,
        TAG_LIST_CUSTOMER_ASK_CHECKS.attentionListDiscNonProse.checkId,
      ]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for pre-repair grouped list spacing and list-disc", async () => {
    const httpServer = createTagListStubServer({
      [TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex]: `<html>${PRE_REPAIR_TAGS_INDEX_HTML}</html>`,
      [TAG_LIST_CUSTOMER_ASK_ROUTES.attentionLanding]: `<html>${POST_REPAIR_ATTENTION_LANDING_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskTagListChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      const spacingRow = rows.find(
        (row) =>
          row.checkId ===
          TAG_LIST_CUSTOMER_ASK_CHECKS.groupedListSpacing.checkId,
      );
      const listDiscRow = rows.find(
        (row) =>
          row.checkId === TAG_LIST_CUSTOMER_ASK_CHECKS.listDiscNonProse.checkId,
      );

      expect(spacingRow?.status).toBe("fail");
      expect(spacingRow?.reason).toBe(
        TAG_LIST_CUSTOMER_ASK_REASONS.groupedListSpacing,
      );
      expect(listDiscRow?.status).toBe("fail");
      expect(listDiscRow?.reason).toBe(
        TAG_LIST_CUSTOMER_ASK_REASONS.nonProseListDisc,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns HTTP failure rows when a tag route is non-200", async () => {
    const httpServer = createTagListStubServer(
      {
        [TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex]: `<html>${POST_REPAIR_TAGS_INDEX_HTML}</html>`,
        [TAG_LIST_CUSTOMER_ASK_ROUTES.attentionLanding]: `<html>${POST_REPAIR_ATTENTION_LANDING_HTML}</html>`,
      },
      { [TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex]: 500 },
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskTagListChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      const tagsIndexRows = rows.filter(
        (row) => row.route === TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex,
      );
      expect(tagsIndexRows.every((row) => row.status === "fail")).toBe(true);
      expect(tagsIndexRows[0]?.reason).toContain("HTTP 500");
      expect(
        rows
          .filter(
            (row) =>
              row.route === TAG_LIST_CUSTOMER_ASK_ROUTES.attentionLanding,
          )
          .every((row) => row.status === "pass"),
      ).toBe(true);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
