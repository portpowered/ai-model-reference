import { loadUiMessages } from "@/lib/content/ui-messages";

export default function HomePage() {
  const messages = loadUiMessages();
  return (
    <article>
      <h1 className="font-serif text-3xl font-semibold">Model Atlas</h1>
      <p className="mt-4 text-muted-foreground">
        Reference home placeholder for Phase 1 discovery surfaces.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Use {messages.search.shortcut} or the top navigation control to open
        search.
      </p>
    </article>
  );
}
