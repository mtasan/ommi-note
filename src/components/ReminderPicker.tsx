import { useState } from "react";
import { View, Text, Pressable, Alert, Platform } from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface ReminderPickerProps {
  onSchedule: (date: Date) => void;
  onCancel: () => void;
}

const QUICK_OPTIONS = [
  { label: "30 dk", minutes: 30 },
  { label: "1 saat", minutes: 60 },
  { label: "3 saat", minutes: 180 },
  { label: "Yarın 09:00", minutes: -1 },
];

function getTomorrowAt9() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

export function ReminderPicker({ onSchedule, onCancel }: ReminderPickerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [showPicker, setShowPicker] = useState(false);

  const handleQuickOption = (minutes: number) => {
    if (minutes === -1) {
      onSchedule(getTomorrowAt9());
    } else {
      onSchedule(new Date(Date.now() + minutes * 60 * 1000));
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleConfirmCustom = () => {
    if (selectedDate.getTime() <= Date.now()) {
      Alert.alert("Hata", "Hatırlatma zamanı gelecekte olmalı.");
      return;
    }
    onSchedule(selectedDate);
  };

  return (
    <View className="bg-white rounded-2xl p-4 shadow-lg border border-surface-100">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-semibold text-surface-800">Hatırlatıcı Ekle</Text>
        <Pressable onPress={onCancel} className="p-1">
          <Ionicons name="close" size={22} color="#737373" />
        </Pressable>
      </View>

      <Text className="text-sm text-surface-500 mb-3">Hızlı Seçenekler</Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {QUICK_OPTIONS.map((opt) => (
          <Pressable
            key={opt.label}
            onPress={() => handleQuickOption(opt.minutes)}
            className="bg-primary-50 px-4 py-2 rounded-full active:bg-primary-100"
          >
            <Text className="text-sm text-primary-600 font-medium">{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      <View className="border-t border-surface-100 pt-4">
        <Text className="text-sm text-surface-500 mb-3">Özel Tarih/Saat</Text>

        <Pressable
          onPress={() => setShowPicker(true)}
          className="flex-row items-center gap-2 bg-surface-50 p-3 rounded-xl mb-3"
        >
          <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
          <Text className="text-base text-surface-700">
            {format(selectedDate, "d MMMM yyyy, HH:mm", { locale: tr })}
          </Text>
        </Pressable>

        {showPicker && (
          <DateTimePicker
            value={selectedDate}
            mode="datetime"
            display="spinner"
            onChange={handleDateChange}
            minimumDate={new Date()}
            locale="tr"
          />
        )}

        <Pressable
          onPress={handleConfirmCustom}
          className="bg-primary-500 py-3 rounded-xl items-center active:bg-primary-600"
        >
          <Text className="text-white font-semibold">Hatırlatıcı Ayarla</Text>
        </Pressable>
      </View>
    </View>
  );
}
