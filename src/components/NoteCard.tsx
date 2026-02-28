import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Ionicons } from "@expo/vector-icons";
import { getColorByName } from "../lib/colors";
import type { Note } from "../types/note";

interface NoteCardProps {
  note: Note;
  hasReminder?: boolean;
}

export function NoteCard({ note, hasReminder }: NoteCardProps) {
  const router = useRouter();
  const color = getColorByName(note.color);

  const preview =
    note.content.length > 100 ? note.content.slice(0, 100) + "..." : note.content;

  return (
    <Pressable
      onPress={() => router.push(`/note/${note.id}`)}
      style={{
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {note.type === "voice" ? (
            <Ionicons name="mic" size={14} color="#666" />
          ) : note.type === "mixed" ? (
            <Ionicons name="mic-outline" size={14} color="#666" />
          ) : (
            <Ionicons name="document-text-outline" size={14} color="#666" />
          )}
          <Text style={{ fontSize: 11, color: "#888" }}>
            {format(new Date(note.createdAt), "d MMM", { locale: tr })}
          </Text>
        </View>
        {hasReminder && (
          <View style={{ backgroundColor: "rgba(255,255,255,0.6)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
            <Ionicons name="alarm" size={13} color="#E65100" />
          </View>
        )}
      </View>

      {/* Content */}
      <Text style={{ fontSize: 15, color: "#333", lineHeight: 22 }} numberOfLines={4}>
        {preview || (note.transcript ? note.transcript : "Sesli not")}
      </Text>

      {/* Voice badge */}
      {note.type === "voice" && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
          <Ionicons name="play-circle" size={20} color="#1976D2" />
          <Text style={{ fontSize: 12, color: "#1976D2", fontWeight: "500" }}>Sesli not</Text>
        </View>
      )}
    </Pressable>
  );
}
