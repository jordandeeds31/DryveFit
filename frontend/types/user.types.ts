export type Gender = "male" | "female";

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  city: string | null;
  gender: Gender | null;
  isLeaderboardVisible: boolean;
  profileImageUrl: string | null;
  createdAt: string;
}
