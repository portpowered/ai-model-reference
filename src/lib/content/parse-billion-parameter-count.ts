const BILLION_PARAMETER_COUNT_PATTERN =
  /^(\d+(?:\.\d+)?)\s+billion(?:\s+(?:total|active))?\s+parameters$/i;

/**
 * Parses registry billion-parameter strings such as
 * `744 billion total parameters` or `0.6 billion parameters`.
 *
 * Returns `null` for missing, empty, or unsupported values instead of
 * throwing or producing `NaN` or `0`.
 */
export function parseBillionParameterCount(
  value: string | null | undefined,
): number | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const match = BILLION_PARAMETER_COUNT_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}
