import { Expo } from "expo-server-sdk";
import prisma from "../lib/prisma";
import expo from "../lib/expoPush";
import { getCurrentStreak } from "../modules/programs/programs.service";

// Fixed local-clock target (8:30pm) rather than a fixed server-clock
// time — the job itself runs on a server-timezone cron tick every 15
// minutes, but each user's *local* time is what's checked against this
// window, computed fresh per user below via their stored IANA timezone.
const REMINDER_HOUR = 20;
const REMINDER_MINUTE_START = 25;
const REMINDER_MINUTE_END = 44;

// Both reminders below are meant to fire at most once per calendar day per
// user. A fixed cooldown comfortably longer than the ~20min daily window
// but well under 24h serves as the "not already sent today" condition —
// checked and set atomically in claimReminder below, rather than a
// read-then-later-write pattern. That atomicity is the actual point: two
// overlapping invocations of this job (e.g. one run still in flight for a
// large user base when the next 15-minute cron tick fires) previously
// raced past the same "haven't I sent this already?" check before either
// one's write landed, which is how the same user could end up with
// several identical pushes by the end of a single day's window instead of
// just one.
const REMINDER_COOLDOWN_MS = 20 * 60 * 60 * 1000;

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

// The complementary check to findIncompleteScheduledDay above — used to
// fire the streak notification once today's scheduled workout (if any)
// is actually finished, instead of nagging about something already done.
// Deliberately excludes rest days (isRestDay: false, same filter as
// above): nothing was due today on a rest day, so there's nothing to
// congratulate yet — the streak notification only fires the moment a
// real workout gets completed.
const findCompletedScheduledDay = async (
  userId: string,
  dateKey: string,
): Promise<boolean> => {
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
    },
  });

  if (!programDay || programDay.exercises.length === 0) return false;

  return programDay.exercises.every(
    (exercise) => exercise._count.exerciseLogs > 0,
  );
};

type ReminderField =
  | "lastWorkoutReminderSentAt"
  | "lastNoProgramReminderSentAt"
  | "lastStreakNotificationSentAt";

// Atomically claims the right to send a given reminder to this user right
// now: only updates (and only reports success) if the field is unset or
// past the cooldown, in a single conditional statement — so two concurrent
// callers can't both read "not sent yet" and both proceed to send.
const claimReminder = async (
  userId: string,
  field: ReminderField,
): Promise<boolean> => {
  const cutoff = new Date(Date.now() - REMINDER_COOLDOWN_MS);
  const { count } = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ [field]: null }, { [field]: { lt: cutoff } }],
    },
    data: { [field]: new Date() },
  });
  return count === 1;
};

// Runs on every cron tick (see index.ts) — cheap no-op for almost every
// tick/user, since it bails immediately for anyone outside their own
// 8:25-8:44pm local window or already notified today. Also covers the
// streak congratulation push (see findCompletedScheduledDay below) —
// same daily window/per-user-timezone machinery, just branching on
// whether today's scheduled workout is done rather than overdue.
export const sendDueWorkoutReminders = async (): Promise<void> => {
  const candidates = await prisma.user.findMany({
    where: { expoPushToken: { not: null }, timezone: { not: null } },
    select: {
      id: true,
      expoPushToken: true,
      timezone: true,
      _count: { select: { programs: true } },
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

    // Someone who has never created a program can't have a scheduled day
    // to be reminded about — nudge them toward creating one instead.
    if (user._count.programs === 0) {
      if (!(await claimReminder(user.id, "lastNoProgramReminderSentAt"))) continue;

      await expo.sendPushNotificationsAsync([
        {
          to: user.expoPushToken,
          sound: "default",
          title: "You don't have a program yet",
          body: "Set one up and it'll automatically adjust your weights every week using real exercise science — like % of your 1-rep max and progressive overload — instead of you having to guess.",
          data: { screen: "programs" },
        },
      ]);
      continue;
    }

    const dueDay = await findIncompleteScheduledDay(user.id, local.dateKey);
    if (dueDay) {
      if (!(await claimReminder(user.id, "lastWorkoutReminderSentAt"))) continue;

      await expo.sendPushNotificationsAsync([
        {
          to: user.expoPushToken,
          sound: "default",
          title: "Still time to get it in",
          body: `You haven't logged today's ${dueDay.focus} workout yet.`,
          data: { programId: dueDay.programId, date: local.dateKey },
        },
      ]);
      continue;
    }

    // Nothing left incomplete — if today's scheduled workout is what just
    // got finished (not simply a rest day with nothing due), congratulate
    // and report the running streak instead of staying silent.
    if (!(await findCompletedScheduledDay(user.id, local.dateKey))) continue;
    if (!(await claimReminder(user.id, "lastStreakNotificationSentAt"))) continue;

    const { streak: currentStreak } = await getCurrentStreak(user.id);

    await expo.sendPushNotificationsAsync([
      {
        to: user.expoPushToken,
        sound: "default",
        title: `🔥 ${currentStreak}-day streak`,
        body: "You stuck to your plan today. Keep it going tomorrow!",
        data: { screen: "personal-record-progress" },
      },
    ]);
  }
};
