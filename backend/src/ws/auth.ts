import { WebSocket } from "ws";
import { verifyAccessToken } from "../lib/jwt";
import {
  ClientMessage,
  WS_CLOSE_AUTH_INVALID,
  WS_CLOSE_AUTH_TIMEOUT,
} from "./types";

// A raw ?token= query param would work too, but ends up in Render's HTTP
// access logs (and any intermediate proxy's) since the upgrade request is
// still a normal HTTP request line — sending the token as the connection's
// first frame instead keeps it out of any log line.
const AUTH_GRACE_PERIOD_MS = 5000;

// Resolves with the authenticated userId once a valid `{type:"auth"}`
// frame arrives, or rejects (after closing the socket with a reserved
// code) if that doesn't happen in time or the token is bad. Consumes
// exactly one "message" event — the caller should only start listening
// for the connection's real traffic after this resolves.
export const authenticateConnection = (socket: WebSocket): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.close(WS_CLOSE_AUTH_TIMEOUT, "Authentication timed out");
      reject(new Error("Authentication timed out"));
    }, AUTH_GRACE_PERIOD_MS);

    const onMessage = (raw: Buffer) => {
      clearTimeout(timeout);
      socket.off("message", onMessage);

      let parsed: ClientMessage;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        socket.close(WS_CLOSE_AUTH_INVALID, "Malformed auth frame");
        reject(new Error("Malformed auth frame"));
        return;
      }

      if (parsed.type !== "auth" || typeof parsed.token !== "string") {
        socket.close(WS_CLOSE_AUTH_INVALID, "First frame must be auth");
        reject(new Error("First frame must be auth"));
        return;
      }

      try {
        const { userId } = verifyAccessToken(parsed.token);
        resolve(userId);
      } catch {
        socket.close(WS_CLOSE_AUTH_INVALID, "Invalid token");
        reject(new Error("Invalid token"));
      }
    };

    socket.on("message", onMessage);
  });
};
