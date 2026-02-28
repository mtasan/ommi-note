import { useCallback } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, isPast } from "date-fns";
import { tr } from "date-fns/locale";
import * as Haptics from "expo-haptics";
import { useNoteStore } from "../../src/stores/useNoteStore";
import { getColorByName } from "../../src/lib/colors";
import { EmptyState } from "../../src/components/EmptyState";

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notes, reminders, loadNotes, loadReminders, completeReminder } =
    useNoteStore();

  useFocusEffect(
    useCallback(() => {
      loadNotes();
      loadReminders();
    }, [])
  );

  const activeReminders = reminders
    .filter((r) => !r.isDone)
    .sort((a, b) => a.remindAt - b.remindAt);

  const doneReminders = reminders
    .filter((r) => r.isDone)
    .sort((a, b) => b.remindAt - a.remindAt)
    .slice(0, 10);

  const getNote = (noteId: string) => notes.find((n) => n.id === noteId);

  const handleComplete = async (id: string) => {
    await completeReminder(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderReminder = ({
    item,
    done,
  }: {
    item: (typeof reminders)[0];
    done?: boolean;
  }) => {
    const note = getNote(item.noteId);
    if (!note) return null;
    const color = getColorByName(note.color);
    const isOverdue = isPast(new Date(item.remindAt)) && !done;

    return (
      <Pressable
        onPress={() => router.push(`/note/${note.id}`)}
        style={{
          backgroundColor: done ? "#F5F5F5" : color.bg,
          borderColor: done ? "#E5E5E5" : color.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 14,
          marginBottom: 10,
          opacity: done ? 0.6 : 1,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          {/* Checkbox */}
          {!done && (
            <Pressable
              onPress={() => handleComplete(item.id)}
              hitSlop={12}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: isOverdue ? "#EF4444" : "#3B82F6",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              <Ionicons
                name="checkmark"
                size={16}
                color="transparent"
              />
            </Pressable>
          )}

          {done && (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "#A3A3A3",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              <Ionicons name="checkmark" size={16} color="white" />
            </View>
          )}

          {/* Content */}
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={2}
              style={{
                fontSize: 15,
                color: done ? "#A3A3A3" : "#333",
                textDecorationLine: done ? "line-through" : "none",
                lineHeight: 22,
              }}
            >
              {note.content || "Sesli not"}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 6,
              }}
            >
              <Ionicons
                name="alarm"
                size={14}
                color={isOverdue ? "#EF4444" : "#737373"}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: isOverdue ? "#EF4444" : "#737373",
                  fontWeight: isOverdue ? "600" : "400",
                }}
              >
                {format(new Date(item.remindAt), "d MMM yyyy, HH:mm", {
                  locale: tr,
                })}
                {isOverdue && " (geçmiş)"}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: "#FFFFFF",
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: "800", color: "#262626" }}>
          Hatırlatıcılar
        </Text>
      </View>

      <FlatList
        data={[...activeReminders, ...doneReminders]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        renderItem={({ item }) =>
          renderReminder({ item, done: item.isDone })
        }
        ListHeaderComponent={
          activeReminders.length > 0 ? (
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#A3A3A3",
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Aktif ({activeReminders.length})
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="alarm-outline"
            title="Hatırlatıcı yok"
            description="Notlarına hatırlatıcı ekleyerek hiçbir şeyi kaçırma!"
          />
        }
      />
    </View>
  );
}
