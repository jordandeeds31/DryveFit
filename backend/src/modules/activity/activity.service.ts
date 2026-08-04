import prisma from "../../lib/prisma";

interface WorkingOutCountRow {
  workedOutTodayGlobal: bigint;
  inProgressGlobal: bigint;
  workedOutTodayCity: bigint;
  inProgressCity: bigint;
}

export const getWorkingOutCount = async (userId: string) => {
  const requester = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { city: true },
  });

  // "Done" has no explicit signal anywhere in the app (no end-workout
  // button) — a user is treated as still "in progress" as long as their
  // most recent logged set is within the last 15 minutes; once that
  // window passes with no new set, they've moved from in-progress into
  // the broader "worked out today" bucket. "Today" is a rolling 24h
  // window rather than a calendar day, deliberately avoiding the kind of
  // timezone-boundary bugs this app has already hit elsewhere.
  const rows = await prisma.$queryRaw<WorkingOutCountRow[]>`
    WITH last_activity AS (
      SELECT wl."userId", u.city AS city, MAX(es."createdAt") AS last_set_at
      FROM exercise_sets es
      JOIN exercise_logs el ON es."exerciseLogId" = el.id
      JOIN workout_logs wl ON el."workoutLogId" = wl.id
      JOIN users u ON wl."userId" = u.id
      WHERE es."createdAt" >= NOW() - INTERVAL '24 hours'
      GROUP BY wl."userId", u.city
    )
    SELECT
      COUNT(*) AS "workedOutTodayGlobal",
      COUNT(*) FILTER (WHERE last_set_at >= NOW() - INTERVAL '15 minutes') AS "inProgressGlobal",
      COUNT(*) FILTER (WHERE city = ${requester.city}) AS "workedOutTodayCity",
      COUNT(*) FILTER (WHERE city = ${requester.city} AND last_set_at >= NOW() - INTERVAL '15 minutes') AS "inProgressCity"
    FROM last_activity
  `;

  const row = rows[0];

  // Postgres COUNT() returns bigint, which node-postgres surfaces as JS
  // bigint — must coerce before this goes through JSON.stringify.
  return {
    workedOutToday: {
      global: Number(row?.workedOutTodayGlobal ?? 0n),
      city: requester.city ? Number(row?.workedOutTodayCity ?? 0n) : null,
    },
    inProgress: {
      global: Number(row?.inProgressGlobal ?? 0n),
      city: requester.city ? Number(row?.inProgressCity ?? 0n) : null,
    },
    cityName: requester.city,
  };
};
