import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useNoteStore } from "../../src/stores/useNoteStore";
import { NoteCard } from "../../src/components/NoteCard";
import { VoiceRecorder } from "../../src/components/VoiceRecorder";
import { ColorPicker } from "../../src/components/ColorPicker";
import { EmptyState } from "../../src/components/EmptyState";
import { getRandomColor, type NoteColorName } from "../../src/lib/colors";

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const { notes, reminders, loadNotes, loadReminders, createNote } = useNoteStore();

  const bottomSheetRef = useRef<BottomSheet>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [selectedColor, setSelectedColor] = useState<NoteColorName>("yellow");
  const [showVoice, setShowVoice] = useState(false);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
      loadReminders();
    }, [])
  );

  const openSheet = () => {
    setNewNoteText("");
    setSelectedColor(getRandomColor().name);
    setShowVoice(false);
    setVoiceUri(null);
    bottomSheetRef.current?.expand();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    const text = newNoteText.trim();
    if (!text && !voiceUri) {
      Alert.alert("Boş not", "Lütfen bir şeyler yazın veya ses kaydedin.");
      return;
    }

    const type = voiceUri ? (text ? "mixed" : "voice") : "text";
    await createNote(text, type, selectedColor, voiceUri ?? undefined);
    bottomSheetRef.current?.close();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleVoiceComplete = (uri: string) => {
    setVoiceUri(uri);
    setShowVoice(false);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Günaydın!";
    if (h < 18) return "İyi günler!";
    return "İyi akşamlar!";
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
        <Text style={{ fontSize: 14, color: "#A3A3A3", marginBottom: 2 }}>
          {getGreeting()}
        </Text>
        <Text style={{ fontSize: 28, fontWeight: "800", color: "#262626" }}>
          Notlarım
        </Text>
      </View>

      {/* Note list */}
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <NoteCard
              note={item}
              hasReminder={reminders.some(
                (r) => r.noteId === item.id && !r.isDone
              )}
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="sparkles-outline"
            title="Henüz not yok"
            description="Aşağıdaki + butonuna tıklayarak ilk notunu oluştur!"
          />
        }
      />

      {/* FAB */}
      <Pressable
        onPress={openSheet}
        style={{
          position: "absolute",
          bottom: Platform.OS === "ios" ? 100 : 80,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: "#3B82F6",
          alignItems: "center",
          justifyContent: "center",
          elevation: 6,
          shadowColor: "#3B82F6",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
      >
        <Ionicons name="add" size={30} color="white" />
      </Pressable>

      {/* Bottom Sheet - Create Note */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={["55%", "80%"]}
        enablePanDownToClose
        backgroundStyle={{
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
        }}
        handleIndicatorStyle={{ backgroundColor: "#D4D4D4", width: 40 }}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 20 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#262626",
                marginBottom: 16,
              }}
            >
              Yeni Not
            </Text>

            {/* Color picker */}
            <View style={{ marginBottom: 16 }}>
              <ColorPicker selected={selectedColor} onSelect={setSelectedColor} />
            </View>

            {/* Text input */}
            <TextInput
              value={newNoteText}
              onChangeText={setNewNoteText}
              placeholder="Aklına ne geliyorsa yaz..."
              placeholderTextColor="#A3A3A3"
              multiline
              style={{
                flex: 1,
                fontSize: 16,
                color: "#333",
                textAlignVertical: "top",
                minHeight: 100,
                lineHeight: 24,
              }}
              autoFocus
            />

            {/* Voice recording badge */}
            {voiceUri && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#E3F2FD",
                  padding: 10,
                  borderRadius: 12,
                  marginBottom: 8,
                  gap: 8,
                }}
              >
                <Ionicons name="mic" size={18} color="#1976D2" />
                <Text style={{ flex: 1, color: "#1976D2", fontWeight: "500" }}>
                  Ses kaydedildi
                </Text>
                <Pressable onPress={() => setVoiceUri(null)}>
                  <Ionicons name="close-circle" size={20} color="#1976D2" />
                </Pressable>
              </View>
            )}

            {/* Voice recorder */}
            {showVoice && (
              <View style={{ marginBottom: 12 }}>
                <VoiceRecorder onRecordingComplete={handleVoiceComplete} />
              </View>
            )}

            {/* Bottom actions */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: "#F5F5F5",
                marginBottom: Platform.OS === "ios" ? 20 : 8,
              }}
            >
              <Pressable
                onPress={() => setShowVoice(!showVoice)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: showVoice ? "#E3F2FD" : "#F5F5F5",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12,
                }}
              >
                <Ionicons
                  name={showVoice ? "mic" : "mic-outline"}
                  size={20}
                  color={showVoice ? "#1976D2" : "#737373"}
                />
                <Text
                  style={{
                    color: showVoice ? "#1976D2" : "#737373",
                    fontWeight: "500",
                  }}
                >
                  Sesli
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSave}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "#3B82F6",
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 14,
                }}
              >
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                  Kaydet
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
