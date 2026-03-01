# OmmiNote - Architecture

Bu belge OmmiNote uygulamasinin mimari yapisini, deploy topolojisini, veri akislarini ve tasarim kararlarini detaylandirir.

---

## Deploy Topolojisi

```
┌─────────────────────────────────────────────────────────────────┐
│                        KULLANICI CIHAZI                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              OmmiNote Mobile App                           │  │
│  │          (React Native + Expo SDK 55)                      │  │
│  │                                                           │  │
│  │  Platform: iOS / Android / Web                            │  │
│  │  Dağıtım: Expo Go (dev) / EAS Build (prod)               │  │
│  │  Veri:    SQLite (yerel, offline-first)                   │  │
│  │  Ses:     expo-av (kayıt + oynatma)                       │  │
│  │  Bildirim: expo-notifications (local push)                │  │
│  └──────────────────────┬────────────────────────────────────┘  │
│                         │ HTTPS (base64 audio veya text)        │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     VERCEL EDGE NETWORK                          │
│                  https://ommi-note.vercel.app                    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │            api/transcribe.ts (Serverless Function)         │  │
│  │                                                           │  │
│  │  POST /api/transcribe                                     │  │
│  │                                                           │  │
│  │  Güvenlik:                                                │  │
│  │  ├── CORS (izinli origin whitelist)                       │  │
│  │  ├── Rate Limiting (2/dk + 20/saat, IP başına)            │  │
│  │  ├── Body size limit (5MB)                                │  │
│  │  └── API key sunucuda (GEMINI_API_KEY env var)            │  │
│  │                                                           │  │
│  │  İşlev:                                                   │  │
│  │  ├── Türkçe prompt oluşturma (tarih inject)               │  │
│  │  ├── Gemini API çağrısı (audio veya text)                 │  │
│  │  └── JSON response parse + client'a dönüş                 │  │
│  └──────────────────────┬────────────────────────────────────┘  │
│                         │                                       │
│  Deploy: GitHub push → otomatik build & deploy                  │
│  Repo:   github.com/mtasan/ommi-note (main branch)             │
│  Config: vercel.json (maxDuration: 30s)                         │
└─────────────────────────┼───────────────────────────────────────┘
                          │ HTTPS (API key server-side)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GOOGLE GEMINI API                              │
│          generativelanguage.googleapis.com                        │
│                                                                 │
│  Model: gemini-2.5-flash                                        │
│  Mod:   Multimodal (audio + text → structured JSON)             │
│  Ücret: Pay-as-you-go (~$0.001/istek)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Veri Akışı: Sesli Not Oluşturma (Uçtan Uca)

```
📱 Kullanıcı mikrofona konuşur
      │
      ▼
[expo-av] Ses kaydı → .m4a dosyası (cihaz cache)
      │
      ▼
[expo-file-system] Dosyayı base64'e çevir
      │
      ▼
[src/lib/gemini.ts] POST → https://ommi-note.vercel.app/api/transcribe
      │                     Body: { audioBase64, mimeType }
      │                     (retry: 2x exponential backoff on 429/502/503)
      │
      ▼
[api/transcribe.ts] CORS check → Rate limit check → Body size check
      │
      ▼
[api/transcribe.ts] Prompt oluştur (bugünün tarihi inject) → Gemini API çağır
      │
      ▼
[Gemini 2.5 Flash] Audio transkript + intent extraction
      │
      ▼
[api/transcribe.ts] JSON parse → { noteContent, transcript, reminder? }
      │
      ▼
📱 Client auto-fill:
      ├── noteContent → TextInput'a yazılır
      ├── transcript  → Kayıt altında saklanır
      └── reminder?   → "Hatırlatıcı tespit edildi" badge gösterilir
             │
             ▼
      Kullanıcı "Kaydet" → createNote(text, type, color, audioUri, transcript, reminderDate)
             │
             ├── SQLite INSERT (notes tablosu)
             ├── [Hatırlatıcı varsa] SQLite INSERT (reminders) + expo-notifications schedule
             └── Zustand state güncelle → UI re-render
