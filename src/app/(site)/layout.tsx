import type { ReactNode } from "react";

import { RouteLocaleEffect } from "@/components/i18n/RouteLocaleEffect";
import { CanonicalDocsLayout } from "@/components/layout/canonical-docs-layout";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { defaultLocale } from "@/lib/i18n/locale-routing";

export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const messages = await loadUiMessages();
  return (
    <CanonicalDocsLayout messages={messages} locale={defaultLocale}>
      <RouteLocaleEffect locale={defaultLocale} />
      {children}
    </CanonicalDocsLayout>
  );
}
