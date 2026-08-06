export interface LeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  estimated1RM: number;
  isCurrentUser: boolean;
  profileImageUrl: string | null;
}

export interface Leaderboard {
  scope: "city" | "global";
  city: string | null;
  gender: "male" | "female";
  exerciseName: string;
  entries: LeaderboardEntry[];
}
