import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBlogPost,
  getBlogPost,
  deleteBlogPost,
} from "@/lib/api/blog.api";

export const useCreateBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBlogPost,
    onSuccess: () => {
      // Blog posts are merged into the News feed itself (see
      // backend/src/modules/news/news.service.ts) rather than having their
      // own list, so a new post needs every cached "news" query invalidated
      // — refetchType: "all" so it shows up immediately, not just the next
      // time the currently-active search query happens to refetch.
      queryClient.invalidateQueries({ queryKey: ["news"], refetchType: "all" });
    },
  });
};

export const useBlogPost = (blogPostId: string | null) => {
  return useQuery({
    queryKey: ["blogPost", blogPostId],
    queryFn: () => getBlogPost(blogPostId!),
    enabled: !!blogPostId,
  });
};

export const useDeleteBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBlogPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"], refetchType: "all" });
    },
  });
};
