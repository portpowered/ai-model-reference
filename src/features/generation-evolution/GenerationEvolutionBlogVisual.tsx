import { GenerationEvolutionTimeline } from "@/features/generation-evolution/GenerationEvolutionTimeline";

/**
 * Blog embed for the diffusion generation-evolution comparison.
 * Uses static default stage data so MDX pages do not fetch at runtime.
 */
export function GenerationEvolutionBlogVisual() {
  return <GenerationEvolutionTimeline />;
}
