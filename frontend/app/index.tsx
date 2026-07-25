import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { restoreSession } from "@/store/slices/authSlice";
import type { AppDispatch } from "@/store";

const Index = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        dispatch(restoreSession());
    }, [dispatch]);

    if (isLoading) return null;

    return <Redirect href={isAuthenticated ? "/(tabs)" : "/(auth)/signin"} />;
};

export default Index;