import { View, Text, TouchableOpacity, Alert } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import Modal from "@/components/shared/Modal/Modal";
import Switch from "@/components/shared/Switch/Switch";
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
  onDisconnectHealthKit,
}: DevicesModalProps) => {
  const handleComingSoon = (device: string) => {
    Alert.alert("Coming soon", `${device} support isn't available yet.`);
  };

  const handleToggleHealthKit = (value: boolean) => {
    if (value) {
      onConnectHealthKit();
      return;
    }
    Alert.alert(
      "Turn off Apple Health?",
      "DryveFit will stop reading your heart rate, calories, and activity from Apple Health. You can turn it back on anytime.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Turn Off",
          style: "destructive",
          onPress: onDisconnectHealthKit,
        },
      ],
    );
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <Text style={styles.title}>Devices</Text>
      <Text style={styles.subtitle}>
        Connect a health device to sync heart rate, calories, and activity into
        DryveFit.
      </Text>

      {healthKitStatus !== "unavailable" && (
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Feather name="heart" size={18} color={colors.primaryBlue} />
          </View>
          <View style={styles.rowTextGroup}>
            <Text style={styles.rowLabel}>Apple Health</Text>
            <Text style={styles.rowSubtext}>
              {isConnectingHealthKit
                ? "Connecting..."
                : healthKitStatus === "connected"
                  ? "Reading heart rate, calories, and activity"
                  : "Heart rate and calories during Cinematic Mode"}
            </Text>
          </View>
          <Switch
            value={healthKitStatus === "connected"}
            onValueChange={handleToggleHealthKit}
            disabled={isConnectingHealthKit}
          />
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
