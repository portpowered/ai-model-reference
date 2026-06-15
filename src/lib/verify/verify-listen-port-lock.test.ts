import { afterEach, describe, expect, test } from "bun:test";
import { reserveListenPort } from "./http-harness";
import {
  removeVerifyListenPortLockForTests,
  withVerifyListenPortLock,
} from "./verify-listen-port-lock";

describe("withVerifyListenPortLock", () => {
  afterEach(() => {
    removeVerifyListenPortLockForTests();
  });

  test("allows only one concurrent holder", async () => {
    let activeHolders = 0;
    let maxActiveHolders = 0;

    await Promise.all(
      Array.from({ length: 4 }, async () =>
        withVerifyListenPortLock(async () => {
          activeHolders += 1;
          maxActiveHolders = Math.max(maxActiveHolders, activeHolders);
          const reservation = await reserveListenPort();
          await new Promise((resolve) => setTimeout(resolve, 10));
          await reservation.release();
          activeHolders -= 1;
        }),
      ),
    );

    expect(maxActiveHolders).toBe(1);
  }, 15_000);
});
