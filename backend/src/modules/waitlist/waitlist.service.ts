import prisma from "../../lib/prisma";

export const addWaitlistSignup = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  await prisma.waitlistSignup.upsert({
    where: { email: normalizedEmail },
    create: { email: normalizedEmail },
    update: {},
  });
};
