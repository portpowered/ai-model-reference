import Link from "next/link";

export default function DocsNotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
      <p className="text-muted-foreground">
        No documentation page matches this path. Choose a page from the sidebar
        or return to the docs index.
      </p>
      <Link
        href="/docs/getting-started"
        className="text-primary underline-offset-4 hover:underline"
      >
        Go to Getting Started
      </Link>
    </main>
  );
}
