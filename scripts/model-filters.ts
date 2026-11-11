/**
 * Pure model-ID filters shared by fetch-models.ts and generate-models.ts.
 *
 * Kept free of I/O and side effects so the selection rules can be unit-tested
 * (tests/unit/model-filters.test.ts) without hitting the Gemini API.
 */

/**
 * Versioned general-purpose family: `gemini-<major>[.<minor>]-<variant>`.
 *
 * This is an allow-list on the ID shape. Non-versioned families the API also
 * lists under the `gemini-` prefix (`gemini-omni-*`, `gemini-nano-banana-*`,
 * `gemini-robotics-*`, `gemini-flash-latest`, ...) do not match and are
 * therefore excluded without needing a per-family entry.
 */
const VERSIONED_GEMINI_PATTERN = /^gemini-\d+(?:\.\d+)?-/;

/**
 * Specialized variants of a versioned family that do NOT fit the gem-back
 * fallback chain semantics (generic text chat / generate): speech synthesis
 * (`-tts` anywhere, including as a suffix), transcription, image generation,
 * computer-use and custom-tools-optimized models.
 */
export const EXCLUDED_VARIANT_PATTERN =
  /-tts(?:-|$)|-transcribe(?:-|$)|-image(?:-|$)|-computer-use(?:-|$)|-customtools$/;

/** `-latest` aliases and pinned snapshots (`-001`, `-09-2025`) are not tracked. */
const ALIAS_OR_SNAPSHOT_PATTERN = /-latest$|-\d{3,}$|-\d{2}-\d{4}$/;

const UNSTABLE_PATTERN = /preview|experimental|-exp/;

/**
 * True for IDs that belong in the library's model list: a versioned Gemini
 * text model that is not a specialized variant.
 */
export function isGeneralTextModel(name: string): boolean {
  const lower = name.toLowerCase();
  return VERSIONED_GEMINI_PATTERN.test(lower) && !EXCLUDED_VARIANT_PATTERN.test(lower);
}

/**
 * Extract `[major, minor]` from a model ID, `[0, 0]` if it has no version.
 */
export function extractVersion(name: string): [number, number] {
  const match = name.toLowerCase().match(/^gemini-(\d+)(?:\.(\d+))?/);
  return match ? [parseInt(match[1], 10), parseInt(match[2] ?? '0', 10)] : [0, 0];
}

/**
 * Highest `[major, minor]` among the general text models in `names`.
 */
export function detectLatestVersion(names: readonly string[]): [number, number] {
  let latest: [number, number] = [0, 0];
  for (const name of names) {
    if (!isGeneralTextModel(name)) continue;
    const [major, minor] = extractVersion(name);
    if (major > latest[0] || (major === latest[0] && minor > latest[1])) {
      latest = [major, minor];
    }
  }
  return latest;
}

/**
 * Select the model IDs the library should track from the raw API listing.
 *
 * A model is kept when it is a general text model (see `isGeneralTextModel`),
 * is not an alias/snapshot, and is either:
 *   - stable, or
 *   - a preview/experimental of the latest major version, or
 *   - a preview/experimental the library already ships (`knownModels`).
 *
 * The last rule exists because a new major (e.g. Gemini 4) must not silently
 * drop previews of older majors that the API still serves and that callers
 * already reference (e.g. `gemini-3-flash-preview`) — that would remove them
 * from the `GeminiModel` union while they keep working upstream. New previews
 * of older majors are still not picked up.
 */
export function selectLibraryModels(
  names: readonly string[],
  knownModels: ReadonlySet<string>
): string[] {
  const [latestMajor] = detectLatestVersion(names);
  return names.filter((name) => {
    const lower = name.toLowerCase();
    if (!isGeneralTextModel(lower)) return false;
    if (ALIAS_OR_SNAPSHOT_PATTERN.test(lower)) return false;
    if (!UNSTABLE_PATTERN.test(lower)) return true;
    return extractVersion(lower)[0] === latestMajor || knownModels.has(name);
  });
}
