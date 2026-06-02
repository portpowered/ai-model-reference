"use client";

import type { SearchResultMetaRecord } from "@/features/docs/search/search-result-meta-client";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import type { SharedProps } from "fumadocs-ui/contexts/search";
import { RootProvider } from "fumadocs-ui/provider/next";
import { type ComponentType, type ReactNode, lazy, useMemo } from "react";

const ModelAtlasSearchDialog = lazy(() =>
  import("@/features/docs/search/SearchDialog").then((mod) => ({
    default: mod.ModelAtlasSearchDialog,
  })),
);

type AppProvidersProps = {
  children: ReactNode;
  metaByUrl: SearchResultMetaRecord;
  messages: UiMessages;
};

export function AppProviders({
  children,
  metaByUrl,
  messages,
}: AppProvidersProps) {
  const SearchDialog = useMemo((): ComponentType<SharedProps> => {
    return function SearchDialogWithMeta(props) {
      return (
        <ModelAtlasSearchDialog
          {...props}
          metaByUrl={metaByUrl}
          messages={messages}
        />
      );
    };
  }, [metaByUrl, messages]);

  return (
    <RootProvider
      theme={{ enabled: true, defaultTheme: "dark", forcedTheme: "dark" }}
      search={{
        SearchDialog,
        enabled: true,
      }}
    >
      {children}
    </RootProvider>
  );
}
