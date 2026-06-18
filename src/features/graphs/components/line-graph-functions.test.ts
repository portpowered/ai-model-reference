import { describe, expect, test } from "bun:test";
import { sampleLineGraphFunctions } from "@/features/graphs/components/line-graph-functions";

describe("sampleLineGraphFunctions", () => {
  test("samples unary functions into chart data", () => {
    const data = sampleLineGraphFunctions({
      domain: [-1, 1],
      sampleCount: 3,
      mapArgs: (x): [number] => [x],
      functions: [
        {
          dataKey: "square",
          evaluate: (x: number) => x * x,
        },
      ],
    });

    expect(data).toEqual([
      { x: -1, square: 1 },
      { x: 0, square: 0 },
      { x: 1, square: 1 },
    ]);
  });

  test("supports n-ary functions through argument mapping", () => {
    const data = sampleLineGraphFunctions({
      domain: [0, 2],
      sampleCount: 3,
      mapArgs: (x, index): [number, number] => [x, index],
      functions: [
        {
          dataKey: "sum",
          evaluate: (x: number, index: number) => x + index,
        },
      ],
    });

    expect(data).toEqual([
      { x: 0, sum: 0 },
      { x: 1, sum: 2 },
      { x: 2, sum: 4 },
    ]);
  });
});
