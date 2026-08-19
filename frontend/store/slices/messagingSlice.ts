import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WsConnectionStatus } from "@/types/directMessages.types";

// Only connection-level, ephemeral UI state lives here — actual
// conversation/message data is React Query's job (see
// hooks/useDirectMessages.ts), kept in its cache and patched in real time
// by a bridge that subscribes to lib/messaging/websocketClient.ts's
// events. Duplicating server data into Redux too would just be two
// out-of-sync copies of the same thing.
interface MessagingState {
  status: WsConnectionStatus;
  // conversationId -> userIds currently typing in it. An object (not a
  // Map) since this is serialized Redux state.
  typingByConversation: Record<string, string[]>;
  activeConversationId: string | null;
}

const initialState: MessagingState = {
  status: "closed",
  typingByConversation: {},
  activeConversationId: null,
};

const messagingSlice = createSlice({
  name: "messaging",
  initialState,
  reducers: {
    setConnectionStatus: (
      state,
      action: PayloadAction<WsConnectionStatus>,
    ) => {
      state.status = action.payload;
    },
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    userStartedTyping: (
      state,
      action: PayloadAction<{ conversationId: string; userId: string }>,
    ) => {
      const { conversationId, userId } = action.payload;
      const typing = state.typingByConversation[conversationId] ?? [];
      if (!typing.includes(userId)) {
        state.typingByConversation[conversationId] = [...typing, userId];
      }
    },
    userStoppedTyping: (
      state,
      action: PayloadAction<{ conversationId: string; userId: string }>,
    ) => {
      const { conversationId, userId } = action.payload;
      const typing = state.typingByConversation[conversationId];
      if (!typing) return;
      state.typingByConversation[conversationId] = typing.filter(
        (id) => id !== userId,
      );
    },
    // Called when leaving a thread screen — stale typing state from a
    // conversation the viewer isn't looking at anymore shouldn't linger
    // and reappear next time they open it.
    clearTypingForConversation: (state, action: PayloadAction<string>) => {
      delete state.typingByConversation[action.payload];
    },
  },
});

export const {
  setConnectionStatus,
  setActiveConversation,
  userStartedTyping,
  userStoppedTyping,
  clearTypingForConversation,
} = messagingSlice.actions;
export default messagingSlice.reducer;
