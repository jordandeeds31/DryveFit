import { View, Image, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "@/constants/colors";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";
import { useDmConversations } from "@/hooks/useDirectMessages";
import { useCurrentUser } from "@/hooks/useUsers";
import styles from "./AppHeader.styles";

interface AppHeaderProps {
  // Wired up globally in (tabs)/_layout.tsx, so the "+" (and the
  // ProgramBuilder modal it opens) shows on every tab's header, not just
  // Home.
  onCreateProgram?: () => void;
}

const AppHeader = ({ onCreateProgram }: AppHeaderProps) => {
  const insets = useSafeAreaInsets();
  const { data: unreadCount } = useUnreadNotificationCount();
  const hasUnread = !!unreadCount && unreadCount > 0;
  // Derived from the already-fetched conversation list rather than a
  // dedicated count endpoint — that list is cheap (one row per
  // conversation, not per message) and already needs fetching for the
  // conversation list screen itself.
  const { data: dmConversations } = useDmConversations();
  const hasUnreadDms = !!dmConversations?.some(
    (c: { unreadCount: number }) => c.unreadCount > 0,
  );
  const { data: currentUser } = useCurrentUser();

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
            style={styles.createButton}
            onPress={onCreateProgram}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="plus" size={16} color={colors.primaryBlue} />
            <Text style={styles.createButtonText}>New Program</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/search")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="search" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/messages")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather
            name="message-circle"
            size={20}
            color={colors.textSecondary}
          />
          {hasUnreadDms && <View style={styles.unreadBadge} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/notifications")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="bell" size={20} color={colors.textSecondary} />
          {hasUnread && <View style={styles.unreadBadge} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/ai-chat")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="sparkles" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {currentUser && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push(`/user/${currentUser.id}`)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="user" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default AppHeader;
