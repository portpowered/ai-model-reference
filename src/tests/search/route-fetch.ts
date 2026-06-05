import { GET } from "@/app/api/search/route";

const TEST_SEARCH_ORIGIN = "http://test.local";

export const TEST_DOCS_SEARCH_URL = `${TEST_SEARCH_ORIGIN}/api/search`;

function resolveDocsSearchRequestUrl(href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }

  return new URL(href, TEST_SEARCH_ORIGIN).href;
}

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
    return getHandler(new Request(resolveDocsSearchRequestUrl(href), init));
  }) as typeof fetch;
}
