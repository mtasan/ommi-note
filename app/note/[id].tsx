import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useNoteStore } from "../../src/stores/useNoteStore";
import { ReminderPicker } from "../../src/components/ReminderPicker";
import { getColorByName } from "../../src/lib/colors";

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    notes,
    reminders,
    updateNote,
    deleteNote,
    addReminder,
    deleteReminder,
    getReminderForNote,
  } = useNoteStore();

  const note = notes.find((n) => n.id === id);
  const [content, setContent] = useState(note?.content ?? "");
  const [showReminder, setShowReminder] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const activeReminder = id ? getReminderForNote(id) : undefined;
  const color = note ? getColorByName(note.color) : getColorByName("yellow");

  // Auto-save on back
  const handleBack = useCallback(async () => {
    if (note && content !== note.content) {
      await updateNote(note.id, content);
    }
    router.back();
  }, [note, content]);

  const handleDelete = () => {
    Alert.alert("Notu Sil", "Bu notu silmek istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          if (note) {
            await deleteNote(note.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          }
        },
      },
    ]);
  };

  const handleScheduleReminder = async (date: Date) => {
    if (note) {
      try {
        await addReminder(note.id, content || "Sesli not", date);
        setShowReminder(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err: any) {
        Alert.alert("Hata", err.message || "Hatırlatıcı eklenemedi.");
      }
    }
  };

  const handleDeleteReminder = async () => {
    if (activeReminder) {
      await deleteReminder(activeReminder.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const playAudio = async () => {
    if (!note?.audioUri) return;

    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsPlaying(false);
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: note.audioUri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch {
      Alert.alert("Hata", "Ses dosyası çalınamadı.");
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  if (!note) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#A3A3A3" }}>Not bulunamadı</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={handleBack}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            padding: 8,
          }}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
          <Text style={{ fontSize: 16, color: "#333" }}>Geri</Text>
        </Pressable>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => setShowReminder(true)}
            style={{
              padding: 8,
              backgroundColor: "rgba(255,255,255,0.6)",
              borderRadius: 12,
            }}
          >
            <Ionicons
              name={activeReminder ? "alarm" : "alarm-outline"}
              size={22}
              color={activeReminder ? "#E65100" : "#333"}
            />
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={{
              padding: 8,
              backgroundColor: "rgba(255,255,255,0.6)",
              borderRadius: 12,
            }}
          >
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        {/* Date info */}
        <Text style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
          {format(new Date(note.createdAt), "d MMMM yyyy, HH:mm", { locale: tr })}
          {note.updatedAt !== note.createdAt &&
            ` · Düzenlendi: ${format(new Date(note.updatedAt), "HH:mm", { locale: tr })}`}
        </Text>

        {/* Active reminder badge */}
        {activeReminder && (
          <Pressable
            onPress={handleDeleteReminder}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.7)",
              padding: 10,
              borderRadius: 12,
              marginBottom: 16,
              gap: 8,
            }}
          >
            <Ionicons name="alarm" size={18} color="#E65100" />
            <Text style={{ flex: 1, color: "#E65100", fontWeight: "500", fontSize: 13 }}>
              {format(new Date(activeReminder.remindAt), "d MMM yyyy, HH:mm", {
                locale: tr,
              })}
            </Text>
            <Ionicons name="close-circle" size={18} color="#E65100" />
          </Pressable>
        )}

        {/* Audio player */}
        {note.audioUri && (
          <Pressable
            onPress={playAudio}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.7)",
              padding: 14,
              borderRadius: 14,
              marginBottom: 16,
              gap: 10,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#1976D2",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={22}
                color="white"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: "#333", fontSize: 14 }}>
                Sesli Not
              </Text>
              <Text style={{ color: "#888", fontSize: 12 }}>
                {isPlaying ? "Çalıyor..." : "Dinlemek için dokun"}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Transcript (from AI voice processing) */}
        {note.transcript && (
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.6)",
              padding: 14,
              borderRadius: 14,
              marginBottom: 16,
              borderLeftWidth: 3,
              borderLeftColor: "#16A34A",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Ionicons name="document-text" size={14} color="#16A34A" />
              <Text
                style={{ color: "#16A34A", fontWeight: "600", fontSize: 12 }}
              >
                Ses Transkripti
              </Text>
            </View>
            <Text
              style={{
                color: "#166534",
                fontSize: 13,
                lineHeight: 20,
                fontStyle: "italic",
              }}
            >
              {note.transcript}
            </Text>
          </View>
        )}

        {/* Content editor */}
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Notunuzu yazın..."
          placeholderTextColor="#A3A3A3"
          multiline
          style={{
            fontSize: 17,
            color: "#333",
            lineHeight: 26,
            textAlignVertical: "top",
            minHeight: 200,
          }}
        />
      </ScrollView>

      {/* Reminder picker modal */}
      {showReminder && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
            padding: 16,
            paddingBottom: Platform.OS === "ios" ? insets.bottom + 16 : 16,
          }}
        >
          <ReminderPicker
            onSchedule={handleScheduleReminder}
            onCancel={() => setShowReminder(false)}
          />
        </View>
      )}
    </View>
  );
}
