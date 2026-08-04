export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  city: string | null;
  isLeaderboardVisible: boolean;
  profileImageUrl: string | null;
  createdAt: string;
}
