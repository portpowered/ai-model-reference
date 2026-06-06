import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  bulletlessListClassName,
  docsResourceCardLinkClassName,
} from "@/features/docs/components/list-decoration";

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
    <ul className={bulletlessListClassName("mt-4")} aria-label={ariaLabel}>
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
      <Link href={href} className={docsResourceCardLinkClassName}>
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
