import prisma from "../../lib/prisma";
import { Prisma } from "../../generated/prisma/client";
import AppError from "../../utils/AppError";

type Scope = "city" | "global";
type Gender = "male" | "female";

interface LeaderboardRow {
  id: string;
  username: string;
  hasImage: boolean;
  estimated1RM: number;
}

export const getLeaderboard = async (
  userId: string,
  exerciseName: string,
  scope: Scope,
  gender: Gender,
) => {
  let city: string | null = null;

  if (scope === "city") {
    const requester = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { city: true },
    });

    if (!requester.city) {
      throw new AppError(
        400,
        "Set your city in your profile to use the city leaderboard",
      );
    }

    city = requester.city;
  }

  const cityFilter = city ? Prisma.sql`AND u.city = ${city}` : Prisma.sql``;
  // Rankings are always split by gender — strength benchmarks differ enough
  // between men and women that mixing them wouldn't produce a fair ranking.
  const genderFilter = Prisma.sql`AND u.gender = ${gender}`;

  // Same Epley estimate as getExercise1RMHistory
  // (Math.round(weight * (1 + reps / 30))), but takes each user's single
  // best-ever set for this exercise rather than a best-per-day series.
  const rows = await prisma.$queryRaw<LeaderboardRow[]>`
    SELECT u.id,
           u.username,
           u."profileImageMimeType" IS NOT NULL AS "hasImage",
           MAX(ROUND((es.weight * (1 + es.reps / 30.0))::numeric))::int AS "estimated1RM"
    FROM exercise_sets es
    JOIN exercise_logs el ON es."exerciseLogId" = el.id
    JOIN workout_logs wl ON el."workoutLogId" = wl.id
    JOIN users u ON wl."userId" = u.id
    WHERE el."exerciseName" = ${exerciseName}
      AND es.weight IS NOT NULL
      AND es.reps IS NOT NULL
      AND u."isLeaderboardVisible" = true
      AND u.username IS NOT NULL
      ${cityFilter}
      ${genderFilter}
    GROUP BY u.id, u.username, u."profileImageMimeType"
    ORDER BY "estimated1RM" DESC
    LIMIT 200
  `;

  return {
    scope,
    city,
    gender,
    exerciseName,
    entries: rows.map((row, index) => ({
      rank: index + 1,
      username: row.username,
      estimated1RM: row.estimated1RM,
      isCurrentUser: row.id === userId,
      profileImageUrl: row.hasImage ? `/api/users/${row.id}/profile-image` : null,
    })),
  };
};
