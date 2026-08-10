import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import prisma from "../../lib/prisma";
import resend from "../../lib/resend";
import AppError from "../../utils/AppError";
import { env } from "../../config/env";

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

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(401, "Invalid email or password");
  }

  const { password: _, passwordResetCodeHash: __, passwordResetExpiresAt: ___, ...safeUser } = user;
  return safeUser;
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
    subject: "Reset your Dryve password",
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
