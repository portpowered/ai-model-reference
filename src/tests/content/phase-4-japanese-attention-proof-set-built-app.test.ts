import { describe, test } from "bun:test";
import { join } from "node:path";
import { assertJapaneseAttentionRouteChecks } from "@/lib/verify/phase-4-japanese-attention-route-checks";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");

describe("Phase 4 Japanese attention proof set built app", () => {
  test("served built app loads the shipped Japanese attention proof routes without leaking unshipped ja docs", async () => {
    if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
      return;
    }

    const session = await acquireVerifyServerSession({ projectRoot: repoRoot });
    try {
      await assertJapaneseAttentionRouteChecks(session.baseUrl, {
        timeoutMs: 10_000,
      });
    } finally {
      await session.cleanup();
    }
  }, 60_000);
});
