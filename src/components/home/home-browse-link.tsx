import { ArrowRight } from "lucide-react";
import Link from "next/link";

type HomeBrowseLinkProps = {
  href: string;
  title: string;
  description: string;
};

export function HomeBrowseLink({
  href,
  title,
  description,
}: HomeBrowseLinkProps) {
  return (
    <li>
      <Link
        href={href}
        className="group block rounded-lg border border-border bg-card/40 p-4 transition-colors hover:border-ring hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
