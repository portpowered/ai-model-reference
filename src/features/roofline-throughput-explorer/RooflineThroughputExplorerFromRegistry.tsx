import { getRooflineModelSizePresets } from "@/lib/content/roofline-model-size-presets";
import { RooflineThroughputExplorer } from "./RooflineThroughputExplorer";

/** Build-time wrapper that passes registry-derived presets without browser fetches. */
export function RooflineThroughputExplorerFromRegistry() {
  const presets = getRooflineModelSizePresets();

  return <RooflineThroughputExplorer presets={presets} />;
}
