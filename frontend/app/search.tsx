import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import Input from "@/components/shared/TextInput/TextInput";
import { useSearchUsers, useToggleFollow } from "@/hooks/useUsers";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";
import { UserSearchResult } from "@/types/user.types";

const useDebouncedValue = (value: string, delayMs: number): string => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
};

const SearchScreen = () => {
  const authImageHeaders = useAuthImageHeaders();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const { data: results, isLoading, isFetching } = useSearchUsers(debouncedQuery);
  const { mutate: toggleFollow, isPending: isTogglingFollow } =
    useToggleFollow();

  const trimmedLength = debouncedQuery.trim().length;

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Search by username or email"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {trimmedLength < 2 ? (
        <Text style={styles.hintText}>
          Type at least 2 characters to search for someone.
        </Text>
      ) : isLoading || isFetching ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          data={results ?? []}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.hintText}>
              No users found for "{debouncedQuery.trim()}"
            </Text>
          }
          renderItem={({ item }: { item: UserSearchResult }) => (
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.rowTouchable}
                onPress={() => router.push(`/user/${item.id}`)}
              >
                {item.profileImageUrl && authImageHeaders ? (
                  <Image
                    source={{
                      uri: `${process.env.EXPO_PUBLIC_API_URL}${item.profileImageUrl}`,
                      headers: authImageHeaders,
                    }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Feather
                      name="user"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                )}
                <Text style={styles.username}>{item.username}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  item.isFollowedByViewer && styles.followButtonActive,
                ]}
                onPress={() =>
                  toggleFollow({
                    userId: item.id,
                    isFollowing: item.isFollowedByViewer,
                  })
                }
                disabled={isTogglingFollow}
              >
                <Text
                  style={[
                    styles.followButtonText,
                    item.isFollowedByViewer && styles.followButtonTextActive,
                  ]}
                >
                  {item.isFollowedByViewer ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  hintText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGraySoft,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGraySoft,
    borderWidth: 1,
    borderColor: colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
  },
  username: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    flexShrink: 1,
  },
  followButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.primaryBlue,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  followButtonActive: {
    backgroundColor: colors.surfaceGrayLight,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  followButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: "white",
  },
  followButtonTextActive: {
    color: colors.textSecondary,
  },
});
