import { useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/store";
import {
  getDmConversations,
  createDmConversation,
  getDmMessages,
  sendDmMessage,
  markDmConversationRead,
} from "@/lib/api/directMessages.api";
import {
  connect as connectSocket,
  subscribe,
  subscribeToStatus,
} from "@/lib/messaging/websocketClient";
import {
  setConnectionStatus,
  userStartedTyping,
  userStoppedTyping,
} from "@/store/slices/messagingSlice";
import {
  DmConversationListItem,
  DmMessage,
  DmMessagesPage,
} from "@/types/directMessages.types";
import { useCurrentUser } from "@/hooks/useUsers";

export const useDmConversations = () => {
  return useQuery({
    queryKey: ["dmConversations"],
    queryFn: getDmConversations,
  });
};

export const useCreateDmConversation = () => {
  return useMutation({
    mutationFn: createDmConversation,
  });
};

export const useDmThread = (conversationId: string | null) => {
  return useInfiniteQuery({
    queryKey: ["dmMessages", conversationId],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getDmMessages(conversationId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!conversationId,
  });
};

// Inserts/updates a single message in a ["dmMessages", conversationId]
// infinite-query cache, deduping by id — a message can arrive twice (once
// via this mutation's own optimistic patch + REST response, once more via
// a WS message:new echo if the sender is logged in on a second device).
const upsertMessageInCache = (
  data: InfiniteData<DmMessagesPage> | undefined,
  message: DmMessage,
): InfiniteData<DmMessagesPage> | undefined => {
  if (!data) return data;

  const alreadyPresent = data.pages.some((page) =>
    page.messages.some((m) => m.id === message.id),
  );
  if (alreadyPresent) return data;

  // Newest-first pages (backend orders createdAt desc) — a new message
  // belongs at the front of the first (most recent) page.
  const [firstPage, ...restPages] = data.pages;
  return {
    ...data,
    pages: [
      { ...firstPage, messages: [message, ...firstPage.messages] },
      ...restPages,
    ],
  };
};

interface SendDmMessageInput {
  content: string;
  imageUri?: string;
}

export const useSendDmMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  // Already fetched/cached elsewhere in the app (AppHeader, Profile,
  // etc.) — this just reads that cache, no extra request. Needed so the
  // optimistic message below can carry the sender's REAL id.
  const { data: currentUser } = useCurrentUser();

  return useMutation({
    mutationFn: ({ content, imageUri }: SendDmMessageInput) =>
      sendDmMessage(conversationId, content, imageUri),
    onMutate: async ({ content, imageUri }: SendDmMessageInput) => {
      await queryClient.cancelQueries({
        queryKey: ["dmMessages", conversationId],
      });
      const previous = queryClient.getQueryData<InfiniteData<DmMessagesPage>>(
        ["dmMessages", conversationId],
      );

      // Negative id — can't collide with a real (uuid) message id, and
      // doubles as the "is this still pending" check the UI uses to show
      // a sending/failed state on the bubble. imageUrl is the local
      // (file://) uri while pending — swapped for the real Cloudinary URL
      // once the upload resolves, same bubble in the meantime.
      //
      // senderId is the CALLER's own id, not a placeholder — the thread
      // screen's isOwnMessage check (item.senderId === currentUser?.id)
      // otherwise reads this optimistic row as someone else's message
      // (gray, left-aligned) for the moment before the real response
      // swaps it out, then flips to blue/right once it does.
      const optimisticMessage: DmMessage = {
        id: `pending-${Date.now()}`,
        conversationId,
        senderId: currentUser?.id ?? "__pending__",
        content: content || null,
        imageUrl: imageUri ?? null,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<InfiniteData<DmMessagesPage>>(
        ["dmMessages", conversationId],
        (old: InfiniteData<DmMessagesPage> | undefined) =>
          upsertMessageInCache(old, optimisticMessage),
      );

      return { previous, optimisticId: optimisticMessage.id };
    },
    onSuccess: (message, _input, context) => {
      queryClient.setQueryData<InfiniteData<DmMessagesPage>>(
        ["dmMessages", conversationId],
        (old: InfiniteData<DmMessagesPage> | undefined) => {
          if (!old) return old;
          const withoutOptimistic: InfiniteData<DmMessagesPage> = {
            ...old,
            pages: old.pages.map((page: DmMessagesPage) => ({
              ...page,
              messages: page.messages.filter(
                (m: DmMessage) => m.id !== context?.optimisticId,
              ),
            })),
          };
          return upsertMessageInCache(withoutOptimistic, message);
        },
      );
      queryClient.invalidateQueries({ queryKey: ["dmConversations"] });
    },
    onError: (_err, _content, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["dmMessages", conversationId],
          context.previous,
        );
      }
    },
  });
};

export const useMarkDmConversationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markDmConversationRead,
    onSuccess: (_data, conversationId) => {
      queryClient.setQueryData<DmConversationListItem[]>(
        ["dmConversations"],
        (old: DmConversationListItem[] | undefined) =>
          old?.map((c: DmConversationListItem) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c,
          ),
      );
    },
  });
};

// Wires the WS client into React Query's cache + the messagingSlice.
// Mount once, near the top of the tree (RootNavigator), for as long as the
// socket connection itself is meant to live — not per-screen, since
// messages for a conversation the user isn't currently viewing still need
// to update its unread count/last-message preview in the conversation
// list.
export const useDmWebSocketBridge = (): void => {
  const dispatch = useDispatch<AppDispatch>();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribeStatus = subscribeToStatus((status) => {
      dispatch(setConnectionStatus(status));
    });

    const unsubscribeMessages = subscribe((message) => {
      switch (message.type) {
        case "message:new": {
          queryClient.setQueryData<InfiniteData<DmMessagesPage>>(
            ["dmMessages", message.message.conversationId],
            (old: InfiniteData<DmMessagesPage> | undefined) =>
              upsertMessageInCache(old, message.message),
          );
          queryClient.invalidateQueries({ queryKey: ["dmConversations"] });
          return;
        }
        case "sync:missed": {
          if (message.messages.length === 0) return;
          // A batch spanning potentially many conversations — simplest
          // correct handling is invalidating both list-level caches and
          // letting each open thread's own query refetch, rather than
          // trying to reconstruct per-conversation infinite-query pages
          // from an unordered-by-conversation batch.
          queryClient.invalidateQueries({ queryKey: ["dmConversations"] });
          queryClient.invalidateQueries({ queryKey: ["dmMessages"] });
          return;
        }
        case "typing:start":
          dispatch(
            userStartedTyping({
              conversationId: message.conversationId,
              userId: message.userId,
            }),
          );
          return;
        case "typing:stop":
          dispatch(
            userStoppedTyping({
              conversationId: message.conversationId,
              userId: message.userId,
            }),
          );
          return;
        case "read:receipt":
          // No dedicated read-state cache slot for the other participant's
          // cursor yet — conversation list re-fetching on message:new
          // already keeps unread counts (this user's own) current; a
          // "Seen" indicator on individual bubbles is a UI-only concern
          // deferred to the thread screen itself.
          return;
        default:
          return;
      }
    });

    connectSocket();

    return () => {
      unsubscribeStatus();
      unsubscribeMessages();
    };
  }, [dispatch, queryClient]);
};
