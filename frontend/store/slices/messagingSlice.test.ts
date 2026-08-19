import messagingReducer, {
  setConnectionStatus,
  setActiveConversation,
  userStartedTyping,
  userStoppedTyping,
  clearTypingForConversation,
} from "./messagingSlice";

const initialState = messagingReducer(undefined, { type: "@@INIT" });

describe("messagingSlice", () => {
  it("starts closed with no typing and no active conversation", () => {
    expect(initialState).toEqual({
      status: "closed",
      typingByConversation: {},
      activeConversationId: null,
    });
  });

  it("updates connection status", () => {
    const state = messagingReducer(initialState, setConnectionStatus("open"));
    expect(state.status).toBe("open");

    const reconnecting = messagingReducer(
      state,
      setConnectionStatus("reconnecting"),
    );
    expect(reconnecting.status).toBe("reconnecting");
  });

  it("sets and clears the active conversation", () => {
    const state = messagingReducer(
      initialState,
      setActiveConversation("convo-1"),
    );
    expect(state.activeConversationId).toBe("convo-1");

    const cleared = messagingReducer(state, setActiveConversation(null));
    expect(cleared.activeConversationId).toBeNull();
  });

  it("adds a user to a conversation's typing list", () => {
    const state = messagingReducer(
      initialState,
      userStartedTyping({ conversationId: "convo-1", userId: "user-a" }),
    );
    expect(state.typingByConversation["convo-1"]).toEqual(["user-a"]);
  });

  it("does not add the same user twice", () => {
    let state = messagingReducer(
      initialState,
      userStartedTyping({ conversationId: "convo-1", userId: "user-a" }),
    );
    state = messagingReducer(
      state,
      userStartedTyping({ conversationId: "convo-1", userId: "user-a" }),
    );
    expect(state.typingByConversation["convo-1"]).toEqual(["user-a"]);
  });

  it("tracks multiple users typing in the same conversation independently", () => {
    let state = messagingReducer(
      initialState,
      userStartedTyping({ conversationId: "convo-1", userId: "user-a" }),
    );
    state = messagingReducer(
      state,
      userStartedTyping({ conversationId: "convo-1", userId: "user-b" }),
    );
    expect(state.typingByConversation["convo-1"]).toEqual([
      "user-a",
      "user-b",
    ]);
  });

  it("removes a user when they stop typing", () => {
    let state = messagingReducer(
      initialState,
      userStartedTyping({ conversationId: "convo-1", userId: "user-a" }),
    );
    state = messagingReducer(
      state,
      userStoppedTyping({ conversationId: "convo-1", userId: "user-a" }),
    );
    expect(state.typingByConversation["convo-1"]).toEqual([]);
  });

  it("stopping typing for a conversation with no typing state is a no-op", () => {
    const state = messagingReducer(
      initialState,
      userStoppedTyping({ conversationId: "convo-1", userId: "user-a" }),
    );
    expect(state.typingByConversation["convo-1"]).toBeUndefined();
  });

  it("keeps other conversations' typing state untouched", () => {
    let state = messagingReducer(
      initialState,
      userStartedTyping({ conversationId: "convo-1", userId: "user-a" }),
    );
    state = messagingReducer(
      state,
      userStartedTyping({ conversationId: "convo-2", userId: "user-b" }),
    );
    state = messagingReducer(
      state,
      userStoppedTyping({ conversationId: "convo-1", userId: "user-a" }),
    );
    expect(state.typingByConversation["convo-1"]).toEqual([]);
    expect(state.typingByConversation["convo-2"]).toEqual(["user-b"]);
  });

  it("clears all typing state for a conversation", () => {
    let state = messagingReducer(
      initialState,
      userStartedTyping({ conversationId: "convo-1", userId: "user-a" }),
    );
    state = messagingReducer(
      state,
      clearTypingForConversation("convo-1"),
    );
    expect(state.typingByConversation["convo-1"]).toBeUndefined();
  });
});
