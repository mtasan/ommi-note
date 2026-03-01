import { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNoteStore } from "../../src/stores/useNoteStore";
import { NoteCard } from "../../src/components/NoteCard";
import { VoiceRecorder } from "../../src/components/VoiceRecorder";
import { ColorPicker } from "../../src/components/ColorPicker";
import { EmptyState } from "../../src/components/EmptyState";
import { SearchBar } from "../../src/components/SearchBar";
import { ColorFilter } from "../../src/components/ColorFilter";
import {
  TranscriptionStatus,
  type ProcessingState,
} from "../../src/components/TranscriptionStatus";
import { transcribeAndExtract, type VoiceNoteResult } from "../../src/lib/gemini";
import { getRandomColor, type NoteColorName } from "../../src/lib/colors";

const isWeb = Platform.OS === "web";

// Only import BottomSheet on native
let BottomSheet: any = null;
let BottomSheetView: any = null;
if (!isWeb) {
  const bs = require("@gorhom/bottom-sheet");
  BottomSheet = bs.default;
  BottomSheetView = bs.BottomSheetView;
}

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const { notes, reminders, loadNotes, loadReminders, createNote } = useNoteStore();

  const bottomSheetRef = useRef<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [selectedColor, setSelectedColor] = useState<NoteColorName>("yellow");
  const [showVoice, setShowVoice] = useState(false);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterColor, setFilterColor] = useState<NoteColorName | null>(null);

  // AI transcription state
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [suggestedReminder, setSuggestedReminder] = useState<{
    date: Date;
    rawText: string;
  } | null>(null);
  const [reminderAccepted, setReminderAccepted] = useState(false);

  // Filtered notes (client-side, instant)
  const filteredNotes = useMemo(() => {
    let result = notes;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.content.toLowerCase().includes(q) ||
          (n.transcript && n.transcript.toLowerCase().includes(q))
      );
    }

    if (filterColor) {
      result = result.filter((n) => n.color === filterColor);
    }

    return result;
  }, [notes, searchQuery, filterColor]);

  const hasActiveFilter = searchQuery.trim().length > 0 || filterColor !== null;

  useFocusEffect(
    useCallback(() => {
      loadNotes();
      loadReminders();
    }, [])
  );

  const resetVoiceState = () => {
    setVoiceUri(null);
    setProcessingState("idle");
    setTranscript("");
    setSuggestedReminder(null);
    setReminderAccepted(false);
  };

  const openSheet = () => {
    setNewNoteText("");
    setSelectedColor(getRandomColor().name);
    setShowVoice(false);
    resetVoiceState();
    setIsSheetOpen(true);
    if (!isWeb) {
      bottomSheetRef.current?.expand();
      const Haptics = require("expo-haptics");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    if (!isWeb) {
      bottomSheetRef.current?.close();
    }
  };

  const handleSave = async () => {
    const text = newNoteText.trim();
    if (!text && !voiceUri) {
      if (isWeb) {
        alert("Lütfen bir şeyler yazın veya ses kaydedin.");
      } else {
        Alert.alert("Boş not", "Lütfen bir şeyler yazın veya ses kaydedin.");
      }
      return;
    }

    const type = voiceUri ? (text ? "mixed" : "voice") : "text";
    const reminderDate =
      reminderAccepted && suggestedReminder ? suggestedReminder.date : undefined;

    await createNote(
      text,
      type,
      selectedColor,
      voiceUri ?? undefined,
      transcript || undefined,
      reminderDate
    );
    closeSheet();
    if (!isWeb) {
      const Haptics = require("expo-haptics");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const processVoiceWithGemini = async (uri: string) => {
    setProcessingState("processing");

    try {
      const result: VoiceNoteResult = await transcribeAndExtract(uri);

      // Auto-fill the text input with extracted note content
      setNewNoteText(result.noteContent);
      setTranscript(result.transcript);

      // Set reminder suggestion if detected
      if (result.reminder) {
        setSuggestedReminder(result.reminder);
        setReminderAccepted(true); // Auto-accept by default
      }

      setProcessingState("done");

      if (!isWeb) {
        const Haptics = require("expo-haptics");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.warn("[OmmiNote] Gemini processing failed:", error);
      setProcessingState("error");
    }
  };

  const handleVoiceComplete = (uri: string) => {
    setVoiceUri(uri);
    setShowVoice(false);

    // Start AI processing immediately
    processVoiceWithGemini(uri);
  };

  const handleRetryProcessing = () => {
    if (voiceUri) {
      processVoiceWithGemini(voiceUri);
    }
  };

  const handleRemoveAudio = () => {
    resetVoiceState();
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Günaydın!";
    if (h < 18) return "İyi günler!";
    return "İyi akşamlar!";
  };

  // Shared create note form
  const renderCreateForm = () => (
    <>
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
          fontSize: 16,
          color: "#333",
          textAlignVertical: "top",
          minHeight: 120,
          lineHeight: 24,
        }}
        autoFocus={!isWeb}
      />

      {/* Voice processing status (replaces old simple badge) */}
      {voiceUri && (
        <TranscriptionStatus
          state={processingState}
          transcript={transcript}
          suggestedReminder={
            suggestedReminder && reminderAccepted ? suggestedReminder : null
          }
          onAcceptReminder={() => setReminderAccepted(true)}
          onDismissReminder={() => {
            setSuggestedReminder(null);
            setReminderAccepted(false);
          }}
          onRetry={handleRetryProcessing}
          onRemoveAudio={handleRemoveAudio}
        />
      )}

      {/* Dismissed reminder - show re-add option */}
      {suggestedReminder && !reminderAccepted && voiceUri && processingState === "done" && (
        <Pressable
          onPress={() => setReminderAccepted(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#F5F5F5",
            padding: 10,
            borderRadius: 12,
            marginBottom: 8,
          }}
        >
          <Ionicons name="alarm-outline" size={16} color="#737373" />
          <Text style={{ color: "#737373", fontSize: 13 }}>
            Hatırlatıcıyı tekrar ekle
          </Text>
        </Pressable>
      )}

      {/* Voice recorder */}
      {showVoice && !isWeb && (
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
          marginTop: 8,
        }}
      >
        {!isWeb ? (
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
        ) : (
          <Pressable
            onPress={closeSheet}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#F5F5F5",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <Ionicons name="close" size={20} color="#737373" />
            <Text style={{ color: "#737373", fontWeight: "500" }}>Vazgeç</Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleSave}
          disabled={processingState === "processing"}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor:
              processingState === "processing" ? "#93C5FD" : "#3B82F6",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 14,
            opacity: processingState === "processing" ? 0.7 : 1,
          }}
        >
          <Ionicons name="checkmark" size={20} color="white" />
          <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
            Kaydet
          </Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 12,
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

      {/* Search & Filter — sticky, always visible */}
      <View style={{ backgroundColor: "#FFFFFF", paddingBottom: 12 }}>
        <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <ColorFilter selected={filterColor} onSelect={setFilterColor} />
      </View>

      {/* Note list */}
      <FlatList
        data={filteredNotes}
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
          hasActiveFilter ? (
            <EmptyState
              icon="search-outline"
              title="Sonuç bulunamadı"
              description="Farklı bir arama terimi veya renk deneyin."
            />
          ) : (
            <EmptyState
              icon="create-outline"
              title="Henüz not yok"
              description="Aşağıdaki + butonuna tıklayarak ilk notunu oluştur!"
            />
          )
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
          zIndex: 10,
        }}
      >
        <Ionicons name="add" size={30} color="white" />
      </Pressable>

      {/* Web: Modal-based create form */}
      {isWeb && (
        <Modal
          visible={isSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={closeSheet}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "flex-end",
            }}
            onPress={closeSheet}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 24,
                maxHeight: "70%",
              }}
            >
              {/* Handle bar */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: "#D4D4D4",
                  borderRadius: 2,
                  alignSelf: "center",
                  marginBottom: 16,
                }}
              />
              <ScrollView>{renderCreateForm()}</ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Native: BottomSheet */}
      {!isWeb && BottomSheet && (
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={["55%", "80%"]}
          enablePanDownToClose
          onClose={() => setIsSheetOpen(false)}
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
              {renderCreateForm()}
            </KeyboardAvoidingView>
          </BottomSheetView>
        </BottomSheet>
      )}
    </View>
  );
}
