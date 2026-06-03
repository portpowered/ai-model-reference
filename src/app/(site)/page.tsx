import Link from "next/link";

export default function HomePage() {
  return (
    <article>
      <h1 className="text-2xl font-semibold">Model Reference</h1>
      <p className="mt-2 text-muted-foreground">
        Canonical docs for models, modules, and attention variants.
      </p>
      <p className="mt-4">
        <Link
          href="/docs/modules/grouped-query-attention"
          className="text-primary underline-offset-4 hover:underline"
        >
          Grouped-query attention module reference
        </Link>
      </p>
    </article>
  );
}
