export type SampledLineFunction<TArgs extends readonly unknown[]> = {
  dataKey: string;
  evaluate: (...args: TArgs) => number;
};

export function sampleLineGraphFunctions<TArgs extends readonly unknown[]>({
  domain,
  mapArgs,
  sampleCount,
  xKey = "x",
  xValue,
  functions,
}: {
  domain: readonly [number, number];
  mapArgs: (x: number, index: number) => TArgs;
  sampleCount: number;
  xKey?: string;
  xValue?: (x: number, index: number) => number | string;
  functions: readonly SampledLineFunction<TArgs>[];
}) {
  const [start, end] = domain;
  const step = sampleCount > 1 ? (end - start) / (sampleCount - 1) : 0;

  return Array.from({ length: sampleCount }, (_, index) => {
    const x = Number((start + step * index).toFixed(4));
    const args = mapArgs(x, index);

    const point: Record<string, number | string> = {
      [xKey]: xValue ? xValue(x, index) : x,
    };

    for (const fn of functions) {
      point[fn.dataKey] = Number(fn.evaluate(...args).toFixed(3));
    }

    return point;
  });
}
