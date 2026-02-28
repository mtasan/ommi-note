import { useState, useRef } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string) => void;
}

export function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("İzin Gerekli", "Sesli not için mikrofon izni gerekli.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setDuration(0);

      intervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      Alert.alert("Hata", "Ses kaydı başlatılamadı.");
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      setDuration(0);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (uri) {
        onRecordingComplete(uri);
      }
    } catch (err) {
      Alert.alert("Hata", "Ses kaydı durdurulamadı.");
    }
  };

  return (
    <View className="items-center">
      {isRecording && (
        <View className="mb-3 items-center">
          <View className="flex-row items-center gap-2">
            <View className="w-3 h-3 rounded-full bg-red-500" />
            <Text className="text-lg font-semibold text-surface-800">
              {formatDuration(duration)}
            </Text>
          </View>
          <Text className="text-xs text-surface-400 mt-1">Kayıt yapılıyor...</Text>
        </View>
      )}

      <Pressable
        onPress={isRecording ? stopRecording : startRecording}
        className={`w-16 h-16 rounded-full items-center justify-center ${
          isRecording ? "bg-red-500" : "bg-primary-500"
        } active:opacity-80`}
      >
        <Ionicons
          name={isRecording ? "stop" : "mic"}
          size={28}
          color="white"
        />
      </Pressable>

      <Text className="text-xs text-surface-400 mt-2">
        {isRecording ? "Durdurmak için dokun" : "Sesli not kaydet"}
      </Text>
    </View>
  );
}
