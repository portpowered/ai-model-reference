import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootDocument, siteMetadata } from "@/app/root-layout.shared";
import { RouteLocaleEffect } from "@/components/i18n/RouteLocaleEffect";
import { CanonicalDocsLayout } from "@/components/layout/canonical-docs-layout";
import { AppProviders } from "@/components/providers/app-providers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { defaultLocale, supportedLocales } from "@/lib/i18n/locale-routing";
import { resolveRouteLocaleOrNotFound } from "@/lib/i18n/route-locale";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import "../globals.css";

export const metadata: Metadata = siteMetadata;

type LocalizedLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return supportedLocales
    .filter((locale) => locale !== defaultLocale)
    .map((locale) => ({ locale }));
}

export default async function LocalizedLayout({
  children,
  params,
}: LocalizedLayoutProps) {
  const { locale: rawLocale } = await params;
  const locale = resolveRouteLocaleOrNotFound(rawLocale);
  const messages = await loadUiMessages(locale);
  const metaByUrl = searchResultMetaMapToRecord(
    await loadSearchResultMetaMap(locale),
  );

  return (
    <RootDocument lang={locale}>
      <AppProviders metaByUrl={metaByUrl} messages={messages}>
        <CanonicalDocsLayout messages={messages} locale={locale}>
          <RouteLocaleEffect locale={locale} />
          {children}
        </CanonicalDocsLayout>
      </AppProviders>
    </RootDocument>
  );
}
