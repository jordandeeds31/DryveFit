import prisma from "../lib/prisma";
import AppError from "./AppError";

// One account (the developer's own) is exempt so future program days/dates
// can still be tested without waiting for the calendar to catch up.
export const UNRESTRICTED_TEST_EMAIL = "jordandeeds31@gmail.com";

const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Compared against the SERVER's own clock/timezone (Render runs UTC),
// which can disagree with the logging user's local calendar date by up to
// a full day — a user east of UTC can have already crossed into "tomorrow"
// locally while it's still "today" in UTC. A one-day tolerance absorbs
// that full realistic range (no IANA timezone is ever more than ~14h
// ahead of or ~12h behind UTC, so the client's local date can never be
// more than one calendar day off from the server's) without needing the
// client to report its own local date for what's a low-stakes guard
// anyway — self-reported workout data, not something worth strict
// validation against gaming.
export const isFutureDate = (date: Date): boolean =>
  startOfDay(date) > startOfDay(new Date()) + ONE_DAY_MS;

// Throws unless the date is today or in the past, or the logging user is
// the whitelisted test account — used at every entry point that lets a
// client attach an arbitrary date to a workout log, since that's normally
// something only a completed workout should have.
export const assertNotFutureLog = async (
  userId: string,
  date: Date,
): Promise<void> => {
  if (!isFutureDate(date)) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (user?.email === UNRESTRICTED_TEST_EMAIL) return;

  throw new AppError(403, "You can't log a workout for a future date");
};
