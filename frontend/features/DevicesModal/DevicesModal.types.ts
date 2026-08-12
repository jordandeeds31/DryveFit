export type HealthKitStatus = "unavailable" | "not_connected" | "connected";

export interface DevicesModalProps {
  visible: boolean;
  onClose: () => void;
  healthKitStatus: HealthKitStatus;
  isConnectingHealthKit: boolean;
  onConnectHealthKit: () => void;
}
