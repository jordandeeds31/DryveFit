import { useCallback, useEffect } from "react";
import { Stack } from "expo-router";
import { Provider, useDispatch } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { store } from "@/store";
import type { AppDispatch } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/api/queryClient";
import { configurePurchases } from "@/lib/purchases/purchases";
import { fetchSubscriptionStatus } from "@/store/slices/subscriptionSlice";

SplashScreen.preventAutoHideAsync();
configurePurchases();

const RootNavigator = () => {
    const { isLoading } = useAuth();
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

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="cinematic-mode"
                options={{ presentation: "fullScreenModal", headerShown: false }}
            />
        </Stack>
    );
};

export default function RootLayout() {
    return (
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>
                <RootNavigator />
            </QueryClientProvider>
        </Provider>
    );
}