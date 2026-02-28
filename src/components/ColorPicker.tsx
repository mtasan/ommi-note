import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NOTE_COLORS, type NoteColorName } from "../lib/colors";

interface ColorPickerProps {
  selected: NoteColorName;
  onSelect: (color: NoteColorName) => void;
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
      {NOTE_COLORS.map((color) => (
        <Pressable
          key={color.name}
          onPress={() => onSelect(color.name)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: color.bg,
            borderWidth: 2,
            borderColor: selected === color.name ? color.border : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selected === color.name && (
            <Ionicons name="checkmark" size={18} color="#333" />
          )}
        </Pressable>
      ))}
    </View>
  );
}
