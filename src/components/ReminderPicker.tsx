import { useState } from "react";
import { View, Text, Pressable, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const isWeb = Platform.OS === "web";

// Only import DateTimePicker on native
let DateTimePicker: any = null;
if (!isWeb) {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
}

interface ReminderPickerProps {
  onSchedule: (date: Date) => void;
  onCancel: () => void;
}

type QuickOption = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  getDate: () => Date;
};

const QUICK_OPTIONS: QuickOption[] = [
  {
    label: "30 dk sonra",
    icon: "timer-outline",
    getDate: () => new Date(Date.now() + 30 * 60 * 1000),
  },
  {
    label: "1 saat sonra",
    icon: "time-outline",
    getDate: () => new Date(Date.now() + 60 * 60 * 1000),
  },
  {
    label: "3 saat sonra",
    icon: "hourglass-outline",
    getDate: () => new Date(Date.now() + 3 * 60 * 60 * 1000),
  },
  {
    label: "Yarın 09:00",
    icon: "sunny-outline",
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    label: "1 gün sonra",
    icon: "calendar-outline",
    getDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  {
    label: "1 hafta sonra",
    icon: "calendar-number-outline",
    getDate: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
];

export function ReminderPicker({ onSchedule, onCancel }: ReminderPickerProps) {
  const [selectedDate, setSelectedDate] = useState(
    new Date(Date.now() + 60 * 60 * 1000)
  );
  const [showPicker, setShowPicker] = useState(false);

  const handleQuickOption = (opt: QuickOption) => {
    onSchedule(opt.getDate());
  };

  const handleDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleConfirmCustom = () => {
    if (selectedDate.getTime() <= Date.now()) {
      if (isWeb) {
        alert("Hatırlatma zamanı gelecekte olmalı.");
      } else {
        Alert.alert("Hata", "Hatırlatma zamanı gelecekte olmalı.");
      }
      return;
    }
    onSchedule(selectedDate);
  };

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="alarm" size={22} color="#3B82F6" />
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#262626" }}>
            Hatırlatıcı Ekle
          </Text>
        </View>
        <Pressable
          onPress={onCancel}
          style={{
            padding: 6,
            backgroundColor: "#F5F5F5",
            borderRadius: 10,
          }}
        >
          <Ionicons name="close" size={20} color="#737373" />
        </Pressable>
      </View>

      {/* Quick options */}
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: "#A3A3A3",
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        Hızlı Seçenekler
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {QUICK_OPTIONS.map((opt) => (
          <Pressable
            key={opt.label}
            onPress={() => handleQuickOption(opt)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#EFF6FF",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#DBEAFE",
            }}
          >
            <Ionicons name={opt.icon} size={16} color="#2563EB" />
            <Text style={{ fontSize: 13, color: "#2563EB", fontWeight: "600" }}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Custom date/time */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: "#F5F5F5",
          paddingTop: 16,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: "#A3A3A3",
            marginBottom: 10,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Özel Tarih/Saat
        </Text>

        <Pressable
          onPress={() => setShowPicker(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: "#FAFAFA",
            padding: 14,
            borderRadius: 14,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#E5E5E5",
          }}
        >
          <Ionicons name="calendar" size={20} color="#3B82F6" />
          <Text style={{ fontSize: 15, color: "#404040", flex: 1 }}>
            {format(selectedDate, "d MMMM yyyy, HH:mm", { locale: tr })}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#A3A3A3" />
        </Pressable>

        {showPicker && !isWeb && DateTimePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="datetime"
            display="spinner"
            onChange={handleDateChange}
            minimumDate={new Date()}
            locale="tr"
          />
        )}

        {/* Web fallback: simple date/time inputs */}
        {showPicker && isWeb && (
          <View style={{ marginBottom: 12 }}>
            <input
              type="datetime-local"
              value={format(selectedDate, "yyyy-MM-dd'T'HH:mm")}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              onChange={(e: any) => {
                const val = e.target?.value;
                if (val) setSelectedDate(new Date(val));
              }}
              style={{
                width: "100%",
                padding: 12,
                fontSize: 16,
                borderRadius: 12,
                border: "1px solid #E5E5E5",
                backgroundColor: "#FAFAFA",
              }}
            />
          </View>
        )}

        <Pressable
          onPress={handleConfirmCustom}
          style={{
            backgroundColor: "#3B82F6",
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Ionicons name="alarm" size={18} color="white" />
          <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
            Hatırlatıcı Ayarla
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
