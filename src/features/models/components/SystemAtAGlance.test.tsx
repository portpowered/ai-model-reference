import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SystemAtAGlance } from "@/features/models/components/SystemAtAGlance";

describe("SystemAtAGlance", () => {
  test("renders the ontology-backed system label", () => {
    const html = renderToStaticMarkup(
      <SystemAtAGlance registryId="system.routing" />,
    );

    expect(html).toContain('data-registry-id="system.routing"');
    expect(html).toContain("System type");
    expect(html).toContain("System Routing");
    expect(html).not.toContain(">Routing<");
  });
});
