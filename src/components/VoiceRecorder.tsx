import { useState, useRef } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string) => void;
}

export function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const { t } = useTranslation();
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
        Alert.alert(t("alerts.permissionTitle"), t("alerts.permissionMessage"));
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
    } catch (err: any) {
      console.error("[VoiceRecorder] startRecording error:", err);
      Alert.alert(t("alerts.errorTitle"), `${t("alerts.recordStartError")}: ${err?.message || t("errors.unknownError")}`);
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
    } catch (err: any) {
      console.error("[VoiceRecorder] stopRecording error:", err);
      Alert.alert(t("alerts.errorTitle"), `${t("alerts.recordStopError")}: ${err?.message || t("errors.unknownError")}`);
    }
  };

  return (
    <View style={{ alignItems: "center" }}>
      {isRecording && (
        <View style={{ marginBottom: 12, alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: "#EF4444",
              }}
            />
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#262626" }}>
              {formatDuration(duration)}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: "#A3A3A3", marginTop: 4 }}>
            {t("voice.recording")}
          </Text>
        </View>
      )}

      <Pressable
        onPress={isRecording ? stopRecording : startRecording}
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isRecording ? "#EF4444" : "#3B82F6",
        }}
      >
        <Ionicons
          name={isRecording ? "stop" : "mic"}
          size={28}
          color="white"
        />
      </Pressable>

      <Text style={{ fontSize: 12, color: "#A3A3A3", marginTop: 8 }}>
        {isRecording ? t("voice.stopTouch") : t("voice.recordNote")}
      </Text>
    </View>
  );
}
