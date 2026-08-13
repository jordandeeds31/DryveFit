import { useCallback, useEffect } from "react";
import { Stack } from "expo-router";
import { Provider, useDispatch } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { store } from "@/store";
import type { AppDispatch } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/api/queryClient";
import { configurePurchases } from "@/lib/purchases/purchases";
import { fetchSubscriptionStatus } from "@/store/slices/subscriptionSlice";
import {
    registerForWorkoutReminders,
    setupWorkoutReminderTapHandling,
} from "@/lib/notifications/pushNotifications";

SplashScreen.preventAutoHideAsync();
configurePurchases();

const RootNavigator = () => {
    const { isLoading, isAuthenticated } = useAuth();
    const dispatch = useDispatch<AppDispatch>();

    const hideSplash = useCallback(async () => {
        if (!isLoading) {
            await SplashScreen.hideAsync();
        }
    }, [isLoading]);

    useEffect(() => {
        hideSplash();
    }, [hideSplash]);

    useEffect(() => {
        dispatch(fetchSubscriptionStatus());
    }, [dispatch]);

    // Registering the push token requires an authenticated request, but
    // tap handling (a user opening a notification they got yesterday, say)
    // should work regardless of today's auth state — kept as two effects
    // rather than one gated together.
    useEffect(() => {
        if (isAuthenticated) {
            registerForWorkoutReminders();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        return setupWorkoutReminderTapHandling();
    }, []);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="cinematic-mode"
                options={{ presentation: "fullScreenModal", headerShown: false }}
            />
            <Stack.Screen
                name="workout-recap"
                options={{ presentation: "fullScreenModal", headerShown: false }}
            />
            <Stack.Screen
                name="cardio-session"
                options={{ presentation: "fullScreenModal", headerShown: false }}
            />
            <Stack.Screen
                name="cardio-recap"
                options={{ presentation: "fullScreenModal", headerShown: false }}
            />
            <Stack.Screen
                name="ai-chat"
                options={{ presentation: "fullScreenModal", headerShown: false }}
            />
        </Stack>
    );
};

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <Provider store={store}>
                <QueryClientProvider client={queryClient}>
                    <RootNavigator />
                </QueryClientProvider>
            </Provider>
        </SafeAreaProvider>
    );
}