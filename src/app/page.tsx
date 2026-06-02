import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-display text-sm tracking-widest text-muted-foreground uppercase">
        Model Atlas
      </p>
      <h1 className="mt-2 font-heading text-4xl font-semibold tracking-tight text-foreground capitalize">
        Model Reference
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        A static documentation reference for AI models, modules, papers, and
        related concepts. Browse concept pages, model architectures, and module
        explainers from one docs shell.
      </p>
      <div className="mt-8">
        <Link
          href="/docs/getting-started"
          className={cn(
            buttonVariants({ variant: "default" }),
            "focus-visible:ring-ring",
          )}
        >
          Open docs placeholder
        </Link>
      </div>
    </main>
  );
}
