import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Model Reference
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        A static documentation reference for AI models, modules, papers, and
        related concepts.
      </p>
      <div className="mt-8">
        <Button type="button">Explore the reference</Button>
      </div>
    </main>
  );
}
