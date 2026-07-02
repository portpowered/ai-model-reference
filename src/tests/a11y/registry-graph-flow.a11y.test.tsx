import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useState } from "react";
import {
  CanonicalReferenceNode,
  RegistryGraphFlowEdgePopup,
  RegistryGraphFlowInteractionContext,
  RegistryGraphFlowNodePopup,
} from "@/features/models/components/RegistryGraphFlow";
import type { RegistryFlowNodeData } from "@/lib/content/graph-flow";
import { expectNoSeriousAxeViolations } from "@/tests/a11y/axe";

function CanonicalNodeA11yHarness({ data }: { data: RegistryFlowNodeData }) {
  const [activeNode, setActiveNode] = useState<{
    canonicalPageHref?: string;
    entityKind?: RegistryFlowNodeData["semantic"]["entityKind"];
    hasCanonicalPage: boolean;
    id: string;
    interactionKind: RegistryFlowNodeData["semantic"]["interactionKind"];
    relatedPageHref?: string;
    relatedPageTitle?: string;
    resolvedSummary?: string;
    resolvedTitle: string;
  } | null>(null);

  return (
    <RegistryGraphFlowInteractionContext.Provider
      value={{
        activeNodeId: activeNode?.id,
        openNodePopup: setActiveNode,
        popupId: "graph-node-popup",
      }}
    >
      <ReactFlowProvider>
        {CanonicalReferenceNode({
          id: "input-tokens",
          data,
          type: "canonicalReference",
          selected: false,
          dragging: false,
          zIndex: 0,
          isConnectable: false,
          positionAbsoluteX: 0,
          positionAbsoluteY: 0,
          xPos: 0,
          yPos: 0,
          draggingHandle: null,
          targetPosition: undefined,
          sourcePosition: undefined,
          width: 220,
          height: 82,
          parentId: undefined,
          dragHandle: undefined,
        } as never)}
      </ReactFlowProvider>
      <RegistryGraphFlowNodePopup
        activeNode={activeNode}
        onClose={() => setActiveNode(null)}
        popupId="graph-node-popup"
      />
    </RegistryGraphFlowInteractionContext.Provider>
  );
}

describe("RegistryGraphFlow accessibility smoke", () => {
  afterEach(() => {
    cleanup();
  });

  test("keyboard activation opens canonical node details with dialog semantics and no serious axe violations", async () => {
    const nodeData = {
      label: "Input\nTokens",
      moduleKind: "input",
      nodeFamily: "canonical-reference",
      visualRole: "architecture-io",
      semantic: {
        registryId: "concept.tokens",
        entityKind: "concept",
        resolvedTitle: "Input\nTokens",
        resolvedSummary: "Discrete token ids enter the model before embedding.",
        summarySource: "registry",
        hasCanonicalPage: true,
        canonicalPageHref: "/docs/glossary/tokens",
        interactionKind: "canonical",
      },
    } satisfies RegistryFlowNodeData;

    const { container } = render(<CanonicalNodeA11yHarness data={nodeData} />);
    const nodeButton = screen.getByRole("button", {
      name: /Open Input\s+Tokens details/,
    });

    fireEvent.keyDown(nodeButton, { key: "Enter" });

    expect(nodeButton.getAttribute("aria-haspopup")).toBe("dialog");
    expect(
      screen.getByRole("dialog", { name: /Input\s+Tokens details/ }),
    ).toBeTruthy();

    await expectNoSeriousAxeViolations(container);
  });

  test("dependency edge popup exposes dialog semantics and no serious axe violations", async () => {
    const { container } = render(
      <RegistryGraphFlowEdgePopup
        activeEdge={{
          id: "gate-activation-to-product",
          relationshipSummary: "Elementwise multiply depends on SiLU.",
          sourcePageHref: "/docs/modules/silu",
          sourcePageTitle: "SiLU",
          sourceTitle: "SiLU",
          targetTitle: "Elementwise multiply",
        }}
        onClose={() => {}}
        popupId="graph-edge-popup"
      />,
    );

    expect(
      screen.getByRole("dialog", {
        name: /SiLU and Elementwise multiply relationship details/,
      }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open SiLU" })).toBeTruthy();

    await expectNoSeriousAxeViolations(container);
  });
});
