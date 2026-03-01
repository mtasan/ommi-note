import { Platform } from "react-native";

/**
 * API URL for the Vercel serverless proxy.
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
  // expo-file-system v19 (SDK 54) moved to new API structure
  // Try legacy import first, then new API
  try {
    const FileSystem = require("expo-file-system/legacy");
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch {
    // Fallback: use the new expo-file-system API
    const { readAsStringAsync, EncodingType } = require("expo-file-system");
    const base64 = await readAsStringAsync(uri, {
      encoding: EncodingType.Base64,
    });
    return base64;
  }
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
 * Fetch with automatic retry on 429/502/503 errors.
 * Retries up to maxRetries times with exponential backoff.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Retry on rate limit or server errors
      if (
        (response.status === 429 || response.status === 502 || response.status === 503) &&
        attempt < maxRetries
      ) {
        const data = await response.json().catch(() => ({}));
        const retryAfter = data.retryAfter || Math.pow(2, attempt + 1);
        const waitMs = retryAfter * 1000;

        console.log(
          `[OmmiNote] Retry ${attempt + 1}/${maxRetries} after ${retryAfter}s (status: ${response.status})`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      return response;
    } catch (err: any) {
      lastError = err;
      // Network error — retry with backoff
      if (attempt < maxRetries) {
        const waitMs = Math.pow(2, attempt + 1) * 1000;
        console.log(
          `[OmmiNote] Network error, retry ${attempt + 1}/${maxRetries} after ${waitMs / 1000}s`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
    }
  }

  throw lastError || new Error("Request failed after retries");
}

/**
 * User-friendly error message from API response.
 */
function getUserMessage(status: number, errorData: any): string {
  switch (status) {
    case 429:
      return "Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.";
    case 413:
      return "Ses kaydı çok büyük. Daha kısa bir kayıt deneyin.";
    case 502:
      return "AI servisi şu an yanıt vermiyor. Tekrar deneniyor...";
    case 503:
      return "Servis geçici olarak kullanılamıyor. Lütfen biraz bekleyin.";
    default:
      return errorData?.error || "Bir hata oluştu. Lütfen tekrar deneyin.";
  }
}

/**
 * Transcribe audio and extract intent via the Vercel proxy.
 * Includes automatic retry on transient errors.
 */
export async function transcribeAndExtract(
  audioUri: string
): Promise<VoiceNoteResult> {
  const apiUrl = getApiUrl();
  const base64Audio = await readAudioAsBase64(audioUri);
  const mimeType = getAudioMimeType(audioUri);

  const response = await fetchWithRetry(`${apiUrl}/api/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64: base64Audio, mimeType }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = getUserMessage(response.status, errorData);
    throw new Error(message);
  }

  const data = await response.json();
  return parseProxyResponse(data);
}

/**
 * Extract intent from text only (web fallback).
 * Includes automatic retry on transient errors.
 */
export async function extractIntentFromText(
  text: string
): Promise<VoiceNoteResult> {
  const apiUrl = getApiUrl();

  const response = await fetchWithRetry(`${apiUrl}/api/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = getUserMessage(response.status, errorData);
    throw new Error(message);
  }

  const data = await response.json();
  return parseProxyResponse(data);
}
