import { View, Text, TouchableOpacity, Alert } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import Modal from "@/components/shared/Modal/Modal";
import { colors } from "@/constants/colors";
import styles from "./DevicesModal.styles";
import { DevicesModalProps } from "./DevicesModal.types";

// Not yet integrated — tapping just lets a user register interest via an
// alert rather than implying a working connection.
const COMING_SOON_DEVICES = ["Whoop", "Garmin", "Oura", "Fitbit"];

const DevicesModal = ({
  visible,
  onClose,
  healthKitStatus,
  isConnectingHealthKit,
  onConnectHealthKit,
}: DevicesModalProps) => {
  const handleComingSoon = (device: string) => {
    Alert.alert("Coming soon", `${device} support isn't available yet.`);
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <Text style={styles.title}>Devices</Text>
      <Text style={styles.subtitle}>
        Connect a health device to sync heart rate, calories, and activity
        into Dryve.
      </Text>

      {healthKitStatus !== "unavailable" && (
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Feather name="heart" size={18} color={colors.primaryBlue} />
          </View>
          <View style={styles.rowTextGroup}>
            <Text style={styles.rowLabel}>Apple Health</Text>
            <Text style={styles.rowSubtext}>
              {healthKitStatus === "connected"
                ? "Connected — manage access in the Health app"
                : "Heart rate and calories during Cinematic Mode"}
            </Text>
          </View>
          {healthKitStatus === "connected" ? (
            <Feather
              name="check-circle"
              size={22}
              color={colors.primaryBlue}
            />
          ) : (
            <TouchableOpacity
              onPress={onConnectHealthKit}
              disabled={isConnectingHealthKit}
            >
              <Text style={styles.connectText}>
                {isConnectingHealthKit ? "Connecting..." : "Connect"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {COMING_SOON_DEVICES.map((device) => (
        <TouchableOpacity
          key={device}
          style={styles.row}
          onPress={() => handleComingSoon(device)}
        >
          <View style={styles.rowIcon}>
            <Feather name="watch" size={18} color={colors.textMuted} />
          </View>
          <View style={styles.rowTextGroup}>
            <Text style={styles.rowLabel}>{device}</Text>
          </View>
          <Text style={styles.comingSoonText}>Coming soon</Text>
        </TouchableOpacity>
      ))}
    </Modal>
  );
};

export default DevicesModal;