```

---

## Mimari Genel Bakis

```
┌──────────────────────────────────────────────────────────────┐
│                    OmmiNote Mobile App                        │
│                  (React Native + Expo)                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Presentation Layer                     │ │
│  │                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │ │
│  │  │   Notes Tab  │  │ Reminders Tab│  │ Note Detail  │  │ │
│  │  │  (index.tsx) │  │(reminders.tsx│  │  ([id].tsx)  │  │ │
│  │  │              │  │              │  │              │  │ │
│  │  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │  │ │
│  │  │ │ NoteCard │ │  │ │ Reminder │ │  │ │  Editor  │ │  │ │
│  │  │ │ FAB      │ │  │ │ List     │ │  │ │  Player  │ │  │ │
│  │  │ │ BottomSht│ │  │ │ Checkbox │ │  │ │  Reminder│ │  │ │
│  │  │ │Transcript│ │  │ └──────────┘ │  │ │Transcript│ │  │ │
│  │  │ └──────────┘ │  │              │  │ └──────────┘ │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                                │
│                              ▼                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    State Layer (Zustand)                  │ │
│  │                                                         │ │
│  │  useNoteStore                                           │ │
│  │  ├── notes: Note[]                                      │ │
│  │  ├── reminders: Reminder[]                              │ │
│  │  ├── loadNotes() / loadReminders()                      │ │
│  │  ├── createNote(..., reminderDate?) → auto-reminder     │ │
│  │  ├── updateNote() / deleteNote()                        │ │
│  │  └── addReminder() / completeReminder()                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                                │
│                              ▼                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Data Layer                            │ │
│  │                                                         │ │
│  │  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │ │
│  │  │  SQLite    │ │ expo-av  │ │expo-notif│ │ Gemini  │  │ │
│  │  │ (Drizzle)  │ │ (Audio)  │ │(Reminder)│ │ Proxy   │  │ │
│  │  │            │ │          │ │          │ │         │  │ │
│  │  │ notes      │ │ Record   │ │ Schedule │ │ STT +   │  │ │
│  │  │ reminders  │ │ Playback │ │ Cancel   │ │ Intent  │  │ │
│  │  └────────────┘ └──────────┘ └──────────┘ └────┬────┘  │ │
│  └─────────────────────────────────────────────────┼───────┘ │
└────────────────────────────────────────────────────┼─────────┘
                                                     │ HTTPS
                                                     ▼
                                              Vercel Serverless
                                              → Gemini 2.5 Flash
```

---

## Katmanli Mimari

### 1. Presentation Layer (`app/`)

Expo Router file-based routing ile ekranlar tanimlanir.

```
app/
├── _layout.tsx           # GestureHandlerRootView + DB init + bildirim izni
│                         # + bildirim tıklama listener (auto-complete + deep link)
├── (tabs)/
│   ├── _layout.tsx       # Tab bar (Notlar + Hatirlaticilar)
│   ├── index.tsx         # Not listesi + FAB + BottomSheet + AI transkript akışı
│   └── reminders.tsx     # Hatirlatici listesi (aktif + tamamlanan)
└── note/
    └── [id].tsx          # Not detay, duzenleme, ses oynatma, transkript gösterimi
```

### 2. Component Layer (`src/components/`)

| Bilesen | Sorumluluk | Kullanildigi Yer |
|---------|------------|------------------|
| `NoteCard` | Renkli not karti render | Notes listesi |
| `VoiceRecorder` | Mikrofon kayit UI + expo-av | BottomSheet (yeni not) |
| `ReminderPicker` | 6 hizli secenek + tarih secici | Note detay |
| `ColorPicker` | 8 renk secim dairesi | BottomSheet (yeni not) |
| `EmptyState` | Ikon + mesaj (bos liste) | Notes, Reminders |
| `TranscriptionStatus` | AI isleme durumu (spinner/sonuc/hata) | BottomSheet (yeni not) |

### 3. State Layer (`src/stores/`)

**Zustand** ile merkezi state yonetimi. Tek store tum uygulamayi yonetir.

```typescript
interface NoteStore {
  notes: Note[]
  reminders: Reminder[]
  isLoading: boolean

  loadNotes()                           // DB'den notlari yukle
  loadReminders()                       // DB'den haticilari yukle
  createNote(..., reminderDate?)        // Not olustur + opsiyonel hatirlatici
  updateNote(...)                       // Not guncelle
  deleteNote(...)                       // Not sil (cascade)
  addReminder(...)                      // Hatirlatici ekle + bildirim zamanla
  completeReminder()                    // Hatirlatici tamamla
  deleteReminder()                      // Hatirlatici sil
  getReminderForNote()                  // Nota ait aktif hatirlatici
}
```

### 4. Data Layer (`src/lib/`)

| Modul | Sorumluluk | Platform |
|-------|------------|----------|
| `database.ts` | SQLite baglantisi, tablo olusturma | Native only |
| `database.web.ts` | Web stub (null doner, in-memory) | Web only |
| `schema.ts` | Drizzle ORM tablo semalari | Native only |
| `gemini.ts` | Vercel proxy'ye istek + retry + hata yonetimi | Tüm platformlar |
| `notifications.ts` | Bildirim izinleri, zamanlama, iptal | Native only |
| `colors.ts` | 8 renk paleti, yardimci fonksiyonlar | Tüm platformlar |

### 5. Serverless API Layer (`api/`)

| Dosya | Endpoint | Sorumluluk | Deploy |
|-------|----------|------------|--------|
| `api/transcribe.ts` | `POST /api/transcribe` | Gemini proxy + CORS + rate limit | Vercel |

---

## Dosya → Deploy Matrisi

```
┌────────────────────────────────────┬───────────────────────────────┐
│           DOSYA                     │         DEPLOY                │
├────────────────────────────────────┼───────────────────────────────┤
│ app/**                             │ 📱 Mobile (Expo Go / EAS)    │
│ src/components/**                  │ 📱 Mobile (Expo Go / EAS)    │
│ src/stores/**                      │ 📱 Mobile (Expo Go / EAS)    │
│ src/lib/database.ts                │ 📱 Mobile (native only)      │
│ src/lib/database.web.ts            │ 🌐 Web (Expo Web)            │
│ src/lib/gemini.ts                  │ 📱 Mobile + 🌐 Web           │
│ src/lib/notifications.ts           │ 📱 Mobile (native only)      │
│ src/lib/schema.ts                  │ 📱 Mobile (native only)      │
│ src/lib/colors.ts                  │ 📱 Mobile + 🌐 Web           │
│ src/types/**                       │ 📱 Mobile + 🌐 Web           │
├────────────────────────────────────┼───────────────────────────────┤
│ api/transcribe.ts                  │ ☁️  Vercel Serverless         │
│ vercel.json                        │ ☁️  Vercel Config             │
├────────────────────────────────────┼───────────────────────────────┤
│ .env                               │ 🔒 Sadece lokal (.gitignore) │
│ Vercel Env: GEMINI_API_KEY         │ ☁️  Vercel (encrypted)        │
└────────────────────────────────────┴───────────────────────────────┘
```

---

## Güvenlik Mimarisi

```
📱 Client (React Native)
│
│  ✅ API key YOK (bundle'da saklanmaz)
│  ✅ Prompt YOK (bundle'da saklanmaz)
│  ✅ Sadece EXPO_PUBLIC_API_URL (Vercel URL) var
│
│  POST /api/transcribe
│  Body: { audioBase64, mimeType } veya { text }
│
▼
☁️ Vercel Serverless Function
│
│  🔒 CORS: İzinli origin whitelist
│  🔒 Rate Limit: 2/dk + 20/saat (IP başına)
│  🔒 Body Limit: 5MB max
│  🔒 GEMINI_API_KEY: Encrypted env var (sunucu tarafı)
│
│  → Gemini API çağrısı (key sunucuda)
│
▼
🤖 Google Gemini 2.5 Flash
│
│  Multimodal: Audio → Transkript + Intent
│  Billing: Pay-as-you-go
│
▼
☁️ Vercel → JSON response → 📱 Client
```

---

## Veritabani Tasarimi

```
┌────────────────────────────┐       ┌────────────────────────────┐
│          notes             │       │        reminders           │
├────────────────────────────┤       ├────────────────────────────┤
│ id          TEXT PK        │       │ id          TEXT PK        │
│ content     TEXT           │◄──────│ note_id     TEXT FK        │
│ type        TEXT           │  1:N  │ remind_at   INTEGER        │
│ color       TEXT           │       │ is_done     INTEGER (bool) │
│ audio_uri   TEXT?          │       │ created_at  INTEGER        │
│ transcript  TEXT?          │       └────────────────────────────┘
│ created_at  INTEGER        │
│ updated_at  INTEGER        │
└────────────────────────────┘

Iliskiler:
- reminders.note_id → notes.id (ON DELETE CASCADE)
- Bir notun 0 veya 1 aktif hatirlicisi olabilir
```

---

## UI Tasarim Sistemi

### Renk Paleti

**Not Renkleri (Google Keep tarzi):**
| Renk | Arkaplan | Kenarlık |
|------|----------|----------|
| Yellow | `#FFF9C4` | `#FFF176` |
| Green | `#C8E6C9` | `#81C784` |
| Blue | `#BBDEFB` | `#64B5F6` |
| Purple | `#E1BEE7` | `#BA68C8` |
| Pink | `#F8BBD0` | `#F06292` |
| Orange | `#FFE0B2` | `#FFB74D` |
| Teal | `#B2DFDB` | `#4DB6AC` |
| Red | `#FFCDD2` | `#E57373` |

**Uygulama Renkleri:**
| Rol | Renk | Kullanim |
|-----|------|----------|
| Primary | `#3B82F6` | FAB, butonlar, aksanlar |
| Surface | `#FAFAFA` | Arkaplan |
| Text Primary | `#262626` | Basliklar |
| Text Secondary | `#737373` | Aciklamalar |
| Danger | `#EF4444` | Silme, gecmis hatirlatici |
| Warning | `#E65100` | Aktif hatirlatici badge |
| Success | `#16A34A` | Transkript badge |
| Info | `#2563EB` | Hatırlatıcı önerisi badge |

---

## Dosya Bagimliliklari

```
app/_layout.tsx
  └── src/stores/useNoteStore.ts (completeReminder)
  └── src/lib/database.ts (initDatabase)
  └── src/lib/notifications.ts (requestPermissions)

app/(tabs)/index.tsx
  └── src/stores/useNoteStore.ts
  └── src/components/NoteCard.tsx
  │     └── src/lib/colors.ts
  └── src/components/VoiceRecorder.tsx
  └── src/components/ColorPicker.tsx
  └── src/components/EmptyState.tsx
  └── src/components/TranscriptionStatus.tsx
  └── src/lib/gemini.ts (transcribeAndExtract)
  └── src/lib/colors.ts

app/(tabs)/reminders.tsx
  └── src/stores/useNoteStore.ts
  └── src/lib/colors.ts
  └── src/components/EmptyState.tsx

app/note/[id].tsx
  └── src/stores/useNoteStore.ts
  └── src/components/ReminderPicker.tsx
  └── src/lib/colors.ts

src/stores/useNoteStore.ts
  └── src/lib/database.ts (db)
  └── src/lib/schema.ts (notes, reminders)
  └── src/lib/notifications.ts (schedule/cancel)
  └── src/lib/colors.ts (getRandomColor)
  └── src/types/note.ts

src/lib/gemini.ts
  └── expo-file-system (native: audio → base64)
  └── Vercel proxy (HTTPS fetch + retry)

api/transcribe.ts (Vercel)
  └── Google Gemini API (server-side key)
```

---

## Tasarim Kararlari

### Neden Expo + React Native?
- **Tek codebase** ile iOS + Android + Web
- **Expo Go** ile aninda test (build gerektirmez)
- **OTA updates** ile store onay beklemeden guncelleme

### Neden SQLite (Offline-First)?
- Internet bagimliligi yok, aninda calisir
- Hiz: yerel DB okuma/yazma < 1ms
- Drizzle ORM ile type-safe sorgular

### Neden Vercel Serverless Proxy?
- API key client'ta saklanmaz (güvenlik)
- Prompt/model bilgisi client bundle'da yok
- GitHub push → otomatik deploy
- Ücretsiz tier yeterli (100K istek/ay)
- Rate limiting + CORS sunucu tarafında

### Neden Gemini 2.5 Flash?
- Multimodal: tek API çağrısı ile audio → transkript + intent
- Hızlı (~2-5 saniye) ve ucuz (~$0.001/istek)
- Türkçe dil desteği iyi
- Yapılandırılmış JSON çıktı desteği

### Neden Zustand?
- Minimal boilerplate (Redux'a kiyasla)
- TypeScript ile mukemmel uyum
- Async actions icin ekstra middleware gerektirmez

---

## Gelecek Mimari (Planli)

### Faz 2: Cloud Sync (Supabase)
- SQLite ↔ PostgreSQL çift yönlü sync
- Supabase Auth (kullanıcı girişi)
- Supabase Storage (ses dosyaları buluta)

### Faz 3: Gelişmiş Özellikler
- Offline queue: İnternet yokken ses kaydını sakla, bağlantıda AI'ya gönder
- Not arama ve filtreleme
- Etiketler / kategoriler
- EAS Build ile App Store / Play Store dağıtım
