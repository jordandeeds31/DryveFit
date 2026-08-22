import { useCallback, useEffect } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { Provider, useDispatch } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import * as SplashScreen from "expo-splash-screen";
import { store } from "@/store";
import type { AppDispatch } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/api/queryClient";
import { configurePurchases } from "@/lib/purchases/purchases";
import { fetchSubscriptionStatus } from "@/store/slices/subscriptionSlice";
import {
    registerForPushNotifications,
    setupNotificationTapHandling,
} from "@/lib/notifications/pushNotifications";
import {
    connect as connectDmSocket,
    disconnect as disconnectDmSocket,
} from "@/lib/messaging/websocketClient";
import { useDmWebSocketBridge } from "@/hooks/useDirectMessages";
// Side-effect import only — this registers the background location task
// (TaskManager.defineTask) at module scope, unconditionally, so it's
// defined even if iOS relaunches the app purely to deliver a background
// location batch during a cardio session, before the cardio screen itself
// would ever be imported through normal navigation.
import "@/lib/location/cardioBackgroundLocation";

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
            registerForPushNotifications();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        return setupNotificationTapHandling();
    }, []);

    // Subscribes to the socket's own events (message:new, typing, read
    // receipts) and patches React Query's cache / dispatches into
    // messagingSlice — mounted once here so it stays active regardless of
    // which screen is on top, not tied to a specific messages screen.
    useDmWebSocketBridge();

    // Opens the DM socket once authenticated, closes it on logout —
    // connect()/disconnect() are both safe to call repeatedly (they no-op
    // if already in the target state), so this doesn't need to track
    // whether a connection already exists itself.
    useEffect(() => {
        if (isAuthenticated) {
            connectDmSocket();
        } else {
            disconnectDmSocket();
        }
    }, [isAuthenticated]);

    // iOS suspends JS execution shortly after backgrounding anyway, so a
    // socket left open while backgrounded goes stale regardless — closing
    // it explicitly on background/inactive avoids holding a connection the
    // OS would otherwise kill messily, and reconnecting on "active" picks
    // back up (with sync:missed replaying anything sent while away).
    useEffect(() => {
        const subscription = AppState.addEventListener("change", (state) => {
            if (!isAuthenticated) return;
            if (state === "active") {
                connectDmSocket();
            } else if (state === "background" || state === "inactive") {
                disconnectDmSocket();
            }
        });
        return () => subscription.remove();
    }, [isAuthenticated]);

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
            <Stack.Screen
                name="post/[postId]"
                options={{ presentation: "fullScreenModal", headerShown: false }}
            />
            <Stack.Screen
                name="blog/[blogPostId]"
                options={{ presentation: "fullScreenModal", headerShown: false }}
            />
        </Stack>
    );
};

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <KeyboardProvider>
                <Provider store={store}>
                    <QueryClientProvider client={queryClient}>
                        <RootNavigator />
                    </QueryClientProvider>
                </Provider>
            </KeyboardProvider>
        </SafeAreaProvider>
    );
}