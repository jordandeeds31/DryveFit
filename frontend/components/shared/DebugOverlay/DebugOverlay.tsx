import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import Modal from "@/components/shared/Modal/Modal";
import {
  DebugLogEntry,
  clearDebugLog,
  getDebugLogEntries,
  subscribeDebugLog,
} from "@/lib/debug/debugLog";
import styles from "./DebugOverlay.styles";

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

// A tiny always-on-screen hook into lib/debug/debugLog's pub-sub log, so
// HealthKit errors (which TestFlight builds give no other way to see —
// no cable, no Xcode, no Console.app) can be read directly off the device.
const DebugOverlay = () => {
  const [visible, setVisible] = useState(false);
  const [entries, setEntries] = useState<DebugLogEntry[]>(getDebugLogEntries());

  useEffect(() => subscribeDebugLog(setEntries), []);

  const handleShare = () => {
    const text = entries
      .map((entry) => `[${formatTime(entry.timestamp)}] ${entry.message}`)
      .join("\n");
    Share.share({ message: text || "No debug log entries yet." });
  };

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setVisible(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="terminal" size={16} color="white" />
        {entries.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {entries.length > 99 ? "99+" : entries.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} onClose={() => setVisible(false)}>
        <SafeAreaView edges={[]}>
          <View style={styles.header}>
            <Text style={styles.title}>Debug Log</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <Feather name="share" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={clearDebugLog} style={styles.headerButton}>
                <Feather name="trash-2" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {entries.length === 0 ? (
            <Text style={styles.emptyText}>
              Nothing logged yet. Start a cardio session with HealthKit
              connected — entries will appear here as HealthKit is queried.
            </Text>
          ) : (
            <ScrollView style={styles.list}>
              {entries.map((entry) => (
                <View key={entry.id} style={styles.entry}>
                  <Text style={styles.entryTime}>{formatTime(entry.timestamp)}</Text>
                  <Text style={styles.entryMessage}>{entry.message}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
};

export default DebugOverlay;
