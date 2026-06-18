import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RegistryAssociatedRecords } from "@/features/docs/components/RegistryAssociatedRecords";

describe("RegistryAssociatedRecords", () => {
  test("renders expandable deep-link groups from registry metadata with readable titles", () => {
    const html = renderToStaticMarkup(
      <RegistryAssociatedRecords
        registryId="paper.deepseek-v4"
        groups={[
          {
            id: "introduced",
            title: "Introduced records",
            fields: ["introducesIds"],
            emptyLabel: "No introduced records listed yet.",
            defaultOpen: true,
          },
          {
            id: "modules",
            title: "Module pages",
            fields: ["moduleIds"],
            emptyLabel: "No module pages listed yet.",
          },
        ]}
      />,
    );

    expect(html).toContain("Introduced records");
    expect(html).toContain("Module pages");
    expect(html).toContain("DeepSeek-V4-Pro");
    expect(html).toContain(">HCA<");
    expect(html).toContain('href="/docs/modules/heavily-compressed-attention"');
    expect(html).not.toContain("module.heavily-compressed-attention");
  });
});
