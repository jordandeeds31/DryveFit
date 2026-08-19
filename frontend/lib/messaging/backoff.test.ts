import { computeBackoffDelay } from "./backoff";

describe("computeBackoffDelay", () => {
  it("never returns a negative delay", () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      expect(computeBackoffDelay(attempt)).toBeGreaterThanOrEqual(0);
    }
  });

  it("caps the delay at 30 seconds even for a large attempt count", () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      expect(computeBackoffDelay(attempt)).toBeLessThanOrEqual(30000);
    }
  });

  it("raises the maximum possible delay as attempts increase, up to the cap", () => {
    // Jitter makes any single call non-deterministic, so this checks the
    // ceiling (base * factor^attempt, capped) grows monotonically instead
    // of asserting on one sampled value.
    const sampleMax = (attempt: number): number => {
      let max = 0;
      for (let i = 0; i < 200; i++) {
        max = Math.max(max, computeBackoffDelay(attempt));
      }
      return max;
    };

    const maxAt0 = sampleMax(0);
    const maxAt3 = sampleMax(3);
    const maxAt10 = sampleMax(10);

    expect(maxAt3).toBeGreaterThan(maxAt0);
    expect(maxAt10).toBeGreaterThan(maxAt3);
    expect(maxAt10).toBeLessThanOrEqual(30000);
  });

  it("stays near zero on the very first attempt", () => {
    // attempt 0 -> ceiling is BASE_DELAY_MS (1000ms) before jitter.
    for (let i = 0; i < 50; i++) {
      expect(computeBackoffDelay(0)).toBeLessThanOrEqual(1000);
    }
  });
});
