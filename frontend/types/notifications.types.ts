export type NotificationType = "post_like" | "post_comment" | "follow";

export interface NotificationActor {
  id: string;
  // Already resolved server-side to username, falling back to email when
  // the actor hasn't set one — nothing to fall back to on the client.
  displayName: string;
  profileImageUrl: string | null;
}

export interface NotificationPostPreview {
  id: string;
  caption: string | null;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  // Set for "post_comment" only — which comment (or reply) to jump
  // straight into replying to.
  commentId: string | null;
  isRead: boolean;
  createdAt: string;
  actor: NotificationActor;
  post: NotificationPostPreview | null;
}

export interface NotificationsPage {
  notifications: AppNotification[];
  nextCursor: string | null;
}
