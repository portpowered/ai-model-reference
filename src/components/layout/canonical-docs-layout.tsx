import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

import { ModelAtlasDocsHeader } from "@/components/layout/model-atlas-docs-header";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

type CanonicalDocsLayoutProps = {
  children: ReactNode;
  messages: UiMessages;
};

export function CanonicalDocsLayout({
  children,
  messages,
}: CanonicalDocsLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ModelAtlasDocsHeader messages={messages} />
      <div className="flex min-h-0 flex-1 flex-col">
        <DocsLayout
          tree={source.pageTree}
          {...baseOptions}
          nav={{ enabled: false }}
          searchToggle={{ enabled: false }}
          themeSwitch={{ enabled: false }}
          slots={{ searchTrigger: false, themeSwitch: false }}
          sidebar={{
            "aria-label": messages.shell.sidebarTitle,
          }}
        >
          {children}
        </DocsLayout>
      </div>
    </div>
  );
}
