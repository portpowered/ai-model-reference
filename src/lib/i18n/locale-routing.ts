const LOCALE_PREFIX_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export const supportedLocales = ["en", "vi", "ja"] as const;

export type SiteLocale = (typeof supportedLocales)[number];

export const defaultLocale: SiteLocale = "en";

export type LocalizedRouteDestination =
  | { surface: "home" }
  | { surface: "browse" }
  | { surface: "search" }
  | { surface: "topology" }
  | { surface: "blog-index" }
  | { surface: "blog-post"; slug: string }
  | { surface: "docs-page"; slug: string }
  | { surface: "architecture-index" }
  | { surface: "glossary-index" }
  | { surface: "tags-index" }
  | { surface: "tag-page"; slug: string };

export type LocalizedRouteMatch =
  | {
      kind: "matched";
      locale: SiteLocale;
      pathname: string;
      destination: LocalizedRouteDestination;
    }
  | {
      kind: "unsupported-locale";
      locale: string;
      pathname: string;
    }
  | {
      kind: "unmatched";
      pathname: string;
    };

export class UnsupportedLocaleError extends Error {
  readonly locale: string;

  constructor(locale: string) {
    super(
      `Unsupported locale "${locale}". Supported locales: ${supportedLocales.join(", ")}`,
    );
    this.name = "UnsupportedLocaleError";
    this.locale = locale;
  }
}

export function isSupportedLocale(locale: string): locale is SiteLocale {
  return supportedLocales.includes(locale as SiteLocale);
}

export function resolveLocale(locale?: string | null): SiteLocale {
  if (!locale) {
    return defaultLocale;
  }

  if (isSupportedLocale(locale)) {
    return locale;
  }

  throw new UnsupportedLocaleError(locale);
}

export function localePrefix(locale: SiteLocale): string {
  return locale === defaultLocale ? "" : `/${locale}`;
}

function splitPathname(pathname: string): {
  path: string;
  suffix: string;
} {
  const queryIndex = pathname.indexOf("?");
  const hashIndex = pathname.indexOf("#");
  const splitIndex =
    queryIndex === -1
      ? hashIndex
      : hashIndex === -1
        ? queryIndex
        : Math.min(queryIndex, hashIndex);

  if (splitIndex === -1) {
    return { path: pathname, suffix: "" };
  }

  return {
    path: pathname.slice(0, splitIndex),
    suffix: pathname.slice(splitIndex),
  };
}

function normalizeAbsolutePath(pathname: string): string {
  if (pathname === "") {
    return "/";
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function localizePath(pathname: string, locale: SiteLocale): string {
  const { path, suffix } = splitPathname(pathname);
  const normalizedPath = normalizeAbsolutePath(path);

  if (normalizedPath === "/") {
    return `${localePrefix(locale) || "/"}${suffix}`;
  }

  return `${localePrefix(locale)}${normalizedPath}${suffix}`;
}

export function buildLocalizedRoute(
  destination: LocalizedRouteDestination,
  locale: SiteLocale = defaultLocale,
): string {
  switch (destination.surface) {
    case "home":
      return localizePath("/", locale);
    case "browse":
      return localizePath("/browse", locale);
    case "search":
      return localizePath("/search", locale);
    case "topology":
      return localizePath("/topology", locale);
    case "blog-index":
      return localizePath("/blog", locale);
    case "blog-post":
      return localizePath(`/blog/${destination.slug}`, locale);
    case "docs-page":
      return localizePath(`/docs/${destination.slug}`, locale);
    case "architecture-index":
      return localizePath("/docs/architecture", locale);
    case "glossary-index":
      return localizePath("/docs/glossary", locale);
    case "tags-index":
      return localizePath("/tags", locale);
    case "tag-page":
      return localizePath(`/tags/${destination.slug}`, locale);
  }
}

function destinationFromNormalizedPath(
  pathname: string,
): LocalizedRouteDestination | null {
  if (pathname === "/") {
    return { surface: "home" };
  }

  if (pathname === "/browse") {
    return { surface: "browse" };
  }

  if (pathname === "/search") {
    return { surface: "search" };
  }

  if (pathname === "/topology") {
    return { surface: "topology" };
  }

  if (pathname === "/blog") {
    return { surface: "blog-index" };
  }

  if (pathname === "/docs/architecture") {
    return { surface: "architecture-index" };
  }

  if (pathname === "/docs/glossary") {
    return { surface: "glossary-index" };
  }

  if (pathname === "/tags") {
    return { surface: "tags-index" };
  }

  if (pathname.startsWith("/docs/")) {
    const slug = pathname.slice("/docs/".length);
    if (slug.length > 0) {
      return { surface: "docs-page", slug };
    }
  }

  if (pathname.startsWith("/blog/")) {
    const slug = pathname.slice("/blog/".length);
    if (slug.length > 0) {
      return { surface: "blog-post", slug };
    }
  }

  if (pathname.startsWith("/tags/")) {
    const slug = pathname.slice("/tags/".length);
    if (slug.length > 0) {
      return { surface: "tag-page", slug };
    }
  }

  return null;
}

export function matchLocalizedRoute(pathname: string): LocalizedRouteMatch {
  const normalizedPath = normalizeAbsolutePath(splitPathname(pathname).path);
  const segments = normalizedPath.split("/").filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && isSupportedLocale(firstSegment)) {
    const strippedPath =
      segments.length === 1 ? "/" : `/${segments.slice(1).join("/")}`;
    const destination = destinationFromNormalizedPath(strippedPath);
    if (!destination) {
      return { kind: "unmatched", pathname: normalizedPath };
    }

    return {
      kind: "matched",
      locale: firstSegment,
      pathname: strippedPath,
      destination,
    };
  }

  if (firstSegment && LOCALE_PREFIX_PATTERN.test(firstSegment)) {
    return {
      kind: "unsupported-locale",
      locale: firstSegment,
      pathname: normalizedPath,
    };
  }

  const destination = destinationFromNormalizedPath(normalizedPath);
  if (!destination) {
    return { kind: "unmatched", pathname: normalizedPath };
  }

  return {
    kind: "matched",
    locale: defaultLocale,
    pathname: normalizedPath,
    destination,
  };
}

export function switchRouteLocale(
  pathname: string,
  locale: SiteLocale,
): string {
  const { suffix } = splitPathname(pathname);
  const match = matchLocalizedRoute(pathname);

  if (match.kind !== "matched") {
    if (match.kind === "unsupported-locale") {
      throw new UnsupportedLocaleError(match.locale);
    }
    return localizePath(pathname, locale);
  }

  return `${buildLocalizedRoute(match.destination, locale)}${suffix}`;
}
