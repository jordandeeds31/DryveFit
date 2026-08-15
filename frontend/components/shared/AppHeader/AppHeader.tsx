import { View, Image, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/constants/colors";
import styles from "./AppHeader.styles";

interface AppHeaderProps {
  // Wired up globally in (tabs)/_layout.tsx, so the "+" (and the
  // ProgramBuilder modal it opens) shows on every tab's header, not just
  // Home.
  onCreateProgram?: () => void;
}

const AppHeader = ({ onCreateProgram }: AppHeaderProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity onPress={() => router.push("/(tabs)")}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <View style={styles.headerActions}>
        {onCreateProgram && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onCreateProgram}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="plus" size={20} color={colors.primaryBlue} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/(tabs)/Programs")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="clipboard" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/ai-chat")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather
            name="message-circle"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/(tabs)/Profile")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="settings" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AppHeader;
