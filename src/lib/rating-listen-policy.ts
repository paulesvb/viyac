/**
 * Threshold for allowing a personal track rating: enough real listening time
 * relative to catalog duration. Mirrors server validation for API routes.
 */
const LISTEN_ABSOLUTE_CAP_SEC = 45;
const LISTEN_MIN_FLOOR_SEC = 5;
const LISTEN_FRACTION = 0.25;

/** Seconds of playback required before the user may rate (server + client hint). */
export function ratingListenThresholdSeconds(durationMs: number | null): number {
  if (durationMs == null || durationMs <= 0) return LISTEN_ABSOLUTE_CAP_SEC;
  const durationSec = durationMs / 1000;
  const fromFraction = durationSec * LISTEN_FRACTION;
  const blended = Math.min(
    LISTEN_ABSOLUTE_CAP_SEC,
    Math.max(LISTEN_MIN_FLOOR_SEC, fromFraction),
  );
  return Math.min(durationSec, blended);
}

export function listenEligibleForRating(
  listenedSecondsTotal: number,
  durationMs: number | null,
): boolean {
  return listenedSecondsTotal >= ratingListenThresholdSeconds(durationMs);
}
