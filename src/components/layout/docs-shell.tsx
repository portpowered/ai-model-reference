import Link from "next/link";
import type { ReactNode } from "react";
import type { UiMessages } from "@/lib/content/ui-messages";

type DocsShellProps = {
  children: ReactNode;
  messages: UiMessages;
};

export function DocsShell({ children, messages }: DocsShellProps) {
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
              href="/docs/modules/grouped-query-attention"
              className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {messages.nav.docs}
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        <aside
          className="hidden w-56 shrink-0 border-r border-border pr-4 text-sm text-muted-foreground md:block"
          aria-label="Docs sidebar"
        >
          <p className="font-medium text-foreground">Reference</p>
          <p className="mt-2">Browse modules, concepts, and tags.</p>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
        <aside
          className="hidden w-48 shrink-0 pl-4 text-sm text-muted-foreground lg:block"
          aria-label="On this page"
        >
          <p className="font-medium text-foreground">On this page</p>
        </aside>
      </div>
    </div>
  );
}
