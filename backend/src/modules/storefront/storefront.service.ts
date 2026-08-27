import prisma from "../../lib/prisma";
import AppError from "../../utils/AppError";

// Loose on purpose — this only ever needs to be a stable, url-safe key
// naming a not-yet-real product ("dryve-tee"), not a real catalog id.
const isValidProductKey = (value: unknown): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= 100;

export const getInterestSummary = async (
  userId: string,
  productKey: string,
) => {
  if (!isValidProductKey(productKey)) {
    throw new AppError(400, "productKey is required");
  }

  const [count, mine] = await Promise.all([
    prisma.merchInterest.count({ where: { productKey } }),
    prisma.merchInterest.findUnique({
      where: { userId_productKey: { userId, productKey } },
      select: { id: true },
    }),
  ]);

  return { count, hasInterest: !!mine };
};

// Idempotent — tapping "I'd Like One" twice (e.g. a retried request) never
// double-counts, since the unique (userId, productKey) constraint is what
// actually enforces one vote per user, not just the disabled button state
// on the client.
export const registerInterest = async (
  userId: string,
  productKey: string,
) => {
  if (!isValidProductKey(productKey)) {
    throw new AppError(400, "productKey is required");
  }

  await prisma.merchInterest.upsert({
    where: { userId_productKey: { userId, productKey } },
    update: {},
    create: { userId, productKey },
  });

  return getInterestSummary(userId, productKey);
};
