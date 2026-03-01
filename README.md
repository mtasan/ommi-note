# Asyra – AI Notes, Voice & Photos

A cross-platform voice-first note-taking app with AI-powered transcription, smart reminders, and offline-first storage.

Built with **React Native + Expo** for iOS, Android, and Web.

## Features

- **Voice Notes** — Record audio, auto-transcribed by Google Gemini 2.5 Flash
- **Smart Reminders** — AI detects time-based intent (e.g. "remind me at 9pm") and creates local push notifications automatically
- **Offline-First** — All notes stored locally in SQLite; works without internet
- **Color-Coded Notes** — 8 Google Keep-style colors for visual organization
- **Search & Filter** — Instant text search across notes and transcripts, filter by color
- **Multi-Language** — Turkish and English UI with automatic device language detection; Gemini prompts adapt per language
- **Secure API Proxy** — API keys never leave the server; all AI calls go through a Vercel serverless function

## Architecture

```
Mobile App (Expo)          Vercel Serverless           Google AI
┌──────────────┐          ┌──────────────────┐        ┌──────────┐
│ React Native │  HTTPS   │ api/transcribe   │  HTTPS │ Gemini   │
│ + SQLite     │ -------> │ + CORS + Rate    │ -----> │ 2.5      │
│ + expo-av    │ <------- │   Limiting       │ <----- │ Flash    │
│ + i18next    │   JSON   └──────────────────┘  JSON  └──────────┘
└──────────────┘
Key: API key stays server-side, never in the client bundle
     Language param sent with each request → correct prompt selected
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React Native 0.81 + Expo SDK 54 |
| **Routing** | Expo Router (file-based) |
| **State** | Zustand 5.x |
| **Database** | expo-sqlite + Drizzle ORM |
| **Audio** | expo-av (recording + playback) |
| **Notifications** | expo-notifications (local push) |
| **i18n** | i18next + react-i18next + expo-localization |
| **Styling** | NativeWind v4 (Tailwind for RN) |
| **AI / STT** | Google Gemini 2.5 Flash (multimodal) |
| **API Proxy** | Vercel Serverless Functions |
| **CI/CD** | GitHub push → Vercel auto-deploy |

## Project Structure

```
asyra/
├── app/                          # Screens (Expo Router file-based routing)
│   ├── _layout.tsx               # Root layout: DB init, notification permissions, i18n init
│   ├── (tabs)/
│   │   ├── index.tsx             # Notes list + search/filter + FAB + voice recording
│   │   └── reminders.tsx         # Reminders list (active + completed)
│   └── note/
│       └── [id].tsx              # Note detail: edit, audio playback, transcript
│
├── src/
│   ├── components/
│   │   ├── NoteCard.tsx          # Color-coded note card
│   │   ├── VoiceRecorder.tsx     # Microphone recording UI
│   │   ├── TranscriptionStatus.tsx  # AI processing spinner / result / error
│   │   ├── ReminderPicker.tsx    # Quick-pick + date/time picker
│   │   ├── ColorPicker.tsx       # 8-color circle selector
│   │   ├── SearchBar.tsx         # Search input with clear button
│   │   ├── ColorFilter.tsx       # Horizontal scrollable color chips
│   │   └── EmptyState.tsx        # Placeholder for empty lists
│   │
│   ├── i18n/                     # Internationalization
│   │   ├── index.ts              # i18next init + device language detection
│   │   ├── dateLocale.ts         # date-fns locale helper (TR/EN)
│   │   └── locales/
│   │       ├── tr.json           # Turkish translations (~85 keys)
│   │       └── en.json           # English translations (~85 keys)
│   │
│   ├── stores/
│   │   └── useNoteStore.ts       # Zustand store (notes + reminders CRUD)
│   │
│   ├── lib/
│   │   ├── database.ts           # SQLite connection + table creation (native)
│   │   ├── database.web.ts       # Web stub (returns null)
│   │   ├── schema.ts             # Drizzle ORM table schemas
│   │   ├── gemini.ts             # Vercel proxy client + retry logic
│   │   ├── notifications.ts      # Push notification scheduling
│   │   └── colors.ts             # 8-color palette + helpers
│   │
│   └── types/
│       └── note.ts               # Note & Reminder TypeScript types
│
├── api/
│   └── transcribe.ts             # Vercel Serverless: Gemini proxy + CORS + rate limit
│
├── vercel.json                   # Vercel config (30s timeout)
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── app.json                      # Expo config
```

## Getting Started

### Prerequisites

- Node.js >= 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator (Mac) or Android Emulator, or a physical device with [Expo Go](https://expo.dev/go)

### Installation

```bash
git clone https://github.com/mtasan/asyra.git
cd asyra
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```env
# Client-side (bundled into the app)
EXPO_PUBLIC_API_URL=https://asyra-app.vercel.app

# Server-side only (Vercel — never exposed to client)
GEMINI_API_KEY=your_gemini_api_key_here
```

