const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const BACKOFF_FACTOR = 2;

// Exponential backoff with full jitter, capped — attempt 0 is the first
// reconnect try after an initial drop. Jitter (rather than a fixed
// exponential delay) avoids every client reconnecting in lockstep after a
// server restart or blip, which would otherwise hit the server with a
// synchronized burst right as it's coming back up.
export const computeBackoffDelay = (attempt: number): number => {
  const exponential = BASE_DELAY_MS * Math.pow(BACKOFF_FACTOR, attempt);
  const capped = Math.min(exponential, MAX_DELAY_MS);
  return Math.floor(Math.random() * capped);
};
