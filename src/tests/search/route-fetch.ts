import { GET } from "@/app/api/search/route";

const TEST_SEARCH_ORIGIN = "http://test.local";

export const TEST_DOCS_SEARCH_URL = `${TEST_SEARCH_ORIGIN}/api/search`;

export function createDocsSearchRouteFetch(
  getHandler: typeof GET = GET,
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const href =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    return getHandler(new Request(href, init));
  }) as typeof fetch;
}
