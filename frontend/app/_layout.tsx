import { useCallback, useEffect } from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { store } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/api/queryClient";

SplashScreen.preventAutoHideAsync();

const RootNavigator = () => {
    const { isLoading } = useAuth();

    const hideSplash = useCallback(async () => {
        if (!isLoading) {
            await SplashScreen.hideAsync();
        }
    }, [isLoading]);

    useEffect(() => {
        hideSplash();
    }, [hideSplash]);

    return <Stack screenOptions={{ headerShown: false }} />;
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