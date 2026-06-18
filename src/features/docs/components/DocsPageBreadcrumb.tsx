import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { localizeDocsHref } from "@/lib/content/localized-docs-href";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";
import { source } from "@/lib/source";

const SECTION_FALLBACK_LABELS: Record<string, string> = {
  concepts: "Concepts",
  glossary: "Glossary",
  models: "Models",
  modules: "Modules",
  papers: "Papers",
  training: "Training",
};

type BreadcrumbSegment = {
  label: string;
  href?: string;
};

type DocsPageBreadcrumbProps = {
  locale?: SiteLocale;
  messages: UiMessages;
  slug: string[] | undefined;
  title: string;
};

function getSectionLabel(section: string): string {
  return (
    source.getPage([section])?.data.title ??
    SECTION_FALLBACK_LABELS[section] ??
    section
  );
}

export function buildDocsBreadcrumbSegments(
  slug: string[] | undefined,
  title: string,
  messages: UiMessages,
  locale: SiteLocale = defaultLocale,
): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [
    {
      label: messages.nav.home,
      href: buildLocalizedRoute({ surface: "home" }, locale),
    },
  ];

  if (slug && slug.length >= 2) {
    const section = slug[0];
    segments.push({
      label: getSectionLabel(section),
      href: localizeDocsHref(`/docs/${section}`, locale),
    });
  }

  segments.push({ label: title });

  return segments;
}

export function DocsPageBreadcrumb({
  locale = defaultLocale,
  messages,
  slug,
  title,
}: DocsPageBreadcrumbProps) {
  const segments = buildDocsBreadcrumbSegments(slug, title, messages, locale);
  const lastIndex = segments.length - 1;

  return (
    <Breadcrumb className="mb-3">
      <BreadcrumbList>
        {segments.map((segment, index) => (
          <BreadcrumbItem key={`${segment.label}-${index}`}>
            {segment.href && index !== lastIndex ? (
              <BreadcrumbLink
                render={<Link href={segment.href} />}
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
              >
                {segment.label}
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage className="text-xs font-medium uppercase tracking-[0.18em] text-foreground">
                {segment.label}
              </BreadcrumbPage>
            )}
            {index < lastIndex ? <BreadcrumbSeparator /> : null}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
