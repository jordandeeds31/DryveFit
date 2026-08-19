import jwt from "jsonwebtoken";
import { env } from "../config/env";

// Shared by authMiddleware (REST, reads the token from an Authorization
// header) and ws/auth.ts (WebSocket, reads it from the first frame) so the
// actual verify call only lives in one place.
export const verifyAccessToken = (token: string): { userId: string } => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string };
};
