import { ReactNode } from "react";

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  closable?: boolean;
}
