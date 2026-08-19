import { Platform } from "react-native";
import { getToken } from "@/lib/storage/secureStore";
import { WsConnectionStatus, WsServerMessage } from "@/types/directMessages.types";
import { computeBackoffDelay } from "./backoff";

type MessageListener = (message: WsServerMessage) => void;
type StatusListener = (status: WsConnectionStatus) => void;

let socket: WebSocket | null = null;
let status: WsConnectionStatus = "closed";
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
// Set by disconnect() — distinguishes "we closed this on purpose" (logout,
// app backgrounded) from "the connection dropped," so onclose only
// schedules a reconnect for the latter.
let manuallyDisconnected = false;
// In-memory only, not persisted — resets on app restart, which is fine
// since a fresh app launch already gets a full history via the normal
// REST-backed React Query fetches. This is only for bridging brief
// in-session drops (a network blip, backgrounding for a minute), where
// replaying just the gap over WS is cheaper than a full refetch.
let lastSeenMessageAt: string | null = null;

const messageListeners = new Set<MessageListener>();
const statusListeners = new Set<StatusListener>();

const setStatus = (next: WsConnectionStatus): void => {
  status = next;
  statusListeners.forEach((listener) => listener(next));
};

// Same localhost->10.0.2.2 substitution as lib/api/client.ts's
// resolveBaseURL, since the Android emulator can't reach the host
// machine's "localhost" directly — just for ws(s):// instead of http(s)://.
const resolveWsUrl = (): string => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
  const httpUrl =
    Platform.OS === "android" && apiUrl.includes("localhost")
      ? apiUrl.replace("localhost", "10.0.2.2")
      : apiUrl;
  return httpUrl.replace(/^http/, "ws") + "/ws";
};

const handleServerMessage = (message: WsServerMessage): void => {
  if (message.type === "auth:ok") {
    reconnectAttempt = 0;
    setStatus("open");
    socket?.send(
      JSON.stringify({
        type: "sync",
        since: lastSeenMessageAt ?? undefined,
      }),
    );
    return;
  }

  if (message.type === "message:new") {
    lastSeenMessageAt = message.message.createdAt;
  } else if (message.type === "sync:missed" && message.messages.length > 0) {
    lastSeenMessageAt = message.messages[message.messages.length - 1].createdAt;
  }

  messageListeners.forEach((listener) => listener(message));
};

const scheduleReconnect = (): void => {
  const delay = computeBackoffDelay(reconnectAttempt);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    connect();
  }, delay);
};

// Safe to call repeatedly (e.g. on every AppState "active" transition) —
// no-ops if a socket already exists rather than opening a second one.
export const connect = async (): Promise<void> => {
  if (socket) return;

  const token = await getToken();
  if (!token) return;

  manuallyDisconnected = false;
  setStatus(reconnectAttempt > 0 ? "reconnecting" : "connecting");

  const ws = new WebSocket(resolveWsUrl());
  socket = ws;

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "auth", token }));
  };

  ws.onmessage = (event) => {
    let parsed: WsServerMessage;
    try {
      parsed = JSON.parse(event.data as string);
    } catch {
      return;
    }
    handleServerMessage(parsed);
  };

  // onclose fires after onerror too (a WS error always ends in a close),
  // so reconnect scheduling lives only in one place, not duplicated here.
  ws.onerror = () => {};

  ws.onclose = () => {
    socket = null;
    if (manuallyDisconnected) {
      setStatus("closed");
      return;
    }
    setStatus("reconnecting");
    scheduleReconnect();
  };
};

export const disconnect = (): void => {
  manuallyDisconnected = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempt = 0;
  socket?.close();
  socket = null;
  setStatus("closed");
};

export const sendTyping = (
  conversationId: string,
  isTyping: boolean,
): void => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(
    JSON.stringify({
      type: isTyping ? "typing:start" : "typing:stop",
      conversationId,
    }),
  );
};

// Returns an unsubscribe function, matching the pattern already used for
// cleanup-returning effects elsewhere (e.g. setupNotificationTapHandling).
export const subscribe = (listener: MessageListener): (() => void) => {
  messageListeners.add(listener);
  return () => messageListeners.delete(listener);
};

export const subscribeToStatus = (listener: StatusListener): (() => void) => {
  statusListeners.add(listener);
  listener(status);
  return () => statusListeners.delete(listener);
};
