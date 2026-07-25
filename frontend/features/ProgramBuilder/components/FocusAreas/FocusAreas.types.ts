import { BodyPart } from "@/types/programs.types";

export interface FocusAreasProps {
  selectedFocusAreas: BodyPart[];
  setSelectedFocusAreas: (focusArea: BodyPart[]) => void;
}
