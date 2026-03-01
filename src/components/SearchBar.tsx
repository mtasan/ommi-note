import { View, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function SearchBar({ value, onChangeText }: SearchBarProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F5F5",
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 44,
        gap: 10,
      }}
    >
      <Ionicons name="search-outline" size={20} color="#A3A3A3" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Notlarda ara..."
        placeholderTextColor="#A3A3A3"
        style={{
          flex: 1,
          fontSize: 15,
          color: "#333",
          paddingVertical: 0,
        }}
        returnKeyType="search"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText("")} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color="#A3A3A3" />
        </Pressable>
      )}
    </View>
  );
}
