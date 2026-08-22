import apiClient from "./client";
import { BlogPost } from "@/types/news.types";

export const createBlogPost = async (input: {
  title: string;
  body: string;
  coverImageUri?: string;
}): Promise<BlogPost> => {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("body", input.body);
  if (input.coverImageUri) {
    formData.append("coverImage", {
      uri: input.coverImageUri,
      name: "cover.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
  }

  const { data } = await apiClient.post("/api/blog", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    // Same reasoning as posts.api.ts's createPost — an image upload can
    // easily take longer than the client's default 10s timeout.
    timeout: 60000,
  });
  return data.result.post;
};

export const getBlogPost = async (blogPostId: string): Promise<BlogPost> => {
  const { data } = await apiClient.get(`/api/blog/${blogPostId}`);
  return data.result.post;
};

export const deleteBlogPost = async (blogPostId: string): Promise<void> => {
  await apiClient.delete(`/api/blog/${blogPostId}`);
};
