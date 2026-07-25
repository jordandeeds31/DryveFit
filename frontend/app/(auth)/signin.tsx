import { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Input from "@/components/shared/TextInput/TextInput";
import { spacing } from "@/constants/spacing";
import Button from "@/components/shared/Button/Button";
import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import { colors } from "@/constants/colors";
import { fontSizes } from "@/constants/typography";

const Signin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const { login, isLoading, error } = useAuth();

    const handleSignin = async () => {
        const result = await login(email, password);
        if ((result as any).meta?.requestStatus === "fulfilled") {
            router.replace("/(tabs)")
        }
    }

    const toSignup = () => {
        router.push("/(auth)/signup");
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.textInputContainer}>
                <Input label="Email" placeholder="Enter email" autoCapitalize="none" value={email} onChangeText={setEmail} keyboardType="email-address" />
                <Input label="Password" placeholder="Enter password" autoCapitalize="none" value={password} onChangeText={setPassword} isPassword />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.buttonContainer}>
                <Button title={isLoading ? "Signing In..." : "Sign In"} onPress={handleSignin} disabled={isLoading} />
            </View>
            <View style={styles.accountRow}>
                <Text>Don't have an account?</Text>
                <TouchableOpacity onPress={toSignup}>
                    <Text style={styles.signupText}>Sign up</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}

export default Signin;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: spacing.lg
    },
    textInputContainer: {
        gap: spacing.md,
        marginBottom: spacing.lg
    },
    errorText: {
        color: "red",
        fontSize: fontSizes.sm,
        textAlign: "center",
        marginBottom: spacing.md
    },
    buttonContainer: {
        marginBottom: spacing.lg
    },
    accountRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        justifyContent: "center"
    },
    signupText: {
        color: colors.primaryBlue
    }
})