For local development with `vercel dev`, the serverless function reads `GEMINI_API_KEY` from `.env` automatically.

### Running

```bash
# Start Expo dev server
npx expo start

# Platform-specific
npx expo start --ios
npx expo start --android
npx expo start --web
```

Scan the QR code with Expo Go on your phone for instant testing.

### Deploying

The project auto-deploys to Vercel on every push to `main`:

1. Push to GitHub → Vercel builds and deploys automatically
2. The serverless function at `api/transcribe.ts` becomes available at `/api/transcribe`
3. Set `GEMINI_API_KEY` in Vercel Dashboard → Settings → Environment Variables

## How It Works

### Voice Note Flow

```
1. User taps mic → expo-av records audio (.m4a)
2. Recording completes → audio converted to base64
3. POST to Vercel proxy → /api/transcribe
   Body: { audioBase64, mimeType, language: "tr"|"en" }
4. Serverless function:
   ├── CORS + rate limit + body size checks
   ├── Selects language-specific system prompt (TR or EN)
   ├── Injects current date/time into prompt
   └── Calls Gemini 2.5 Flash with audio
5. Gemini returns structured JSON:
   ├── transcript: full text transcription
   ├── noteContent: cleaned note (reminder parts removed)
   └── reminder: { dateISO, rawText } if detected
6. Client auto-fills note text + shows reminder badge
7. User saves → SQLite insert + notification scheduled
```

### Multi-Language (i18n)

- **Device detection**: `expo-localization` detects device language at startup
- **UI translations**: All 85+ strings served via `i18next` + `react-i18next` (`useTranslation` hook)
- **Date formatting**: `date-fns` locale switches automatically (TR/EN)
- **Gemini prompts**: Server selects language-specific system prompt based on `language` param
- **Fallback**: Non-TR devices default to English

### Security

- **API key isolation**: `GEMINI_API_KEY` exists only as a Vercel encrypted env var; never in the client bundle
- **CORS protection**: Origin whitelist for browser requests; native apps bypass CORS naturally
- **Rate limiting**: 2 requests/minute + 20 requests/hour per IP (in-memory, resets on cold start)
- **Body size limit**: 5MB maximum request size

### Database Schema

```sql
notes                          reminders
├── id         TEXT PK         ├── id          TEXT PK
├── content    TEXT             ├── note_id     TEXT FK → notes.id
├── type       TEXT             ├── remind_at   INTEGER (ms)
├── color      TEXT             ├── is_done     INTEGER (0/1)
├── audio_uri  TEXT?            └── created_at  INTEGER (ms)
├── transcript TEXT?
├── created_at INTEGER (ms)
└── updated_at INTEGER (ms)
```

## Color Palette

| Color | Background | Border |
|-------|-----------|--------|
| Yellow | `#FFF9C4` | `#FFF176` |
| Green | `#C8E6C9` | `#81C784` |
| Blue | `#BBDEFB` | `#64B5F6` |
| Purple | `#E1BEE7` | `#BA68C8` |
| Pink | `#F8BBD0` | `#F06292` |
| Orange | `#FFE0B2` | `#FFB74D` |
| Teal | `#B2DFDB` | `#4DB6AC` |
| Red | `#FFCDD2` | `#E57373` |

## Roadmap

- [ ] Cloud sync (Supabase) — cross-device note synchronization
- [ ] Photo notes — attach images to notes
- [ ] Offline queue — save voice recordings offline, process when connected
- [ ] Tags / categories
- [ ] EAS Build — App Store & Play Store distribution
- [ ] Dark mode

## License

Private project.
