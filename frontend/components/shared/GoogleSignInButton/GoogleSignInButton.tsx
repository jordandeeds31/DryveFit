import { useState } from "react";
import { Pressable, Text, ActivityIndicator, Alert } from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import { useAuth } from "@/hooks/useAuth";
import styles from "./GoogleSignInButton.styles";

interface GoogleSignInButtonProps {
  // Same action either way — Google sign-in creates the account on its
  // first use, so there's no separate "sign up" vs "sign in" request to
  // make. onSuccess just tells the caller which navigation/side effect
  // (e.g. Signup's detectAndSaveCity) applies, via isNewUser.
  onSuccess: (isNewUser: boolean) => void;
}

const GoogleSignInButton = ({ onSuccess }: GoogleSignInButtonProps) => {
  const { loginWithGoogle } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isReady, promptAsync } = useGoogleSignIn(async (idToken) => {
    setIsSubmitting(true);
    try {
      const result = await loginWithGoogle(idToken);
      if ((result as any).meta?.requestStatus === "fulfilled") {
        onSuccess((result as any).payload.isNewUser);
      } else {
        Alert.alert("Couldn't sign in", "Something went wrong. Try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  const handlePress = async () => {
    const result = await promptAsync();
    // Cancel/dismiss (user backed out of the Google sheet) is a normal,
    // silent outcome — only a genuine error gets a message, matching how
    // the email/password forms only surface real failures.
    if (result.type === "error") {
      Alert.alert("Couldn't sign in", "Something went wrong. Try again.");
    }
  };

  return (
    <Pressable
      style={[styles.button, !isReady && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={!isReady || isSubmitting}
    >
      {isSubmitting ? (
        <ActivityIndicator color={styles.text.color} />
      ) : (
        <>
          <AntDesign name="google" size={18} color={styles.icon.color} />
          <Text style={styles.text}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
};

export default GoogleSignInButton;
