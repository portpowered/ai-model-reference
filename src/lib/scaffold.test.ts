import { describe, expect, test } from "bun:test";
import { SCAFFOLD_ID } from "./scaffold";

describe("scaffold", () => {
  test("exports a stable scaffold identifier", () => {
    expect(SCAFFOLD_ID).toBe("model-reference-scaffold");
  });
});
