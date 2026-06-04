import { type RenderOptions, render } from "@testing-library/react";
import type { SharedProps } from "fumadocs-ui/contexts/search";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ComponentType, ReactElement, ReactNode } from "react";
import { ModelAtlasSearchDialog } from "@/features/docs/search/SearchDialog";
import { DOCS_SEARCH_API_PATH } from "@/features/docs/search/search-client";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import { NextNavigationTestProvider } from "@/tests/a11y/next-navigation-test-provider";

export type AppTestContext = {
  messages: Awaited<ReturnType<typeof loadUiMessages>>;
  metaByUrl: ReturnType<typeof searchResultMetaMapToRecord>;
};

let cachedContext: AppTestContext | null = null;

export async function loadAppTestContext(): Promise<AppTestContext> {
  if (cachedContext) {
    return cachedContext;
  }
  const [messages, metaMap] = await Promise.all([
    loadUiMessages(),
    loadSearchResultMetaMap(),
  ]);
  cachedContext = {
    messages,
    metaByUrl: searchResultMetaMapToRecord(metaMap),
  };
  return cachedContext;
}

export async function installDocsSearchFetchMock(): Promise<void> {
  const exported = await (await docsSearchApi.staticGET()).json();
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url.includes(DOCS_SEARCH_API_PATH)) {
      return new Response(JSON.stringify(exported), { status: 200 });
    }
    return originalFetch(input);
  }) as typeof fetch;
}

let originalFetch = globalThis.fetch;

export function restoreFetchMock(): void {
  globalThis.fetch = originalFetch;
}

export function captureOriginalFetch(): void {
  originalFetch = globalThis.fetch;
}

type RenderWithProvidersOptions = Omit<RenderOptions, "wrapper"> & {
  context?: AppTestContext;
};

export async function renderWithAppProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
) {
  const context = options.context ?? (await loadAppTestContext());

  function Wrapper({ children }: { children: ReactNode }) {
    const SearchDialog: ComponentType<SharedProps> =
      function SearchDialogWithMeta(props) {
        return (
          <ModelAtlasSearchDialog
            {...props}
            metaByUrl={context.metaByUrl}
            messages={context.messages}
          />
        );
      };

    return (
      <NextNavigationTestProvider>
        <RootProvider
          theme={{ enabled: true, defaultTheme: "dark", forcedTheme: "dark" }}
          search={{
            SearchDialog,
            enabled: true,
          }}
        >
          {children}
        </RootProvider>
      </NextNavigationTestProvider>
    );
  }

  return render(ui, { ...options, wrapper: Wrapper });
}
