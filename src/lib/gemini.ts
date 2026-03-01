import { Platform } from "react-native";

/**
 * API URL for the Vercel serverless proxy.
 * In production: your Vercel deployment URL
 * In dev: local Vercel dev server
 */
function getApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not set. Add it to your .env file."
    );
  }
  return url;
}

// Read audio file as base64 (native only)
async function readAudioAsBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    throw new Error("Audio file reading is not supported on web");
  }
  const FileSystem = require("expo-file-system");
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
}

// Determine MIME type from URI
function getAudioMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".m4a") || lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".mp3")) return "audio/mp3";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".3gp")) return "audio/3gpp";
  if (lower.endsWith(".caf")) return "audio/x-caf";
  // Default for expo-av HIGH_QUALITY on iOS
  return "audio/m4a";
}

export interface VoiceNoteResult {
  noteContent: string;
  transcript: string;
  reminder?: {
    date: Date;
    rawText: string;
  };
}

/**
 * Parse the proxy response into a VoiceNoteResult.
 * The proxy returns { noteContent, transcript, reminder?: { dateISO, rawText } }
 */
function parseProxyResponse(data: any): VoiceNoteResult {
  const result: VoiceNoteResult = {
    noteContent: data.noteContent || "",
    transcript: data.transcript || "",
  };

  if (data.reminder?.dateISO) {
    const reminderDate = new Date(data.reminder.dateISO);
    if (reminderDate.getTime() > Date.now()) {
      result.reminder = {
        date: reminderDate,
        rawText: data.reminder.rawText || "Hatırlatıcı",
      };
    }
  }

  return result;
}

/**
 * Transcribe audio and extract intent via the Vercel proxy.
 * Audio is read as base64 on the client and sent to the proxy,
 * which calls Gemini with the server-side API key.
 */
export async function transcribeAndExtract(
  audioUri: string
): Promise<VoiceNoteResult> {
  const apiUrl = getApiUrl();
  const base64Audio = await readAudioAsBase64(audioUri);
  const mimeType = getAudioMimeType(audioUri);

  const response = await fetch(`${apiUrl}/api/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audioBase64: base64Audio,
      mimeType,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Transcription failed (${response.status}): ${errorData.error || "Unknown error"}`
    );
  }

  const data = await response.json();
  return parseProxyResponse(data);
}

/**
 * Extract intent from text only (web fallback or manual text processing).
 * Sends text to the proxy for AI processing.
 */
export async function extractIntentFromText(
  text: string
): Promise<VoiceNoteResult> {
  const apiUrl = getApiUrl();

  const response = await fetch(`${apiUrl}/api/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Intent extraction failed (${response.status}): ${errorData.error || "Unknown error"}`
    );
  }

  const data = await response.json();
  return parseProxyResponse(data);
}
