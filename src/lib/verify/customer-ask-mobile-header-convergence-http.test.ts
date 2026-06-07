import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import { BATCH_012_MOBILE_HEADER_CHECKS } from "./batch-012-mobile-header-checks";
import { MOBILE_HEADER_CUSTOMER_ASK_REASONS } from "./customer-ask-mobile-header-convergence";
import {
  POST_REPAIR_MOBILE_HEADER_HOME_HTML,
  PRE_REPAIR_INLINE_FULL_NAV_HOME_HTML,
} from "./customer-ask-mobile-header-convergence.test";
import { runCustomerAskMobileHeaderChecks } from "./customer-ask-mobile-header-convergence-http";

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

function createHomeStubServer(
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

describe("runCustomerAskMobileHeaderChecks", () => {
  test("returns pass row when stub server serves post-repair home HTML and viewport probe succeeds", async () => {
    const httpServer = createHomeStubServer({
      "/": `<html>${POST_REPAIR_MOBILE_HEADER_HOME_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskMobileHeaderChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          runMobileHeaderViewportProbe: async () => null,
        },
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.status).toBe("pass");
      expect(rows[0]?.checkId).toBe(
        BATCH_012_MOBILE_HEADER_CHECKS.mobileHamburgerMenu.checkId,
      );
      expect(rows[0]?.checklistRow).toBe("phase-1-header-bar");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports fail evidence for pre-repair inline full nav HTML", async () => {
    const httpServer = createHomeStubServer({
      "/": `<html>${PRE_REPAIR_INLINE_FULL_NAV_HOME_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskMobileHeaderChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.status).toBe("fail");
      expect(rows[0]?.reason).toBe(
        MOBILE_HEADER_CUSTOMER_ASK_REASONS.inlineFullNavVisible,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("downgrades pass to fail when the mobile viewport probe reports inline nav", async () => {
    const httpServer = createHomeStubServer({
      "/": `<html>${POST_REPAIR_MOBILE_HEADER_HOME_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskMobileHeaderChecks(
        `http://127.0.0.1:${port}`,
        {
          timeoutMs: 2_000,
          runMobileHeaderViewportProbe: async () =>
            MOBILE_HEADER_CUSTOMER_ASK_REASONS.inlineFullNavVisible,
        },
      );
      expect(rows[0]?.status).toBe("fail");
      expect(rows[0]?.reason).toBe(
        MOBILE_HEADER_CUSTOMER_ASK_REASONS.inlineFullNavVisible,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("returns HTTP failure row when home route is non-200", async () => {
    const httpServer = createHomeStubServer(
      { "/": `<html>${POST_REPAIR_MOBILE_HEADER_HOME_HTML}</html>` },
      { "/": 500 },
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const rows = await runCustomerAskMobileHeaderChecks(
        `http://127.0.0.1:${port}`,
        { timeoutMs: 2_000 },
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.status).toBe("fail");
      expect(rows[0]?.reason).toContain("HTTP 500");
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
