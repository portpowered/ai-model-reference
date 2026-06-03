import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers/app-providers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import "./globals.css";

export const metadata: Metadata = {
  title: "Model Atlas",
  description: "Reference for modern AI models and modules",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const messages = await loadUiMessages();
  const metaByUrl = searchResultMetaMapToRecord(
    await loadSearchResultMetaMap(),
  );

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <AppProviders metaByUrl={metaByUrl} messages={messages}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
