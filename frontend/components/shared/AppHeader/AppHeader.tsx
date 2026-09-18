import { View, Image, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "@/constants/colors";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";
import { useDmConversations } from "@/hooks/useDirectMessages";
import { useCurrentUser } from "@/hooks/useUsers";
import { usePrograms } from "@/hooks/usePrograms";
import AnimatedGradientBorder from "@/components/shared/AnimatedGradientBorder/AnimatedGradientBorder";
import styles from "./AppHeader.styles";

interface AppHeaderProps {
  // Wired up globally in (tabs)/_layout.tsx, so the "+" (and the
  // ProgramBuilder modal it opens) shows on every tab's header, not just
  // Home.
  onCreateProgram?: () => void;
  // Pauses the "New Program" gradient border while its modal is open on
  // top of it, instead of spinning uselessly underneath.
  isCreateProgramModalOpen?: boolean;
}

const AppHeader = ({
  onCreateProgram,
  isCreateProgramModalOpen,
}: AppHeaderProps) => {
  const insets = useSafeAreaInsets();
  const { data: unreadCount } = useUnreadNotificationCount();
  // Derived from the already-fetched conversation list rather than a
  // dedicated count endpoint — that list is cheap (one row per
  // conversation, not per message) and already needs fetching for the
  // conversation list screen itself.
  const { data: dmConversations } = useDmConversations();
  const unreadDmCount = (dmConversations ?? []).reduce(
    (total: number, c: { unreadCount: number }) => total + c.unreadCount,
    0,
  );
  const { data: currentUser } = useCurrentUser();
  // Shares the ["programs"] query cache with the Home screen, so this
  // costs no extra network request — used only to decide whether "New
  // Program" is still the CTA a brand-new user most needs to notice.
  const { data: programs } = usePrograms();
  const hasPrograms = !!programs && programs.length > 0;

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
        {onCreateProgram &&
          (!hasPrograms ? (
            <AnimatedGradientBorder
              borderRadius={12}
              isAnimating={!isCreateProgramModalOpen}
            >
              <TouchableOpacity
                style={styles.createButtonGradientInner}
                onPress={onCreateProgram}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="plus" size={16} color={colors.primaryBlue} />
                <Text style={styles.createButtonText}>New Program</Text>
              </TouchableOpacity>
            </AnimatedGradientBorder>
          ) : (
            <TouchableOpacity
              style={styles.createButton}
              onPress={onCreateProgram}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="plus" size={16} color={colors.primaryBlue} />
              <Text style={styles.createButtonText}>New Program</Text>
            </TouchableOpacity>
          ))}
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
          {unreadDmCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {unreadDmCount > 9 ? "9+" : unreadDmCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/notifications")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="bell" size={20} color={colors.textSecondary} />
          {!!unreadCount && unreadCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
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
