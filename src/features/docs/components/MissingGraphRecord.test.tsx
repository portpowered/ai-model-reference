import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MissingGraphRecord } from "@/features/docs/components/MissingGraphRecord";

describe("MissingGraphRecord", () => {
  test("renders an alert marker with the missing graph id", () => {
    const html = renderToStaticMarkup(
      <MissingGraphRecord graphId="graph.missing-fixture" />,
    );

    expect(html).toContain('data-missing-graph-id="graph.missing-fixture"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("Missing graph record: graph.missing-fixture");
  });
});
