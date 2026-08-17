import { useCurrentUser } from "@/hooks/useUsers";
import { UnitSystem } from "@/types/user.types";

// Null (never detected, or detection failed/was denied) reads the same as
// "imperial" everywhere — matches what the whole app hardcoded before
// this preference existed, so there's one default to keep in sync, not two.
export const useUnitSystem = (): UnitSystem => {
  const { data: currentUser } = useCurrentUser();
  return currentUser?.unitSystem ?? "imperial";
};
