import { ProgramDurationDays } from "@/types/programs.types";

export interface DurationProps {
  durationDays: ProgramDurationDays;
  setDurationDays: (durations: ProgramDurationDays) => void;
}
