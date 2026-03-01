import { View, Text, Pressable, ScrollView } from "react-native";
import { NOTE_COLORS, type NoteColorName } from "../lib/colors";

interface ColorFilterProps {
  selected: NoteColorName | null;
  onSelect: (color: NoteColorName | null) => void;
}

export function ColorFilter({ selected, onSelect }: ColorFilterProps) {
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
          Tümü
        </Text>
      </Pressable>

      {/* Color chips */}
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
              paddingHorizontal: isActive ? 12 : 10,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: isActive ? 1.5 : 0,
              borderColor: isActive ? color.border : "transparent",
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: color.bg,
                borderWidth: 1.5,
                borderColor: color.border,
              }}
            />
            {isActive && (
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#333",
                }}
              >
                {color.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
