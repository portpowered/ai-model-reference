import { describe, expect, test } from "bun:test";
import {
  assertLoopedTransformersModuleConvergence,
  buildLoopedTransformersStubBody,
} from "./looped-transformers-module-convergence";

describe("assertLoopedTransformersModuleConvergence", () => {
  test("passes against the looped-transformers module stub body", () => {
    expect(
      assertLoopedTransformersModuleConvergence(
        buildLoopedTransformersStubBody(),
      ),
    ).toBeNull();
  });

  test("fails when a required marker is missing", () => {
    const result = assertLoopedTransformersModuleConvergence(
      "<div>Looped Transformers</div>",
    );
    expect(result).toContain("missing expected content");
  });
});
