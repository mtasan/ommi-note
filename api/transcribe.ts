import type { VercelRequest, VercelResponse } from "@vercel/node";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SYSTEM_PROMPT = `Sen bir ses notu asistanısın. Kullanıcı Türkçe sesli not bırakıyor.
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
  → hasReminder: true, reminderDateISO: "{{ONE_HOUR_LATER}}"`;

function buildPrompt(): string {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  return SYSTEM_PROMPT.replace("{{TODAY}}", now.toLocaleString("tr-TR"))
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
        rawText: parsed.reminderRawText || "Hatırlatıcı",
      };
    }
  }

  return result;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get API key from server environment (NOT exposed to client)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in environment variables");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const { audioBase64, mimeType, text } = req.body;

    if (!audioBase64 && !text) {
      return res
        .status(400)
        .json({ error: "Either audioBase64 or text is required" });
    }

    const prompt = buildPrompt();

    // Build Gemini request
    const parts: any[] = [];

    if (text) {
      // Text-only mode
      parts.push({
        text: `${prompt}\n\nKullanıcının söylediği: "${text}"`,
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
      console.error(`Gemini API error (${geminiRes.status}):`, errorText.slice(0, 500));
      return res
        .status(502)
        .json({
          error: "AI processing failed",
          status: geminiRes.status,
          detail: geminiRes.status === 429
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
