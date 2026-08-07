import { CardioActivityType } from "./cardio.types";

export type CardioLeaderboardCategory =
  | "steps-best-day"
  | "steps-all-time"
  | "calories-best-day"
  | "calories-all-time"
  | "best-pace";

export interface CardioLeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  value: number;
  isCurrentUser: boolean;
  profileImageUrl: string | null;
}

export interface CardioLeaderboard {
  activityType: CardioActivityType;
  category: CardioLeaderboardCategory;
  gender: "male" | "female";
  entries: CardioLeaderboardEntry[];
}
