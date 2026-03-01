import type { VercelRequest, VercelResponse } from "@vercel/node";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Allowed origins — add your production domains here
const ALLOWED_ORIGINS = [
  "https://asyra-app.vercel.app",
  "http://localhost:3000",
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:19006", // Expo web default
];

// Max request body size: 5MB
const MAX_BODY_SIZE = 5 * 1024 * 1024;

// Rate limiting: 2 per minute AND 20 per hour (per IP, resets on cold start)
const minuteMap = new Map<string, { count: number; resetAt: number }>();
const hourMap = new Map<string, { count: number; resetAt: number }>();
const MINUTE_WINDOW = 60 * 1000;
const MINUTE_MAX = 2;
const HOUR_WINDOW = 60 * 60 * 1000;
const HOUR_MAX = 20;

function isRateLimited(ip: string): { limited: boolean; retryAfter: number } {
  const now = Date.now();

  // Check minute limit
  const mEntry = minuteMap.get(ip);
  if (!mEntry || now > mEntry.resetAt) {
    minuteMap.set(ip, { count: 1, resetAt: now + MINUTE_WINDOW });
  } else {
    mEntry.count++;
    if (mEntry.count > MINUTE_MAX) {
      const wait = Math.ceil((mEntry.resetAt - now) / 1000);
      return { limited: true, retryAfter: wait };
    }
  }

  // Check hour limit
  const hEntry = hourMap.get(ip);
  if (!hEntry || now > hEntry.resetAt) {
    hourMap.set(ip, { count: 1, resetAt: now + HOUR_WINDOW });
  } else {
    hEntry.count++;
    if (hEntry.count > HOUR_MAX) {
      const wait = Math.ceil((hEntry.resetAt - now) / 1000);
      return { limited: true, retryAfter: wait };
    }
  }

  return { limited: false, retryAfter: 0 };
}

function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || "";

  // Mobile apps (React Native) don't send origin header — allow them
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  } else {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0]);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

// Multi-language system prompts
const SYSTEM_PROMPTS: Record<string, string> = {
  tr: `Sen bir ses notu asistanısın. Kullanıcı Türkçe sesli not bırakıyor.
Görevin:
1. Sesi metne dönüştür (transkript).
2. Not içeriğini çıkar — hatırlatıcı ile ilgili kısımları temizle.
3. Eğer kullanıcı bir hatırlatıcı istiyorsa (örn: "yarın hatırlat", "akşam 9'da hatırlat", "1 saat sonra hatırlat") bunu tespit et.

BUGÜNÜN TARİHİ: {{TODAY}}

JSON formatında yanıt ver, başka hiçbir şey yazma:
{
  "transcript": "Tam transkript metni",
  "noteContent": "Temizlenmiş not içeriği (hatırlatıcı kısımları hariç)",
  "hasReminder": true/false,
  "reminderDateISO": "ISO 8601 formatında tarih veya null",
  "reminderRawText": "Hatırlatıcı ile ilgili orijinal metin veya null"
}

Örnekler:
- "Serkan abiye Agentic AI platformu ile ilgili dönüş yapacağım akşam 21:00'de hatırlatma koy"
  → noteContent: "Serkan abiye Agentic AI platformu ile ilgili dönüş yapacağım"
  → hasReminder: true, reminderDateISO: "{{TODAY_DATE}}T21:00:00"

- "Marketten süt al"
  → noteContent: "Marketten süt al"
  → hasReminder: false

- "Yarın sabah 9'da toplantı var bunu hatırlat"
  → noteContent: "Yarın sabah 9'da toplantı var"
  → hasReminder: true, reminderDateISO: "{{TOMORROW_DATE}}T09:00:00"

- "1 saat sonra bana hatırlat ilaçlarımı içmem lazım"
  → noteContent: "İlaçlarımı içmem lazım"
  → hasReminder: true, reminderDateISO: "{{ONE_HOUR_LATER}}"`,

  en: `You are a voice note assistant. The user is leaving voice notes in English.
Your tasks:
1. Transcribe the audio to text (transcript).
2. Extract the note content — remove any reminder-related parts.
3. If the user requests a reminder (e.g., "remind me tomorrow", "remind me at 9pm", "remind me in 1 hour"), detect it.

TODAY'S DATE: {{TODAY}}

Respond in JSON format only, nothing else:
{
  "transcript": "Full transcript text",
  "noteContent": "Cleaned note content (excluding reminder parts)",
  "hasReminder": true/false,
  "reminderDateISO": "ISO 8601 date or null",
  "reminderRawText": "Original reminder-related text or null"
}

Examples:
- "I need to call John about the project proposal, remind me at 9pm"
  → noteContent: "I need to call John about the project proposal"
  → hasReminder: true, reminderDateISO: "{{TODAY_DATE}}T21:00:00"

- "Buy milk from the store"
  → noteContent: "Buy milk from the store"
  → hasReminder: false

- "Meeting tomorrow at 9am, remind me about it"
  → noteContent: "Meeting tomorrow at 9am"
  → hasReminder: true, reminderDateISO: "{{TOMORROW_DATE}}T09:00:00"

- "Remind me in 1 hour to take my medicine"
  → noteContent: "Take my medicine"
  → hasReminder: true, reminderDateISO: "{{ONE_HOUR_LATER}}"`,
};

