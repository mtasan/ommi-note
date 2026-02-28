import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initDatabase } from "../src/lib/database";
import { requestNotificationPermissions } from "../src/lib/notifications";
import "../global.css";

export default function RootLayout() {
  useEffect(() => {
    async function init() {
      await initDatabase();
      await requestNotificationPermissions();
    }
    init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </GestureHandlerRootView>
  );
}
