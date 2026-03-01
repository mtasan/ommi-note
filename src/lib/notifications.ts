import { Platform } from "react-native";
import i18n from "../i18n";

// Web-safe: only import native modules on native platforms
function getNotificationsModule() {
  if (Platform.OS === "web") return null;
  return require("expo-notifications");
}

function getDeviceModule() {
  if (Platform.OS === "web") return null;
  return require("expo-device");
}

// Set notification handler only on native
if (Platform.OS !== "web") {
  const Notifications = getNotificationsModule();
  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const Device = getDeviceModule();
  const Notifications = getNotificationsModule();
  if (!Device || !Notifications || !Device.isDevice) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}

export async function scheduleReminder(
  reminderId: string,
  noteContent: string,
  remindAt: Date,
  noteId?: string
): Promise<string> {
  if (Platform.OS === "web") {
    console.log("[Asyra] Web: reminder scheduled (mock)", reminderId);
    return reminderId;
  }

  const Notifications = getNotificationsModule()!;
  const trigger = remindAt.getTime() - Date.now();

  if (trigger <= 0) {
    throw new Error("Reminder time must be in the future");
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Asyra ${i18n.t("reminders.notificationTitle")}`,
      body:
        noteContent.length > 100
          ? noteContent.slice(0, 100) + "..."
          : noteContent,
      data: { reminderId, noteId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.floor(trigger / 1000),
    },
  });

  return notificationId;
}

export async function cancelReminder(notificationId: string): Promise<void> {
  if (Platform.OS === "web") return;
  const Notifications = getNotificationsModule()!;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
