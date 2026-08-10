import prisma from "../lib/prisma";
import AppError from "./AppError";

// One account (the developer's own) is exempt so future program days/dates
// can still be tested without waiting for the calendar to catch up.
const UNRESTRICTED_TEST_EMAIL = "jordandeeds31@gmail.com";

const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const isFutureDate = (date: Date): boolean =>
  startOfDay(date) > startOfDay(new Date());

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
