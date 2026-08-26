import apiClient from "./client";
import { FeedPage, Post, PostComment, PostCounts } from "@/types/posts.types";

export const getFeed = async (cursor?: string): Promise<FeedPage> => {
  const { data } = await apiClient.get("/api/posts", {
    params: cursor ? { cursor } : undefined,
  });
  return data.result;
};

// Lightweight refresh for posts already sitting in the feed cache — just
// the fields that actually go stale (likes/comments), not the full post
// payload.
export const getPostCounts = async (ids: string[]): Promise<PostCounts[]> => {
  const { data } = await apiClient.get("/api/posts/counts", {
    params: { ids: ids.join(",") },
  });
  return data.result.counts;
};

export const getNewPostsCount = async (): Promise<number> => {
  const { data } = await apiClient.get("/api/posts/new-count");
  return data.result.count;
};

export const markFeedViewed = async (): Promise<void> => {
  await apiClient.post("/api/posts/mark-feed-viewed");
};

export const getPost = async (postId: string): Promise<Post> => {
  const { data } = await apiClient.get(`/api/posts/${postId}`);
  return data.result.post;
};

export const createPost = async (input: {
  caption?: string;
  mediaUri?: string;
  mediaType?: "image" | "video";
}): Promise<Post> => {
  const formData = new FormData();
  if (input.caption) {
    formData.append("caption", input.caption);
  }
  if (input.mediaUri) {
    const isVideo = input.mediaType === "video";
    formData.append("media", {
      uri: input.mediaUri,
      name: isVideo ? "post.mp4" : "post.jpg",
      type: isVideo ? "video/mp4" : "image/jpeg",
    } as unknown as Blob);
  }

  const { data } = await apiClient.post("/api/posts", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    // Media uploads (especially unresized video, or photos straight off a
    // phone camera on a slow connection) can easily take longer than the
    // client's default 10s timeout — that default is fine for ordinary
    // JSON requests but was cutting off real uploads before they finished.
    timeout: 60000,
  });
  return data.result.post;
};

export const deletePost = async (postId: string): Promise<void> => {
  await apiClient.delete(`/api/posts/${postId}`);
};

export const likePost = async (postId: string): Promise<void> => {
  await apiClient.post(`/api/posts/${postId}/like`);
};

export const unlikePost = async (postId: string): Promise<void> => {
  await apiClient.delete(`/api/posts/${postId}/like`);
};

export const getComments = async (postId: string): Promise<PostComment[]> => {
  const { data } = await apiClient.get(`/api/posts/${postId}/comments`);
  return data.result.comments;
};

export const addComment = async (
  postId: string,
  content: string,
  parentId?: string,
): Promise<PostComment> => {
  const { data } = await apiClient.post(`/api/posts/${postId}/comments`, {
    content,
    parentId,
  });
  return data.result.comment;
};

export const deleteComment = async (commentId: string): Promise<void> => {
  await apiClient.delete(`/api/posts/comments/${commentId}`);
};

export const likeComment = async (commentId: string): Promise<void> => {
  await apiClient.post(`/api/posts/comments/${commentId}/like`);
};

export const unlikeComment = async (commentId: string): Promise<void> => {
  await apiClient.delete(`/api/posts/comments/${commentId}/like`);
};
