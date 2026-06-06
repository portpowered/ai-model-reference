import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  assertCanonicalPageLevelApiResults,
  formatPhase1SearchCheckFailure,
  PHASE_1_ATTENTION_MODULE_URL,
  PHASE_1_GROUPED_QUERY_ATTENTION_URL,
  PHASE_1_HIDDEN_SIZE_GLOSSARY_URL,
  PHASE_1_SEARCH_ASSERTIONS,
  PHASE_1_VECTOR_GLOSSARY_URL,
  runPhase1SearchChecks,
  type SearchResultHit,
} from "./phase-1-search-checks";

const GQA_HIT = { url: PHASE_1_GROUPED_QUERY_ATTENTION_URL };
const ATTENTION_HIT = { url: PHASE_1_ATTENTION_MODULE_URL };
const VECTOR_HIT = { url: PHASE_1_VECTOR_GLOSSARY_URL };
const HIDDEN_SIZE_HIT = { url: PHASE_1_HIDDEN_SIZE_GLOSSARY_URL };
const OTHER_HIT = { url: "/docs/glossary/token" };

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

function createSearchStubServer(
  resultsByQuery: Record<string, SearchResultHit[]>,
  statusByQuery: Record<string, number> = {},
): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
    const query = requestUrl.searchParams.get("query") ?? "";
    const status = statusByQuery[query] ?? 200;
    const hits = resultsByQuery[query] ?? [];
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify(hits));
  });
}

describe("PHASE_1_SEARCH_ASSERTIONS", () => {
  test("covers GQA, attention, vector, hidden size, and KV cache manual-gate queries", () => {
    expect(PHASE_1_SEARCH_ASSERTIONS.map((search) => search.query)).toEqual([
      "GQA",
      "attention",
      "vector",
      "hidden size",
      "KV cache",
    ]);
    expect(PHASE_1_SEARCH_ASSERTIONS.map((search) => search.label)).toEqual([
      "/api/search?query=GQA",
      "/api/search?query=attention",
      "/api/search?query=vector",
      "/api/search?query=hidden%20size",
      "/api/search?query=KV%20cache",
    ]);
  });

  test("assertResults passes on expected ranking and inclusion", () => {
    const gqa = PHASE_1_SEARCH_ASSERTIONS[0];
    const attention = PHASE_1_SEARCH_ASSERTIONS[1];
    const vector = PHASE_1_SEARCH_ASSERTIONS[2];
    const hiddenSize = PHASE_1_SEARCH_ASSERTIONS[3];
    const kvCache = PHASE_1_SEARCH_ASSERTIONS[4];

    expect(gqa?.assertResults([GQA_HIT, OTHER_HIT])).toBeNull();
    expect(
      attention?.assertResults([ATTENTION_HIT, OTHER_HIT, GQA_HIT]),
    ).toBeNull();
    expect(vector?.assertResults([VECTOR_HIT, OTHER_HIT])).toBeNull();
    expect(hiddenSize?.assertResults([HIDDEN_SIZE_HIT, OTHER_HIT])).toBeNull();
    expect(kvCache?.assertResults([OTHER_HIT, GQA_HIT])).toBeNull();
  });

  test("assertResults rejects fragment URLs and duplicate canonical pages", () => {
    const gqa = PHASE_1_SEARCH_ASSERTIONS[0];
    const fragmentHit = {
      url: `${PHASE_1_GROUPED_QUERY_ATTENTION_URL}#fragment`,
    };
    const duplicateHits = [GQA_HIT, GQA_HIT];

    expect(gqa?.assertResults([fragmentHit, OTHER_HIT])).toContain("fragment");
    expect(gqa?.assertResults(duplicateHits)).toContain("duplicate");
    expect(assertCanonicalPageLevelApiResults([fragmentHit])).toContain(
      "fragment",
    );
    expect(assertCanonicalPageLevelApiResults(duplicateHits)).toContain(
      "duplicate",
    );
  });
});

describe("runPhase1SearchChecks", () => {
  test("returns no failures when stub server serves Phase 1 search rankings", async () => {
    const httpServer = createSearchStubServer({
      GQA: [GQA_HIT, OTHER_HIT],
      attention: [ATTENTION_HIT, OTHER_HIT, GQA_HIT],
      vector: [VECTOR_HIT, OTHER_HIT],
      "hidden size": [HIDDEN_SIZE_HIT, OTHER_HIT],
      "KV cache": [OTHER_HIT, GQA_HIT],
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runPhase1SearchChecks(`http://127.0.0.1:${port}`, {
        timeoutMs: 2_000,
      });
      expect(failures).toEqual([]);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports route, status, and reason on non-200 responses", async () => {
    const httpServer = createSearchStubServer(
      {
        GQA: [GQA_HIT],
        attention: [ATTENTION_HIT, GQA_HIT],
        vector: [VECTOR_HIT],
        "hidden size": [HIDDEN_SIZE_HIT],
        "KV cache": [GQA_HIT],
      },
      { attention: 503 },
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runPhase1SearchChecks(`http://127.0.0.1:${port}`, {
        timeoutMs: 2_000,
        searches: PHASE_1_SEARCH_ASSERTIONS.filter(
          (search) => search.query === "attention",
        ),
      });

      const failure = failures[0];
      expect(failures).toEqual([
        {
          route: "/api/search?query=attention",
          status: 503,
          reason: "expected HTTP 200",
        },
      ]);
      expect(failure).toBeDefined();
      if (!failure) {
        throw new Error("expected a search check failure");
      }
      expect(formatPhase1SearchCheckFailure(failure)).toBe(
        "/api/search?query=attention: HTTP 503 — expected HTTP 200",
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports wrong first-hit URL for GQA with HTTP 200 status", async () => {
    const httpServer = createSearchStubServer({
      GQA: [OTHER_HIT],
      attention: [ATTENTION_HIT, GQA_HIT],
      vector: [VECTOR_HIT],
      "hidden size": [HIDDEN_SIZE_HIT],
      "KV cache": [GQA_HIT],
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runPhase1SearchChecks(`http://127.0.0.1:${port}`, {
        timeoutMs: 2_000,
        searches: PHASE_1_SEARCH_ASSERTIONS.filter(
          (search) => search.query === "GQA",
        ),
      });

      expect(failures).toHaveLength(1);
      expect(failures[0]?.route).toBe("/api/search?query=GQA");
      expect(failures[0]?.status).toBe(200);
      expect(failures[0]?.reason).toContain(
        PHASE_1_GROUPED_QUERY_ATTENTION_URL,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("reports missing grouped-query attention for attention query", async () => {
    const httpServer = createSearchStubServer({
      GQA: [GQA_HIT],
      attention: [ATTENTION_HIT, OTHER_HIT],
      vector: [VECTOR_HIT],
      "hidden size": [HIDDEN_SIZE_HIT],
      "KV cache": [GQA_HIT],
    });
    const port = await listenOnEphemeralPort(httpServer);

    try {
      const failures = await runPhase1SearchChecks(`http://127.0.0.1:${port}`, {
        timeoutMs: 2_000,
        searches: PHASE_1_SEARCH_ASSERTIONS.filter(
          (search) => search.query === "attention",
        ),
      });

      expect(failures).toHaveLength(1);
      expect(failures[0]?.route).toBe("/api/search?query=attention");
      expect(failures[0]?.status).toBe(200);
      expect(failures[0]?.reason).toContain(
        PHASE_1_GROUPED_QUERY_ATTENTION_URL,
      );
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
