import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

import { docsSidebarTreeComponents } from "@/components/layout/docs-sidebar-tree";
import { ModelAtlasDocsHeader } from "@/components/layout/model-atlas-docs-header";
import {
  getTopologyNavigationLabels,
  listTopologyNavigationOptions,
} from "@/lib/content/topology-navigation";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import { localizePageTree } from "@/lib/i18n/localize-page-tree";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

type CanonicalDocsLayoutProps = {
  children: ReactNode;
  messages: UiMessages;
  locale?: SiteLocale;
};

export function CanonicalDocsLayout({
  children,
  messages,
  locale = defaultLocale,
}: CanonicalDocsLayoutProps) {
  const options = baseOptions(locale);
  const pageTree = localizePageTree(source.pageTree, locale);
  const topologyOptions = listTopologyNavigationOptions({
    locale,
    labels: getTopologyNavigationLabels(messages),
  });

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ModelAtlasDocsHeader
        messages={messages}
        pageTree={pageTree}
        locale={locale}
        topologyOptions={topologyOptions}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <DocsLayout
          tree={pageTree}
          {...options}
          nav={{ ...options.nav, enabled: false }}
          searchToggle={{ enabled: false }}
          themeSwitch={{ enabled: false }}
          slots={{ searchTrigger: false, themeSwitch: false }}
          sidebar={{
            "aria-label": messages.shell.sidebarTitle,
            components: docsSidebarTreeComponents,
          }}
        >
          {children}
        </DocsLayout>
      </div>
    </div>
  );
}
