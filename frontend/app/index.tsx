import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Redirect, Href } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { restoreSession } from "@/store/slices/authSlice";
import { consumePendingNotificationRoute } from "@/lib/notifications/pushNotifications";
import type { AppDispatch } from "@/store";

const Index = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { isAuthenticated, isLoading } = useAuth();
    // undefined = still checking whether this launch was triggered by a
    // tapped notification (e.g. a DM from the Lock Screen); null = checked,
    // nothing pending. Held here — rather than letting the notification
    // handler push on its own — so this component's own redirect below
    // can't race it and overwrite the destination it just navigated to.
    const [pendingRoute, setPendingRoute] = useState<Href | null | undefined>(
        undefined,
    );

    useEffect(() => {
        dispatch(restoreSession());
    }, [dispatch]);

    useEffect(() => {
        consumePendingNotificationRoute().then(setPendingRoute);
    }, []);

    if (isLoading || pendingRoute === undefined) return null;

    if (isAuthenticated && pendingRoute) {
        return <Redirect href={pendingRoute} />;
    }

    return <Redirect href={isAuthenticated ? "/(tabs)" : "/(auth)/signin"} />;
};

export default Index;