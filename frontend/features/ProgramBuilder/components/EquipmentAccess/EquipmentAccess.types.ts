import { EquipmentAccess as EquipmentAccessType } from "@/types/programs.types";

export interface EquipmentAccessProps {
  equipmentAccess: EquipmentAccessType;
  setEquipmentAccess: (equipmentAccess: EquipmentAccessType) => void;
}
