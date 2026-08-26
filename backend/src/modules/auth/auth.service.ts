import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import prisma from "../../lib/prisma";
import resend from "../../lib/resend";
import AppError from "../../utils/AppError";
import { env } from "../../config/env";

// Every client ID this app has registered with Google — an ID token's
// `aud` claim is stamped with whichever one issued it, so verifyIdToken
// needs the whole set to accept a sign-in from any platform.
const GOOGLE_CLIENT_IDS = [
  env.GOOGLE_IOS_CLIENT_ID,
  env.GOOGLE_ANDROID_CLIENT_ID,
  env.GOOGLE_WEB_CLIENT_ID,
].filter((id): id is string => !!id);

const googleClient = new OAuth2Client();

const SALT_ROUNDS = 10;
const RESET_CODE_EXPIRY_MS = 15 * 60 * 1000;

type SignupInput = {
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

export const createUser = async ({ email, password }: SignupInput) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new AppError(409, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword },
  });

  const { password: _, passwordResetCodeHash: __, passwordResetExpiresAt: ___, ...safeUser } = user;
  return safeUser;
};

export const validateUser = async ({ email, password }: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // A Google-only account (no password ever set) has user.password ===
  // null — checked explicitly rather than letting it reach bcrypt.compare,
  // which requires a string and throws on null instead of just failing
  // the comparison.
  if (!user || !user.password) {
    throw new AppError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(401, "Invalid email or password");
  }

  const { password: _, passwordResetCodeHash: __, passwordResetExpiresAt: ___, ...safeUser } = user;
  return safeUser;
};

// Verifies a Google ID token (from the client's expo-auth-session flow)
// and finds-or-creates the corresponding user. Three cases:
//   1. googleId already on file — this is a returning Google sign-in.
//   2. No googleId, but the email matches an existing (password) account —
//      link this Google identity onto it, same email now has two ways in.
//      Google verifies the email itself (email_verified), so this linking
//      is safe from account-takeover-by-email the way an unverified
//      self-reported email wouldn't be.
//   3. Neither — brand new account, no password.
export const authenticateWithGoogle = async (idToken: string) => {
  if (GOOGLE_CLIENT_IDS.length === 0) {
    throw new AppError(501, "Google sign-in is not configured");
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_IDS,
    });
    payload = ticket.getPayload();
  } catch {
    throw new AppError(401, "Invalid Google sign-in");
  }

  if (!payload?.sub || !payload.email) {
    throw new AppError(401, "Invalid Google sign-in");
  }
  if (!payload.email_verified) {
    throw new AppError(401, "Google account email isn't verified");
  }

  const existingByGoogleId = await prisma.user.findUnique({
    where: { googleId: payload.sub },
  });
  if (existingByGoogleId) {
    const { password: _, passwordResetCodeHash: __, passwordResetExpiresAt: ___, ...safeUser } = existingByGoogleId;
    return { user: safeUser, isNewUser: false };
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (existingByEmail) {
    const linked = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: { googleId: payload.sub },
    });
    const { password: _, passwordResetCodeHash: __, passwordResetExpiresAt: ___, ...safeUser } = linked;
    return { user: safeUser, isNewUser: false };
  }

  const created = await prisma.user.create({
    data: { email: payload.email, googleId: payload.sub },
  });
  const { password: _, passwordResetCodeHash: __, passwordResetExpiresAt: ___, ...safeUser } = created;
  // isNewUser drives the client's post-signup side effects (e.g.
  // detectAndSaveCity), which should only run for a genuinely brand-new
  // account, not a returning or newly-linked one.
  return { user: safeUser, isNewUser: true };
};

export const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  });
};

const sendPasswordResetEmail = async (email: string, code: string) => {
  if (!resend) {
    throw new AppError(
      500,
      "Email service is not configured (RESEND_API_KEY missing)",
    );
  }

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: email,
    subject: "Reset your DryveFit password",
    html: `<p>Your password reset code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>`,
  });
};

export const requestPasswordReset = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Deliberately reveals whether the email has an account (product
  // decision — trades off the usual enumeration-hardening for a clearer
  // "that email doesn't exist" error on the forgot-password screen).
  if (!user) {
    throw new AppError(404, "No account found with that email");
  }

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetCodeHash: codeHash,
      passwordResetExpiresAt: new Date(Date.now() + RESET_CODE_EXPIRY_MS),
    },
  });

  await sendPasswordResetEmail(email, code);

  return { message: "Reset code sent" };
};

export const resetPasswordWithCode = async ({
  email,
  code,
  newPassword,
}: {
  email: string;
  code: string;
  newPassword: string;
}) => {
  const user = await prisma.user.findUnique({ where: { email } });

  const invalidOrExpired = () =>
    new AppError(400, "That code is invalid or has expired");

  if (
    !user ||
    !user.passwordResetCodeHash ||
    !user.passwordResetExpiresAt ||
    user.passwordResetExpiresAt < new Date()
  ) {
    throw invalidOrExpired();
  }

  const isCodeValid = await bcrypt.compare(code, user.passwordResetCodeHash);
  if (!isCodeValid) {
    throw invalidOrExpired();
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetCodeHash: null,
      passwordResetExpiresAt: null,
    },
  });
};
