import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderTopologyPrototypePage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("topology prototype page", () => {
  test("renders the default activation/feed-forward graph state", async () => {
    const messages = await loadUiMessages();
    const html = renderToStaticMarkup(await renderTopologyPrototypePage());
    const { topologyPrototype } = messages;

    expect(html).toContain(topologyPrototype.title);
    expect(html).toContain(topologyPrototype.description);
    expect(html).toContain(topologyPrototype.selectedViewValue);
    expect(html).toContain(topologyPrototype.successTitle);
    expect(html).toContain(topologyPrototype.nodeActivation);
    expect(html).toContain(topologyPrototype.nodeRelu);
    expect(html).toContain(topologyPrototype.nodeSwiGLU);
    expect(html).toContain(topologyPrototype.nodeFeedForward);
    expect(html).toContain(`aria-label="${topologyPrototype.graphLabel}"`);
  });

  test("renders loading, empty, error, and success regions in the docs shell", async () => {
    const messages = await loadUiMessages();
    const html = renderToStaticMarkup(await renderTopologyPrototypePage());
    const { topologyPrototype } = messages;

    expect(html).toContain(topologyPrototype.loadingTitle);
    expect(html).toContain(topologyPrototype.emptyTitle);
    expect(html).toContain(topologyPrototype.errorTitle);
    expect(html).toContain(topologyPrototype.successTitle);
    expect(html).toContain('id="nd-page"');
  });

  test("renders localized japanese topology copy", async () => {
    const messages = await loadUiMessages("ja");
    const html = renderToStaticMarkup(await renderTopologyPrototypePage("ja"));

    expect(html).toContain(messages.topologyPrototype.title);
    expect(html).toContain(messages.topologyPrototype.description);
    expect(html).toContain(messages.topologyPrototype.selectedViewValue);
  });
});
