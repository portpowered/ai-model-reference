import { describe, expect, test } from "bun:test";
import { parseBillionParameterCount } from "./parse-billion-parameter-count";

describe("parseBillionParameterCount", () => {
  test("parses supported total-parameter strings", () => {
    expect(parseBillionParameterCount("744 billion total parameters")).toBe(
      744,
    );
  });

  test("parses supported active-parameter strings", () => {
    expect(parseBillionParameterCount("40 billion active parameters")).toBe(40);
  });

  test("parses supported dense parameter strings without total or active wording", () => {
    expect(parseBillionParameterCount("27 billion parameters")).toBe(27);
  });

  test("parses decimal billion parameter strings", () => {
    expect(parseBillionParameterCount("0.6 billion parameters")).toBe(0.6);
  });

  test("returns null for missing or empty parameter strings", () => {
    expect(parseBillionParameterCount(undefined)).toBeNull();
    expect(parseBillionParameterCount(null)).toBeNull();
    expect(parseBillionParameterCount("")).toBeNull();
    expect(parseBillionParameterCount("   ")).toBeNull();
  });

  test("returns null for unsupported parameter strings", () => {
    expect(parseBillionParameterCount("about 40B parameters")).toBeNull();
    expect(parseBillionParameterCount("40 million parameters")).toBeNull();
    expect(parseBillionParameterCount("not a parameter count")).toBeNull();
    expect(parseBillionParameterCount("744 billion")).toBeNull();
  });
});
