import { Stack } from "expo-router";

const AuthLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="signin" />
  );
};

export default AuthLayout;
