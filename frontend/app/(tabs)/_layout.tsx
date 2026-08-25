import { useCallback, useMemo, useState } from "react";
import { Text } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import AppHeader from "@/components/shared/AppHeader/AppHeader";
import Modal from "@/components/shared/Modal/Modal";
import ProgramBuilder from "@/features/ProgramBuilder/ProgramBuilder";
import programBuilderStyles from "@/features/ProgramBuilder/ProgramBuilder.styles";
import useToggle from "@/hooks/useToggle";
import { ensureProAccess } from "@/lib/purchases/requirePro";

export default function TabsLayout() {
  // Lives here rather than on the Home screen so the "+" in AppHeader (and
  // the modal it opens) works from every tab, not just Home — a real
  // RN Modal renders as its own overlay regardless of which screen's tree
  // it's mounted from, so one instance here covers the whole tab group.
  const { isOpen, close, toggle } = useToggle();
  const [isGeneratingProgram, setIsGeneratingProgram] = useState(false);

  const handleCreateProgram = useCallback(async () => {
    const granted = await ensureProAccess();
    if (granted) toggle();
  }, [toggle]);

  // Stabilized so React Navigation doesn't see a new `header` reference
  // (and remount AppHeader, restarting its gradient-border animation from
  // frame zero) every time this layout re-renders for an unrelated reason
  // — e.g. toggling isOpen/isGeneratingProgram above.
  const renderHeader = useCallback(
    () => (
      <AppHeader
        onCreateProgram={handleCreateProgram}
        isCreateProgramModalOpen={isOpen}
      />
    ),
    [handleCreateProgram, isOpen],
  );

  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: colors.primaryBlue,
      tabBarInactiveTintColor: colors.textMuted,
      // The Program Builder sheet is a real full-screen RN Modal, but on
      // some platforms the tab bar's own layer can still paint above it
      // (observed on device: the tab bar rendered on top of, and covered,
      // the "Build & Activate Program" button). Hiding it outright while
      // the sheet is open is a hard guarantee rather than relying on
      // z-index/elevation ordering to hold.
      tabBarStyle: {
        borderTopColor: colors.borderGray,
        display: isOpen ? ("none" as const) : ("flex" as const),
      },
      tabBarLabelStyle: {
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.semibold,
      },
      tabBarItemStyle: {
        paddingTop: 6,
      },
      headerShown: true,
      header: renderHeader,
      sceneStyle: {
        backgroundColor: "white",
      },
    }),
    [renderHeader, isOpen],
  );

  return (
    <>
      <Modal
        visible={isOpen}
        onClose={close}
        closable={!isGeneratingProgram}
        headerAction={
          <Text style={programBuilderStyles.title}>Build Your Program</Text>
        }
        size="large"
        wide
        glass
        bottom
        keyboardAware={false}
      >
        <ProgramBuilder
          onCreated={close}
          onGeneratingChange={setIsGeneratingProgram}
        />
      </Modal>
      <Tabs
        screenOptions={screenOptions}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="Nutrition"
          options={{
            title: "Nutrition",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "nutrition" : "nutrition-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="Programs"
          options={{
            title: "Programs",
            // Reached from the "Programs" row in Profile settings now
            // instead of the tab bar — same "registered route, hidden from
            // the tab bar" pattern Profile below already used.
            href: null,
          }}
        />
        <Tabs.Screen
          name="PersonalRecordProgress"
          options={{
            title: "PR Progress",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "trending-up" : "trending-up-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="Leaderboard"
          options={{
            title: "Leaderboard",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "trophy" : "trophy-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="Cardio"
          options={{
            title: "Cardio",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "walk" : "walk-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="Profile"
          options={{
            title: "Settings",
            href: null,
            // Builds its own back-button header in-file (reached by
            // drilling in from the profile screen's gear icon) — the
            // global AppHeader from screenOptions above would otherwise
            // double up on top of it, same reasoning as user/[userId].
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="user/[userId]"
          options={{
            title: "Profile",
            href: null,
            // This screen builds its own back-button header in-file (it's
            // reached by drilling into a specific user, unlike the other
            // hidden tabs above) — the global AppHeader from screenOptions
            // above would otherwise double up on top of it.
            headerShown: false,
          }}
        />
      </Tabs>
    </>
  );
}
