import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootDocument, siteMetadata } from "@/app/root-layout.shared";
import { RouteLocaleEffect } from "@/components/i18n/RouteLocaleEffect";
import { CanonicalDocsLayout } from "@/components/layout/canonical-docs-layout";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { defaultLocale } from "@/lib/i18n/locale-routing";
import "../globals.css";

export const metadata: Metadata = siteMetadata;

export default async function DocsRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const messages = await loadUiMessages();
  return (
    <RootDocument lang={defaultLocale}>
      <CanonicalDocsLayout messages={messages} locale={defaultLocale}>
        <RouteLocaleEffect locale={defaultLocale} />
        {children}
      </CanonicalDocsLayout>
    </RootDocument>
  );
}
