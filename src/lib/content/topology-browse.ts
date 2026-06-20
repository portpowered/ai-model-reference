import {
  TOPOLOGY_SURFACE_MODES,
  type TopologyNavigationOption,
  type TopologySurfaceMode,
} from "@/lib/content/topology-navigation";

export type TopologySearchParams = Record<
  string,
  string | string[] | undefined
>;

export type TopologyBrowseState =
  | {
      kind: "not-requested";
      options: readonly TopologyNavigationOption[];
    }
  | {
      kind: "empty";
      requestedClassification?: string;
      requestedMode?: string;
      options: readonly TopologyNavigationOption[];
    }
  | {
      kind: "invalid";
      requestedClassification?: string;
      requestedMode?: string;
      options: readonly TopologyNavigationOption[];
      classificationStatus: "missing" | "unsupported" | "valid";
      modeStatus: "missing" | "unsupported" | "valid";
    }
  | {
      kind: "selected";
      option: TopologyNavigationOption;
      mode: TopologySurfaceMode;
      options: readonly TopologyNavigationOption[];
    };

function readSingleParam(
  searchParams: TopologySearchParams | undefined,
  key: string,
): string | undefined {
  const value = searchParams?.[key];
  const singleValue = Array.isArray(value) ? value[0] : value;

  if (typeof singleValue !== "string") {
    return undefined;
  }

  const trimmedValue = singleValue.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function isTopologySurfaceMode(
  value: string | undefined,
): value is TopologySurfaceMode {
  return TOPOLOGY_SURFACE_MODES.some((mode) => mode === value);
}

export function resolveTopologyBrowseState(
  searchParams: TopologySearchParams | undefined,
  options: readonly TopologyNavigationOption[],
): TopologyBrowseState {
  const requestedClassification = readSingleParam(
    searchParams,
    "classification",
  );
  const requestedMode = readSingleParam(searchParams, "mode");

  if (!requestedClassification && !requestedMode) {
    return { kind: "not-requested", options };
  }

  if (options.length === 0) {
    return {
      kind: "empty",
      requestedClassification,
      requestedMode,
      options,
    };
  }

  const selectedOption = options.find(
    (option) => option.classificationSlug === requestedClassification,
  );
  const selectedMode = isTopologySurfaceMode(requestedMode)
    ? requestedMode
    : undefined;

  const classificationStatus = !requestedClassification
    ? "missing"
    : selectedOption
      ? "valid"
      : "unsupported";
  const modeStatus = !requestedMode
    ? "missing"
    : selectedMode
      ? "valid"
      : "unsupported";

  if (!selectedOption || !selectedMode) {
    return {
      kind: "invalid",
      requestedClassification,
      requestedMode,
      options,
      classificationStatus,
      modeStatus,
    };
  }

  return {
    kind: "selected",
    option: selectedOption,
    mode: selectedMode,
    options,
  };
}

/** Reads `/browse` topology state from a browser location search string. */
export function readTopologyBrowseStateFromLocationSearch(
  options: readonly TopologyNavigationOption[],
  search = typeof window === "undefined" ? "" : window.location.search,
): TopologyBrowseState {
  return resolveTopologyBrowseState(
    Object.fromEntries(new URLSearchParams(search)),
    options,
  );
}
