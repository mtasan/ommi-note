import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Ionicons name={icon} size={64} color="#D4D4D4" />
      <Text className="text-lg font-semibold text-surface-400 mt-4 text-center">
        {title}
      </Text>
      <Text className="text-sm text-surface-300 mt-2 text-center leading-5">
        {description}
      </Text>
    </View>
  );
}
