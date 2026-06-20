import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { TopologyPrototype } from "./TopologyPrototype";

describe("TopologyPrototype", () => {
  test("renders a Cytoscape-backed topology viewport with controls and accessible graph lists", async () => {
    const messages = await loadUiMessages();
    const html = renderToStaticMarkup(
      <TopologyPrototype messages={messages} />,
    );

    expect(html).toContain('data-cytoscape-graph="true"');
    expect(html).toContain('data-graph-interaction-pan="true"');
    expect(html).toContain('data-graph-interaction-zoom="true"');
    expect(html).toContain('data-graph-node-count="10"');
    expect(html).toContain(
      'aria-label="Activation/feed-forward topology preview"',
    );
    expect(html).toContain("Fit graph");
    expect(html).toContain('aria-label="Reset graph"');
    expect(html).toContain("Relationship legend");
    expect(html).toContain("Graph nodes");
    expect(html).toContain("Graph relationships");
    expect(html).toContain('data-registry-id="module.relu"');
    expect(html).toContain("/docs/modules/relu");
    expect(html).toContain("SwiGLU -&gt; uses -&gt; SiLU");
  });
});
