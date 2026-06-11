import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  createDevToolsInstrumentedPromise,
  NavigationPromisesContext,
  PathnameContext,
  PathParamsContext,
  ReadonlyURLSearchParams,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { type ReactNode, useMemo } from "react";

const mockAppRouter = {
  back: () => {},
  forward: () => {},
  prefetch: async () => {},
  push: () => {},
  refresh: () => {},
  replace: () => {},
  href: "/",
};

/** Fulfilled Next.js navigation contexts so `useSearchParams` does not suspend in RTL. */
export function NextNavigationTestProvider({
  children,
  pathname = "/",
  searchParams = new URLSearchParams(),
}: {
  children: ReactNode;
  pathname?: string;
  searchParams?: URLSearchParams;
}) {
  const navigationPromises = useMemo(() => {
    const readonlySearchParams = new ReadonlyURLSearchParams(searchParams);

    return {
      pathname: createDevToolsInstrumentedPromise("pathname", pathname),
      searchParams: createDevToolsInstrumentedPromise(
        "searchParams",
        readonlySearchParams,
      ),
      params: createDevToolsInstrumentedPromise("params", {}),
    };
  }, [pathname, searchParams]);

  return (
    <AppRouterContext.Provider value={mockAppRouter}>
      <NavigationPromisesContext.Provider value={navigationPromises}>
        <SearchParamsContext.Provider value={searchParams}>
          <PathnameContext.Provider value={pathname}>
            <PathParamsContext.Provider value={{}}>
              {children}
            </PathParamsContext.Provider>
          </PathnameContext.Provider>
        </SearchParamsContext.Provider>
      </NavigationPromisesContext.Provider>
    </AppRouterContext.Provider>
  );
}
