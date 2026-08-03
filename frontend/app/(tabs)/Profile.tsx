import { View, Text, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Button from "@/components/shared/Button/Button";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const Profile = () => {
  const { logout, isLoading } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign out?", "You'll need to sign back in to continue.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/signin");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.buttonContainer}>
        <Button
          title={isLoading ? "SIGNING OUT..." : "SIGN OUT"}
          backgroundColor={colors.dangerRed}
          onPress={handleSignOut}
          disabled={isLoading}
        />
      </View>
    </SafeAreaView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    marginTop: "auto",
    marginBottom: spacing.lg,
  },
});
