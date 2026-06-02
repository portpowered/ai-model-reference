"use client";

import { SearchTrigger } from "@/features/docs/search/SearchTrigger";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type DocsShellProps = {
  children: ReactNode;
  messages: UiMessages;
};

export function DocsShell({ children, messages }: DocsShellProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const onThisPageItems = isHome
    ? [
        { href: "#search", label: messages.home.onThisPageSearch },
        { href: "#browse", label: messages.home.onThisPageBrowse },
      ]
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <nav
            className="flex flex-1 flex-wrap items-center gap-4 text-sm"
            aria-label="Primary"
          >
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {messages.nav.home}
            </Link>
            <Link
              href="/docs/glossary"
              className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {messages.nav.glossary}
            </Link>
            <Link
              href="/tags"
              className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {messages.nav.tags}
            </Link>
            <Link
              href="/docs/modules/grouped-query-attention"
              className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {messages.nav.docs}
            </Link>
          </nav>
          <SearchTrigger messages={messages} />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        <aside
          className="hidden w-56 shrink-0 border-r border-border pr-4 text-sm text-muted-foreground md:block"
          aria-label="Docs sidebar"
        >
          <p className="font-medium text-foreground">
            {messages.shell.sidebarTitle}
          </p>
          <p className="mt-2">{messages.shell.sidebarDescription}</p>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
        <aside
          className="hidden w-48 shrink-0 pl-4 text-sm text-muted-foreground lg:block"
          aria-label="On this page"
        >
          <p className="font-medium text-foreground">
            {messages.shell.onThisPage}
          </p>
          {onThisPageItems.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {onThisPageItems.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
