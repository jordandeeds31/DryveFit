import { TrainingSplit as TrainingSplitType } from "@/types/programs.types";

export interface TrainingSplitProps {
  trainingSplit: TrainingSplitType;
  setTrainingSplit: (trainingSplit: TrainingSplitType) => void;
}
