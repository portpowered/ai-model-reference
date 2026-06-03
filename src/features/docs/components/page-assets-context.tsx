"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { PageAssetConfig } from "@/lib/content/schemas";

export type PageAssetsContextValue = {
  assets: PageAssetConfig;
  isDev: boolean;
};

const PageAssetsContext = createContext<PageAssetsContextValue | null>(null);

export function PageAssetsProvider({
  assets,
  isDev = process.env.NODE_ENV === "development",
  children,
}: {
  assets: PageAssetConfig;
  isDev?: boolean;
  children: ReactNode;
}) {
  return (
    <PageAssetsContext.Provider value={{ assets, isDev }}>
      {children}
    </PageAssetsContext.Provider>
  );
}

export function usePageAssets(): PageAssetsContextValue {
  const context = useContext(PageAssetsContext);
  if (!context) {
    throw new Error("usePageAssets must be used within PageAssetsProvider");
  }
  return context;
}
