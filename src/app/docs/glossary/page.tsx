import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedGlossaryPages } from "@/lib/content/glossary-pages";

export const metadata: Metadata = {
  title: "Glossary",
  description:
    "Browse foundational ML and model terms defined in the reference.",
};

export default async function GlossaryIndexPage() {
  const pages = await listPublishedGlossaryPages();

  return (
    <article className="prose prose-invert max-w-none">
      <h1>Glossary</h1>
      <p className="text-muted-foreground">
        Defined terms with short summaries. Select a term to read the full
        glossary entry.
      </p>
      {pages.length === 0 ? (
        <p className="text-muted-foreground">
          No glossary entries published yet.
        </p>
      ) : (
        <ul className="not-prose list-none space-y-4 p-0">
          {pages.map((page) => (
            <li key={page.slug} className="border-b border-border pb-4">
              <h2 className="text-lg font-medium">
                <Link
                  href={page.url}
                  className="text-foreground hover:underline"
                >
                  {page.title}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {page.summary}
              </p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
