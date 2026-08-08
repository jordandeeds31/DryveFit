// A minimal in-memory log + pub-sub so errors (starting with HealthKit's,
// which TestFlight builds strip from any real console output) can be shown
// directly on screen — no cable, no Xcode, no Console.app needed to see
// what's actually happening on a real device.
export interface DebugLogEntry {
  id: string;
  message: string;
  timestamp: number;
}

const MAX_ENTRIES = 50;
let entries: DebugLogEntry[] = [];
let nextId = 0;
const listeners = new Set<(entries: DebugLogEntry[]) => void>();

export const logDebug = (message: string) => {
  const entry: DebugLogEntry = {
    id: String(nextId++),
    message,
    timestamp: Date.now(),
  };
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  listeners.forEach((listener) => listener(entries));
};

export const getDebugLogEntries = () => entries;

export const subscribeDebugLog = (
  listener: (entries: DebugLogEntry[]) => void,
) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const clearDebugLog = () => {
  entries = [];
  listeners.forEach((listener) => listener(entries));
};
