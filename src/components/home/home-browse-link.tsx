import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type HomeBrowseListProps = {
  ariaLabel: string;
  children: ReactNode;
};

type HomeBrowseLinkProps = {
  href: string;
  title: string;
  description: string;
};

export function HomeBrowseList({ ariaLabel, children }: HomeBrowseListProps) {
  return (
    <ul className="mt-4 flex list-none flex-col gap-3" aria-label={ariaLabel}>
      {children}
    </ul>
  );
}

export function HomeBrowseLink({
  href,
  title,
  description,
}: HomeBrowseLinkProps) {
  return (
    <li>
      <Link
        href={href}
        className="group block rounded-lg border border-border bg-card/40 p-4 no-underline transition-colors hover:border-ring hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-2 font-medium text-foreground">
          {title}
          <ArrowRight
            className="size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        </span>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </Link>
    </li>
  );
}
