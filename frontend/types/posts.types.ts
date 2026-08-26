export interface PostAuthor {
  id: string;
  username: string | null;
  profileImageUrl: string | null;
}

export interface Post {
  id: string;
  caption: string | null;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  createdAt: string;
  isOwnPost: boolean;
  likeCount: number;
  commentCount: number;
  isLikedByViewer: boolean;
  author: PostAuthor;
}

export interface FeedPage {
  posts: Post[];
  nextCursor: string | null;
}

export interface PostCounts {
  id: string;
  likeCount: number;
  commentCount: number;
  isLikedByViewer: boolean;
}

export interface PostComment {
  id: string;
  content: string;
  createdAt: string;
  isOwnComment: boolean;
  likeCount: number;
  isLikedByViewer: boolean;
  author: PostAuthor;
  replies: PostComment[];
}
