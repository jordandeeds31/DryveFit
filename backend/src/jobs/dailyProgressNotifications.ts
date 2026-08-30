import { Expo } from "expo-server-sdk";
import prisma from "../lib/prisma";
import expo from "../lib/expoPush";
import { runDailyAnalysisForUser } from "../modules/dailyAnalysis/dailyAnalysis.service";

// Fixed local-clock target (9:00pm) rather than a fixed server-clock
// time — same reasoning and same localPartsInTimeZone machinery as
// workoutReminders.ts's 8:25-8:44pm window, just staggered 35 minutes
// later so a workout logged right up against that window still counts
// toward today's analysis.
const NOTIFY_HOUR = 21;
const NOTIFY_MINUTE_START = 0;
const NOTIFY_MINUTE_END = 14;

// Same reasoning as workoutReminders.ts's REMINDER_COOLDOWN_MS — long
// enough to cover the ~15min window comfortably, short enough that
// tomorrow's window claims cleanly again.
const NOTIFY_COOLDOWN_MS = 20 * 60 * 60 * 1000;

const localPartsInTimeZone = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
};

// Same atomic-claim pattern as workoutReminders.ts's claimReminder — only
// updates (and only reports success) if the field is unset or past the
// cooldown, so two overlapping cron ticks can't both send.
const claimNotification = async (userId: string): Promise<boolean> => {
  const cutoff = new Date(Date.now() - NOTIFY_COOLDOWN_MS);
  const { count } = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [
        { lastDailyAnalysisNotifiedAt: null },
        { lastDailyAnalysisNotifiedAt: { lt: cutoff } },
      ],
    },
    data: { lastDailyAnalysisNotifiedAt: new Date() },
  });
  return count === 1;
};

// Runs on every cron tick (see index.ts) — cheap no-op for almost every
// tick/user, since it bails immediately for anyone outside their own
// 9:00-9:14pm local window or already notified today. Computes (and
// persists, via runDailyAnalysisForUser) each eligible user's analysis
// for their own local "today" before sending, so the push and the
// stored DailyAnalysis a tap opens are always for the same result.
export const sendDailyProgressNotifications = async (): Promise<void> => {
  const candidates = await prisma.user.findMany({
    where: { expoPushToken: { not: null }, timezone: { not: null } },
    select: { id: true, expoPushToken: true, timezone: true },
  });

  for (const user of candidates) {
    if (!user.expoPushToken || !user.timezone) continue;
    if (!Expo.isExpoPushToken(user.expoPushToken)) continue;

    let local;
    try {
      local = localPartsInTimeZone(new Date(), user.timezone);
    } catch {
      continue; // malformed stored timezone — skip rather than fail the run
    }

    const inNotifyWindow =
      local.hour === NOTIFY_HOUR &&
      local.minute >= NOTIFY_MINUTE_START &&
      local.minute <= NOTIFY_MINUTE_END;
    if (!inNotifyWindow) continue;

    if (!(await claimNotification(user.id))) continue;

    try {
      const analysis = await runDailyAnalysisForUser(user.id, local.dateKey);

      await expo.sendPushNotificationsAsync([
        {
          to: user.expoPushToken,
          sound: "default",
          title: analysis.headline,
          body:
            analysis.dayType === "no_data"
              ? "Nothing logged today — tap to see tomorrow's fresh start."
              : analysis.explanation,
          data: { type: "daily_analysis", date: analysis.date },
        },
      ]);
    } catch (err) {
      // A failed analysis/push for one user (e.g. a transient LLM error)
      // shouldn't stop the rest of this tick's candidates from being
      // notified — same isolation as the rest of this loop's per-user
      // try/catches elsewhere in the codebase.
      console.error(`sendDailyProgressNotifications failed for user ${user.id}:`, err);
    }
  }
};
