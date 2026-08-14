import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";
import {
  getFeed,
  createPost,
  deletePost,
  likePost,
  unlikePost,
  getComments,
  addComment,
  deleteComment,
  likeComment,
  unlikeComment,
} from "@/lib/api/posts.api";
import { FeedPage, PostComment } from "@/types/posts.types";

export const useFeed = () => {
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getFeed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
};

// Toggles like/unlike with an optimistic update against the paginated feed
// cache directly — waiting on a round-trip + refetch for something as
// frequent and low-stakes as a like tap would feel laggy.
export const useToggleLike = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, isLiked }: { postId: string; isLiked: boolean }) =>
      isLiked ? unlikePost(postId) : likePost(postId),
    onMutate: async ({ postId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previous = queryClient.getQueryData<InfiniteData<FeedPage>>([
        "feed",
      ]);

      queryClient.setQueryData<InfiniteData<FeedPage>>(
        ["feed"],
        (old: InfiniteData<FeedPage> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: FeedPage) => ({
              ...page,
              posts: page.posts.map((post: FeedPage["posts"][number]) =>
                post.id === postId
                  ? {
                      ...post,
                      isLikedByViewer: !isLiked,
                      likeCount: post.likeCount + (isLiked ? -1 : 1),
                    }
                  : post,
              ),
            })),
          };
        },
      );

      return { previous };
    },
    // No onSettled refetch — the optimistic update above already reflects
    // the correct final state on success, and a forced refetch here was
    // the actual bug: it flips the infinite query's isRefetching flag,
    // which Feed.tsx's FlatList used to drive its pull-to-refresh spinner,
    // so liking a post made that spinner flash for a moment. onError below
    // is the only reconciliation needed — roll back if the request failed.
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["feed"], context.previous);
      }
    },
  });
};

export const useComments = (postId: string | null) => {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: () => getComments(postId!),
    enabled: !!postId,
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      content,
      parentId,
    }: {
      postId: string;
      content: string;
      parentId?: string;
    }) => addComment(postId, content, parentId),
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId }: { commentId: string; postId: string }) =>
      deleteComment(commentId),
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
};

// Recursively rewrites just the matching comment anywhere in the tree
// (a reply of a reply is still findable) without touching sibling nodes'
// identity, so React doesn't re-render the whole thread on every toggle.
const mapCommentTree = (
  comments: PostComment[],
  commentId: string,
  updater: (comment: PostComment) => PostComment,
): PostComment[] =>
  comments.map((comment) => {
    if (comment.id === commentId) return updater(comment);
    if (comment.replies.length === 0) return comment;
    return {
      ...comment,
      replies: mapCommentTree(comment.replies, commentId, updater),
    };
  });

// Same optimistic-update reasoning as useToggleLike — a comment like tap
// should feel instant, and doesn't need a network round-trip before the
// UI reflects it.
export const useToggleCommentLike = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      isLiked,
    }: {
      commentId: string;
      postId: string;
      isLiked: boolean;
    }) => (isLiked ? unlikeComment(commentId) : likeComment(commentId)),
    onMutate: async ({ postId, commentId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      const previous = queryClient.getQueryData<PostComment[]>([
        "comments",
        postId,
      ]);

      queryClient.setQueryData<PostComment[]>(
        ["comments", postId],
        (old: PostComment[] | undefined) => {
          if (!old) return old;
          return mapCommentTree(old, commentId, (comment) => ({
            ...comment,
            isLikedByViewer: !isLiked,
            likeCount: comment.likeCount + (isLiked ? -1 : 1),
          }));
        },
      );

      return { previous };
    },
    onError: (_err, { postId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["comments", postId], context.previous);
      }
    },
  });
};
