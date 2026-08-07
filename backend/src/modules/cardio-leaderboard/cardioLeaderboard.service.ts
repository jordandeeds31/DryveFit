import prisma from "../../lib/prisma";
import { Prisma } from "../../generated/prisma/client";
import { CARDIO_ACTIVITY_TYPES, CardioActivityType } from "../cardio/cardio.service";

export const CARDIO_LEADERBOARD_CATEGORIES = [
  "steps-best-day",
  "steps-all-time",
  "calories-best-day",
  "calories-all-time",
  "best-pace",
] as const;
export type CardioLeaderboardCategory =
  (typeof CARDIO_LEADERBOARD_CATEGORIES)[number];

type Gender = "male" | "female";

interface CardioLeaderboardRow {
  id: string;
  username: string;
  hasImage: boolean;
  value: number;
}

// Rankings are always split by gender, same rationale as the lifting
// leaderboard — mixing them wouldn't produce a fair comparison.
const genderAndVisibilityFilter = (gender: Gender) => Prisma.sql`
  AND u.gender = ${gender}
  AND u."isLeaderboardVisible" = true
  AND u.username IS NOT NULL
`;

// "Best day" totals: sum stepCount/caloriesBurned per user per calendar day
// across all their sessions for the activity, then rank by each user's best
// single day — a personal-record-style comparison rather than a live
// "today" leaderboard that would reset at midnight.
const bestDayQuery = (
  column: "stepCount" | "caloriesBurned",
  activityType: CardioActivityType,
  gender: Gender,
) => prisma.$queryRaw<CardioLeaderboardRow[]>`
  SELECT id, username, "hasImage", MAX("dailyTotal")::int AS "value"
  FROM (
    SELECT u.id,
           u.username,
           u."profileImageMimeType" IS NOT NULL AS "hasImage",
           date_trunc('day', cs."startedAt") AS day,
           SUM(cs.${Prisma.raw(`"${column}"`)}) AS "dailyTotal"
    FROM cardio_sessions cs
    JOIN users u ON cs."userId" = u.id
    WHERE cs.${Prisma.raw(`"${column}"`)} IS NOT NULL
      AND cs."activityType" = ${activityType}
      ${genderAndVisibilityFilter(gender)}
    GROUP BY u.id, u.username, u."profileImageMimeType", day
  ) daily
  GROUP BY id, username, "hasImage"
  ORDER BY "value" DESC
  LIMIT 200
`;

const allTimeQuery = (
  column: "stepCount" | "caloriesBurned",
  activityType: CardioActivityType,
  gender: Gender,
) => prisma.$queryRaw<CardioLeaderboardRow[]>`
  SELECT u.id,
         u.username,
         u."profileImageMimeType" IS NOT NULL AS "hasImage",
         SUM(cs.${Prisma.raw(`"${column}"`)})::int AS "value"
  FROM cardio_sessions cs
  JOIN users u ON cs."userId" = u.id
  WHERE cs.${Prisma.raw(`"${column}"`)} IS NOT NULL
    AND cs."activityType" = ${activityType}
    ${genderAndVisibilityFilter(gender)}
  GROUP BY u.id, u.username, u."profileImageMimeType"
  HAVING SUM(cs.${Prisma.raw(`"${column}"`)}) > 0
  ORDER BY "value" DESC
  LIMIT 200
`;

// value = best average speed in meters/second across a user's sessions for
// this activity. The frontend converts this into pace (min/mi) for walk/run
// or mph for bike, whichever reads naturally for the activity type.
const bestPaceQuery = (activityType: CardioActivityType, gender: Gender) =>
  prisma.$queryRaw<CardioLeaderboardRow[]>`
    SELECT u.id,
           u.username,
           u."profileImageMimeType" IS NOT NULL AS "hasImage",
           MAX(cs."distanceMeters" / NULLIF(cs."durationSeconds", 0)) AS "value"
    FROM cardio_sessions cs
    JOIN users u ON cs."userId" = u.id
    WHERE cs."distanceMeters" > 0
      AND cs."durationSeconds" > 0
      AND cs."activityType" = ${activityType}
      ${genderAndVisibilityFilter(gender)}
    GROUP BY u.id, u.username, u."profileImageMimeType"
    ORDER BY "value" DESC
    LIMIT 200
  `;

export const getCardioLeaderboard = async (
  userId: string,
  activityType: CardioActivityType,
  category: CardioLeaderboardCategory,
  gender: Gender,
) => {
  const rows = await (() => {
    switch (category) {
      case "steps-best-day":
        return bestDayQuery("stepCount", activityType, gender);
      case "steps-all-time":
        return allTimeQuery("stepCount", activityType, gender);
      case "calories-best-day":
        return bestDayQuery("caloriesBurned", activityType, gender);
      case "calories-all-time":
        return allTimeQuery("caloriesBurned", activityType, gender);
      case "best-pace":
        return bestPaceQuery(activityType, gender);
    }
  })();

  return {
    activityType,
    category,
    gender,
    entries: rows.map((row, index) => ({
      id: row.id,
      rank: index + 1,
      username: row.username,
      value: Number(row.value),
      isCurrentUser: row.id === userId,
      profileImageUrl: row.hasImage
        ? `/api/users/${row.id}/profile-image`
        : null,
    })),
  };
};

export { CARDIO_ACTIVITY_TYPES };
export type { CardioActivityType };
