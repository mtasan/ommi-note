import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { NOTE_COLORS, type NoteColorName } from "../lib/colors";

interface ColorPickerProps {
  selected: NoteColorName;
  onSelect: (color: NoteColorName) => void;
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  const { t } = useTranslation();

  return (
    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
      {NOTE_COLORS.map((color) => {
        const isActive = selected === color.name;
        return (
          <Pressable
            key={color.name}
            onPress={() => onSelect(color.name)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: isActive ? color.bg : "#F5F5F5",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: isActive ? 1.5 : 1,
              borderColor: isActive ? color.border : "#E5E5E5",
            }}
          >
            <Ionicons
              name={color.icon as any}
              size={16}
              color={isActive ? color.border : "#999"}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: isActive ? "600" : "400",
                color: isActive ? "#333" : "#737373",
              }}
            >
              {t(`colors.${color.name}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
