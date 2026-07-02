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

  test("keeps published systems readable when they still need compatibility labels", () => {
    const html = renderToStaticMarkup(
      <SystemAtAGlance registryId="system.inference-engine" />,
    );

    expect(html).toContain('data-registry-id="system.inference-engine"');
    expect(html).toContain("System type");
    expect(html).toContain("Runtime");
    expect(html).toContain("Related models");
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain("Related modules");
    expect(html).toContain("No related modules listed yet.");
    expect(html).not.toContain(">runtime<");
  });
});
