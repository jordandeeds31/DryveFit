import { Expo } from "expo-server-sdk";
import prisma from "../lib/prisma";
import expo from "../lib/expoPush";

// Fixed local-clock target (8:30pm) rather than a fixed server-clock
// time — the job itself runs on a server-timezone cron tick every 15
// minutes, but each user's *local* time is what's checked against this
// window, computed fresh per user below via their stored IANA timezone.
const REMINDER_HOUR = 20;
const REMINDER_MINUTE_START = 25;
const REMINDER_MINUTE_END = 44;

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
  // Some ICU builds report hour "24" for midnight under hour12:false.
  return {
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
};

const findIncompleteScheduledDay = async (userId: string, dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

  const programDay = await prisma.programDay.findFirst({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
      isRestDay: false,
      week: { program: { userId, isActive: true } },
    },
    include: {
      exercises: { include: { _count: { select: { exerciseLogs: true } } } },
      week: { include: { program: { select: { id: true } } } },
    },
  });

  if (!programDay || programDay.exercises.length === 0) return null;

  const hasIncomplete = programDay.exercises.some(
    (exercise) => exercise._count.exerciseLogs === 0,
  );
  if (!hasIncomplete) return null;

  return { programId: programDay.week.program.id, focus: programDay.focus };
};

// Runs on every cron tick (see index.ts) — cheap no-op for almost every
// tick/user, since it bails immediately for anyone outside their own
// 8:25-8:44pm local window or already reminded today.
export const sendDueWorkoutReminders = async (): Promise<void> => {
  const candidates = await prisma.user.findMany({
    where: { expoPushToken: { not: null }, timezone: { not: null } },
    select: {
      id: true,
      expoPushToken: true,
      timezone: true,
      lastWorkoutReminderSentAt: true,
    },
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

    const inReminderWindow =
      local.hour === REMINDER_HOUR &&
      local.minute >= REMINDER_MINUTE_START &&
      local.minute <= REMINDER_MINUTE_END;
    if (!inReminderWindow) continue;

    if (user.lastWorkoutReminderSentAt) {
      const lastSentLocal = localPartsInTimeZone(
        user.lastWorkoutReminderSentAt,
        user.timezone,
      );
      if (lastSentLocal.dateKey === local.dateKey) continue;
    }

    const dueDay = await findIncompleteScheduledDay(user.id, local.dateKey);
    if (!dueDay) continue;

    await expo.sendPushNotificationsAsync([
      {
        to: user.expoPushToken,
        sound: "default",
        title: "Still time to get it in",
        body: `You haven't logged today's ${dueDay.focus} workout yet.`,
        data: { programId: dueDay.programId, date: local.dateKey },
      },
    ]);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastWorkoutReminderSentAt: new Date() },
    });
  }
};
