import type { ReactNode } from "react";
import { RouteLocaleEffect } from "@/components/i18n/RouteLocaleEffect";
import { CanonicalDocsLayout } from "@/components/layout/canonical-docs-layout";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { defaultLocale, supportedLocales } from "@/lib/i18n/locale-routing";
import { resolveRouteLocaleOrNotFound } from "@/lib/i18n/route-locale";

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
  const messages = await loadUiMessages();

  return (
    <CanonicalDocsLayout messages={messages} locale={locale}>
      <RouteLocaleEffect locale={locale} />
      {children}
    </CanonicalDocsLayout>
  );
}
