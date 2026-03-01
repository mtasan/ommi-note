import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { getDateLocale } from "../i18n/dateLocale";

export type ProcessingState = "idle" | "processing" | "done" | "error";

interface TranscriptionStatusProps {
  state: ProcessingState;
  transcript?: string;
  suggestedReminder?: {
    date: Date;
    rawText: string;
  } | null;
  onAcceptReminder?: () => void;
  onDismissReminder?: () => void;
  onRetry?: () => void;
  onRemoveAudio?: () => void;
}

export function TranscriptionStatus({
  state,
  transcript,
  suggestedReminder,
  onAcceptReminder,
  onDismissReminder,
  onRetry,
  onRemoveAudio,
}: TranscriptionStatusProps) {
  const { t } = useTranslation();

  if (state === "idle") return null;

  // Processing state
  if (state === "processing") {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#FFF7ED",
          padding: 12,
          borderRadius: 12,
          marginBottom: 8,
          gap: 10,
          borderWidth: 1,
          borderColor: "#FED7AA",
        }}
      >
        <ActivityIndicator size="small" color="#EA580C" />
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#EA580C", fontWeight: "600", fontSize: 14 }}>
            {t("transcription.processing")}
          </Text>
          <Text style={{ color: "#C2410C", fontSize: 12, marginTop: 2 }}>
            {t("transcription.processingDetail")}
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#FEF2F2",
          padding: 12,
          borderRadius: 12,
          marginBottom: 8,
          gap: 10,
          borderWidth: 1,
          borderColor: "#FECACA",
        }}
      >
        <Ionicons name="warning" size={20} color="#DC2626" />
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#DC2626", fontWeight: "600", fontSize: 14 }}>
            {t("transcription.failed")}
          </Text>
          <Text style={{ color: "#991B1B", fontSize: 12, marginTop: 2 }}>
            {t("transcription.failedDetail")}
          </Text>
        </View>
        {onRetry && (
          <Pressable
            onPress={onRetry}
            style={{
              backgroundColor: "#FEE2E2",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#DC2626", fontWeight: "600", fontSize: 12 }}>
              {t("transcription.retry")}
            </Text>
          </Pressable>
        )}
        {onRemoveAudio && (
          <Pressable onPress={onRemoveAudio} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={20} color="#DC2626" />
          </Pressable>
        )}
      </View>
    );
  }

  // Done state
  return (
    <View style={{ marginBottom: 8, gap: 8 }}>
      {/* Audio recorded badge */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#E3F2FD",
          padding: 10,
          borderRadius: 12,
          gap: 8,
        }}
      >
        <Ionicons name="mic" size={18} color="#1976D2" />
        <Text style={{ flex: 1, color: "#1976D2", fontWeight: "500" }}>
          {t("transcription.recorded")}
        </Text>
        {onRemoveAudio && (
          <Pressable onPress={onRemoveAudio}>
            <Ionicons name="close-circle" size={20} color="#1976D2" />
          </Pressable>
        )}
      </View>

      {/* Transcript preview */}
      {transcript && (
        <View
          style={{
            backgroundColor: "#F0FDF4",
            padding: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#BBF7D0",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <Ionicons name="document-text" size={14} color="#16A34A" />
            <Text
              style={{ color: "#16A34A", fontWeight: "600", fontSize: 12 }}
            >
              {t("transcription.transcript")}
            </Text>
          </View>
          <Text
            style={{ color: "#166534", fontSize: 13, lineHeight: 18 }}
            numberOfLines={3}
          >
            {transcript}
          </Text>
        </View>
      )}

      {/* Reminder suggestion */}
      {suggestedReminder && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#EFF6FF",
            padding: 12,
            borderRadius: 12,
            gap: 8,
            borderWidth: 1,
            borderColor: "#BFDBFE",
          }}
        >
          <Ionicons name="alarm" size={20} color="#2563EB" />
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: "#2563EB", fontWeight: "600", fontSize: 13 }}
            >
              {t("reminders.detected")}
            </Text>
            <Text style={{ color: "#1E40AF", fontSize: 12, marginTop: 2 }}>
              {format(suggestedReminder.date, "d MMMM yyyy, HH:mm", {
                locale: getDateLocale(),
              })}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Pressable
              onPress={onAcceptReminder}
              style={{
                backgroundColor: "#2563EB",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text
                style={{ color: "white", fontWeight: "700", fontSize: 12 }}
              >
                {t("reminders.addButton")}
              </Text>
            </Pressable>
            <Pressable
              onPress={onDismissReminder}
              style={{
                backgroundColor: "#DBEAFE",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Ionicons name="close" size={14} color="#2563EB" />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
