import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { NOTE_COLORS, type NoteColorName } from "../lib/colors";

interface ColorFilterProps {
  selected: NoteColorName | null;
  onSelect: (color: NoteColorName | null) => void;
}

export function ColorFilter({ selected, onSelect }: ColorFilterProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 20,
        gap: 8,
        alignItems: "center",
      }}
    >
      {/* "All" chip */}
      <Pressable
        onPress={() => onSelect(null)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: selected === null ? "#262626" : "#F5F5F5",
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 20,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: selected === null ? "#FFFFFF" : "#737373",
          }}
        >
          {t("search.all")}
        </Text>
      </Pressable>

      {/* Status chips */}
      {NOTE_COLORS.map((color) => {
        const isActive = selected === color.name;
        return (
          <Pressable
            key={color.name}
            onPress={() => onSelect(isActive ? null : color.name)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: isActive ? color.bg : "#F5F5F5",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: isActive ? 1.5 : 0,
              borderColor: isActive ? color.border : "transparent",
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
                fontWeight: "600",
                color: isActive ? "#333" : "#737373",
              }}
            >
              {t(`colors.${color.name}`)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
