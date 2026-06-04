import { notFound } from "next/navigation";
import { ComponentExampleGallery } from "@/component-examples/ComponentExampleGallery";
import { loadComponentExampleContext } from "@/component-examples/load-context";

export const dynamic = "force-dynamic";

export default async function ComponentExamplesPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_COMPONENT_EXAMPLES !== "1"
  ) {
    notFound();
  }

  const context = await loadComponentExampleContext();

  return <ComponentExampleGallery context={context} />;
}