function buildPrompt(language: string): string {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const template = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS["en"];
  const locale = language === "tr" ? "tr-TR" : "en-US";

  return template
    .replace("{{TODAY}}", now.toLocaleString(locale))
    .replace(/\{\{TODAY_DATE\}\}/g, today)
    .replace(/\{\{TOMORROW_DATE\}\}/g, tomorrow)
    .replace(/\{\{ONE_HOUR_LATER\}\}/g, oneHourLater);
}

function parseGeminiResponse(text: string) {
  let jsonStr = text.trim();

  // Remove markdown code block if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  const result: {
    noteContent: string;
    transcript: string;
    reminder?: { dateISO: string; rawText: string };
  } = {
    noteContent: parsed.noteContent || parsed.transcript || "",
    transcript: parsed.transcript || "",
  };

  if (parsed.hasReminder && parsed.reminderDateISO) {
    const reminderDate = new Date(parsed.reminderDateISO);
    if (reminderDate.getTime() > Date.now()) {
      result.reminder = {
        dateISO: parsed.reminderDateISO,
        rawText: parsed.reminderRawText || "Reminder",
      };
    }
  }

  return result;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers for all responses
  setCorsHeaders(req, res);

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limiting
  const clientIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const rateCheck = isRateLimited(clientIp);
  if (rateCheck.limited) {
    return res.status(429).json({
      error: "Too many requests",
      retryAfter: rateCheck.retryAfter,
    });
  }

  // Request size check
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > MAX_BODY_SIZE) {
    return res.status(413).json({ error: "Request too large (max 5MB)" });
  }

  // Get API key from server environment (NOT exposed to client)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in environment variables");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const { audioBase64, mimeType, text, language } = req.body;

    if (!audioBase64 && !text) {
      return res
        .status(400)
        .json({ error: "Either audioBase64 or text is required" });
    }

    // Use client language or default to English
    const lang = language || "en";
    const prompt = buildPrompt(lang);
    const userSaidPrefix = lang === "tr" ? "Kullanıcının söylediği" : "User said";

    // Build Gemini request
    const parts: any[] = [];

    if (text) {
      // Text-only mode
      parts.push({
        text: `${prompt}\n\n${userSaidPrefix}: "${text}"`,
      });
    } else {
      // Audio mode
      parts.push({ text: prompt });
      parts.push({
        inlineData: {
          mimeType: mimeType || "audio/m4a",
          data: audioBase64,
        },
      });
    }

    const geminiBody = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    };

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error(
        `Gemini API error (${geminiRes.status}):`,
        errorText.slice(0, 500)
      );
      return res.status(502).json({
        error: "AI processing failed",
        status: geminiRes.status,
        retryAfter: geminiRes.status === 429 ? 60 : undefined,
        detail:
          geminiRes.status === 429
            ? "Gemini rate limit exceeded. Please try again in a minute."
            : errorText.slice(0, 200),
      });
    }

    const data = await geminiRes.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return res.status(502).json({ error: "AI returned empty response" });
    }

    const result = parseGeminiResponse(candidateText);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Transcribe error:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
