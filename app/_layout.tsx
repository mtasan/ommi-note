import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initDatabase } from "../src/lib/database";
import { requestNotificationPermissions } from "../src/lib/notifications";
import { useNoteStore } from "../src/stores/useNoteStore";
import "../global.css";

export default function RootLayout() {
  const router = useRouter();
  const { completeReminder } = useNoteStore();

  useEffect(() => {
    async function init() {
      await initDatabase();
      await requestNotificationPermissions();
    }
    init();
  }, []);

  // Listen for notification responses (user tapped on notification)
  useEffect(() => {
    if (Platform.OS === "web") return;

    const Notifications = require("expo-notifications");

    // When user taps a notification -> navigate to the note & mark reminder done
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const data = response.notification.request.content.data;
        if (data?.reminderId) {
          completeReminder(data.reminderId).catch(() => {});
          // Navigate to the note if we have the noteId
          if (data.noteId) {
            router.push(`/note/${data.noteId}`);
          }
        }
      }
    );

    return () => subscription.remove();
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
