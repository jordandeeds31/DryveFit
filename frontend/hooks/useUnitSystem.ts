import { useCurrentUser } from "@/hooks/useUsers";
import { UnitSystem } from "@/types/user.types";

// Null (never explicitly set in Profile settings) reads the same as
// "imperial" everywhere — pounds is the guaranteed default for every new
// signup regardless of location; a user only ever gets metric by
// switching to it themselves.
export const useUnitSystem = (): UnitSystem => {
  const { data: currentUser } = useCurrentUser();
  return currentUser?.unitSystem ?? "imperial";
};
