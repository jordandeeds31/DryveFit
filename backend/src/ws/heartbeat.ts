import { WebSocket, WebSocketServer } from "ws";

// Render's proxy and mobile carrier NATs silently drop idle TCP
// connections, and a client that loses network without a clean close
// (phone loses signal, app is force-killed) leaves a socket sitting in the
// registry that never fires "close" on its own. Without this, the
// registry — and every message:new/typing/read broadcast that reads from
// it — slowly accumulates dead sockets on a long-lived single process that
// never restarts on its own.
const HEARTBEAT_INTERVAL_MS = 30000;

interface HeartbeatState {
  isAlive: boolean;
}

const heartbeatState = new WeakMap<WebSocket, HeartbeatState>();

export const registerForHeartbeat = (socket: WebSocket): void => {
  heartbeatState.set(socket, { isAlive: true });
  socket.on("pong", () => {
    const state = heartbeatState.get(socket);
    if (state) state.isAlive = true;
  });
};

// Call once, after the WebSocketServer is created — ties the interval's
// lifetime to the server instead of leaking a global timer.
export const startHeartbeat = (wss: WebSocketServer): void => {
  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      const state = heartbeatState.get(socket);
      // No tracked state means this socket hasn't finished the auth
      // handshake yet (registerForHeartbeat runs after auth succeeds) —
      // leave it alone, its own auth timeout will close it if it stalls.
      if (!state) return;

      if (!state.isAlive) {
        socket.terminate();
        return;
      }

      state.isAlive = false;
      socket.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);

  wss.on("close", () => clearInterval(interval));
};
