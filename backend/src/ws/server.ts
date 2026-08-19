import { IncomingMessage, Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { authenticateConnection } from "./auth";
import { addConnection, removeConnection } from "./registry";
import { registerForHeartbeat, startHeartbeat } from "./heartbeat";
import { handleClientMessage } from "./handlers";

const WS_PATH = "/ws";

// `noServer: true` + a manual `server.on("upgrade", ...)` (rather than
// passing `{ server }` directly) so upgrade requests to any path other
// than WS_PATH can be rejected explicitly instead of ws silently accepting
// every upgrade on the port.
export const attachWebSocketServer = (server: Server): void => {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket, head) => {
    const { pathname } = new URL(request.url ?? "", "http://localhost");

    if (pathname !== WS_PATH) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (socket: WebSocket) => {
    authenticateConnection(socket)
      .then((userId) => {
        addConnection(userId, socket);
        registerForHeartbeat(socket);
        socket.send(JSON.stringify({ type: "auth:ok" }));

        socket.on("message", (raw: Buffer) => {
          handleClientMessage(socket, userId, raw).catch((err) => {
            console.error("Error handling WS message:", err);
          });
        });

        const cleanup = () => removeConnection(userId, socket);
        socket.on("close", cleanup);
        socket.on("error", cleanup);
      })
      .catch(() => {
        // authenticateConnection already closed the socket with a
        // reserved code (see ws/auth.ts) — nothing else to do here.
      });
  });

  startHeartbeat(wss);
};
