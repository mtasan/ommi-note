# OmmiNote - Architecture

Bu belge OmmiNote uygulamasinin mimari yapisini, veri akislarini ve tasarim kararlarini detaylandirir.

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
│  │  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │  │ │
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
│  │  ├── createNote() / updateNote() / deleteNote()         │ │
│  │  └── addReminder() / completeReminder()                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                                │
│                              ▼                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Data Layer                            │ │
│  │                                                         │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │  │   SQLite    │  │   expo-av    │  │expo-notific. │   │ │
│  │  │ (Drizzle)   │  │  (Audio)     │  │ (Reminders)  │   │ │
│  │  │             │  │              │  │              │   │ │
│  │  │ notes       │  │ Record       │  │ Schedule     │   │ │
│  │  │ reminders   │  │ Playback     │  │ Cancel       │   │ │
│  │  └─────────────┘  └──────────────┘  └──────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Katmanli Mimari

### 1. Presentation Layer (`app/`)

Expo Router file-based routing ile ekranlar tanimlanir.

```
app/
├── _layout.tsx           # GestureHandlerRootView + DB init + bildirim izni
├── (tabs)/
│   ├── _layout.tsx       # Tab bar (Notlar + Hatirlaticilar)
│   ├── index.tsx         # Not listesi + FAB + BottomSheet
│   └── reminders.tsx     # Hatirlatici listesi (aktif + tamamlanan)
└── note/
    └── [id].tsx          # Not detay, duzenleme, ses oynatma
```

**Navigasyon Akisi:**
```
Tab Navigator
├── Notes Tab (index)
│   ├── [FAB tikla] → BottomSheet acilir (yeni not)
│   └── [Kart tikla] → note/[id] ekranina git
├── Reminders Tab
│   └── [Kart tikla] → note/[id] ekranina git
```

### 2. Component Layer (`src/components/`)

Yeniden kullanilabilir, state'siz (veya kendi local state'li) bilesenler:

| Bilesen | Sorumluluk | Kullanildigi Yer |
|---------|------------|------------------|
| `NoteCard` | Renkli not karti render | Notes listesi |
| `VoiceRecorder` | Mikrofon kayit UI + expo-av | BottomSheet (yeni not) |
| `ReminderPicker` | Hizli secenekler + tarih secici | Note detay |
| `ColorPicker` | 8 renk secim dairesi | BottomSheet (yeni not) |
| `EmptyState` | Ikon + mesaj (bos liste) | Notes, Reminders |

### 3. State Layer (`src/stores/`)

**Zustand** ile merkezi state yonetimi. Tek store tum uygulamayi yonetir.

```typescript
interface NoteStore {
  // State
  notes: Note[]
  reminders: Reminder[]
  isLoading: boolean

  // Actions
  loadNotes()         // DB'den notlari yukle
  loadReminders()     // DB'den haticilari yukle
  createNote(...)     // Not olustur → SQLite INSERT
  updateNote(...)     // Not guncelle → SQLite UPDATE
  deleteNote(...)     // Not sil → SQLite DELETE (cascade)
  addReminder(...)    // Hatirlatici ekle → bildirim zamanla + DB INSERT
  completeReminder()  // Hatirlatici tamamla → bildirim iptal + DB UPDATE
  deleteReminder()    // Hatirlatici sil → bildirim iptal + DB DELETE
  getReminderForNote() // Nota ait aktif hatirlaticiyi getir
}
```

**Veri Akisi Patterni:**
```
UI Event → Store Action → SQLite Write → State Update → UI Re-render
                        → Notification Schedule (hatirlatici icin)
```

### 4. Data Layer (`src/lib/`)

| Modul | Sorumluluk |
|-------|------------|
| `database.ts` | SQLite baglantisi, tablo olusturma (initDatabase) |
| `schema.ts` | Drizzle ORM tablo semalari (notes, reminders) |
| `notifications.ts` | Bildirim izinleri, zamanlama, iptal |
| `colors.ts` | 8 renk paleti, yardimci fonksiyonlar |

---

## Veri Akislari

### Not Olusturma Akisi

```
Kullanici
  │
  ├── FAB'a tiklar
  │     └── BottomSheet acilir
  │           ├── Renk secer (ColorPicker)
  │           ├── Metin yazar
  │           └── [Opsiyonel] Ses kaydeder (VoiceRecorder)
  │                 └── expo-av → Recording → URI
  │
  ├── "Kaydet" tiklar
  │     └── useNoteStore.createNote()
  │           ├── uuid() → yeni ID
  │           ├── db.insert(notes) → SQLite'a kayit
  │           ├── set(state) → Zustand state guncelle
  │           └── Haptics feedback
  │
  └── BottomSheet kapanir, yeni kart listede gorunur
```

### Hatirlatici Akisi

```
Kullanici (Not detay ekraninda)
  │
  ├── Alarm ikonuna tiklar
  │     └── ReminderPicker acilir
  │           ├── Hizli secenekler: 30dk, 1 saat, 3 saat, Yarin 09:00
  │           └── Ozel tarih/saat secici
  │
  ├── Zaman secer
  │     └── useNoteStore.addReminder()
  │           ├── expo-notifications → scheduleNotificationAsync()
  │           │     └── Local bildirim zamanlanir
  │           ├── db.insert(reminders) → SQLite'a kayit
  │           └── set(state) → Zustand state guncelle
  │
  └── Zaman geldiginde
        └── OS bildirim gosterir
              └── Kullanici tiklar → nota yonlendirilir
```

### Ses Oynatma Akisi

```
Not Detay Ekrani
  │
  ├── Play butonuna tiklar
  │     └── Audio.Sound.createAsync(uri)
  │           └── shouldPlay: true
  │
  ├── Oynatma bitince
  │     └── onPlaybackStatusUpdate → didJustFinish
  │           └── sound.unloadAsync()
  │
  └── Ekrandan cikildiginda
        └── useEffect cleanup → soundRef.unloadAsync()
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
| Renk | Arkaplan | Kenarlık | Kullanim |
|------|----------|----------|----------|
| Yellow | `#FFF9C4` | `#FFF176` | Varsayilan |
| Green | `#C8E6C9` | `#81C784` | |
| Blue | `#BBDEFB` | `#64B5F6` | |
| Purple | `#E1BEE7` | `#BA68C8` | |
| Pink | `#F8BBD0` | `#F06292` | |
| Orange | `#FFE0B2` | `#FFB74D` | |
| Teal | `#B2DFDB` | `#4DB6AC` | |
| Red | `#FFCDD2` | `#E57373` | |

**Uygulama Renkleri:**
| Rol | Renk | Kullanim |
|-----|------|----------|
| Primary | `#3B82F6` | FAB, butonlar, aksanlar |
| Surface | `#FAFAFA` | Arkaplan |
| Text Primary | `#262626` | Basliklar |
| Text Secondary | `#737373` | Aciklamalar |
| Danger | `#EF4444` | Silme, gecmis hatirlatici |
| Warning | `#E65100` | Aktif hatirlatici badge |

### Bilesen Hiyerarsisi

```
NotesScreen
├── Header (greeting + baslik)
├── FlatList (numColumns=2, grid layout)
│   └── NoteCard (renkli kart)
│       ├── Type icon + tarih
│       ├── Icerik onizleme (max 4 satir)
│       └── Ses badge (varsa)
├── FAB (sag alt, yuvarlak, mavi)
└── BottomSheet
    ├── Baslik "Yeni Not"
    ├── ColorPicker (8 daire)
    ├── TextInput (multiline)
    ├── VoiceRecorder (opsiyonel)
    └── Toolbar [Sesli] [Kaydet]
```

---

## Tasarim Kararlari

### Neden Expo + React Native?
- **Tek codebase** ile iOS + Android
- **Expo Go** ile aninda test (build gerektirmez)
- **OTA updates** ile store onay beklemeden guncelleme
- Genis ekosistem ve topluluk destegi

### Neden SQLite (Offline-First)?
- Internet bagimliligi yok, aninda calisir
- Hiz: yerel DB okuma/yazma < 1ms
- Gelecekte Supabase sync eklenebilir
- Drizzle ORM ile type-safe sorgular

### Neden Zustand?
- Minimal boilerplate (Redux'a kiyasla)
- TypeScript ile mukemmel uyum
- Async actions icin ekstra middleware gerektirmez
- < 1KB bundle boyutu

### Neden Bottom Sheet?
- Tek elle kullanim (thumb zone)
- Hizli erisim (tam sayfa gecisi yok)
- Klavye ile uyumlu
- Gesture ile kapama destegi

### Neden 2 Sutun Grid?
- Google Keep tarzi tanitik deneyim
- Daha fazla not tek ekranda gorunur
- Renkli kartlar grid'de daha etkili

---

## Gelecek Mimari (Planli)

### Faz 2: Cloud Sync (Supabase)

```
┌──────────────────┐     ┌──────────────────┐
│   Mobile App     │     │    Supabase      │
│                  │     │                  │
│  ┌────────────┐  │     │  ┌────────────┐  │
│  │  SQLite    │──┼─sync─┼─►│ PostgreSQL │  │
│  │  (local)   │◄─┼─────┼──│ (cloud)    │  │
│  └────────────┘  │     │  └────────────┘  │
│                  │     │                  │
│  ┌────────────┐  │     │  ┌────────────┐  │
│  │ Auth Store │──┼─────┼─►│ Supabase   │  │
│  │            │  │     │  │ Auth       │  │
│  └────────────┘  │     │  └────────────┘  │
│                  │     │                  │
│  ┌────────────┐  │     │  ┌────────────┐  │
│  │ Audio Files│──┼─────┼─►│ Supabase   │  │
│  │ (local)    │  │     │  │ Storage    │  │
│  └────────────┘  │     │  └────────────┘  │
└──────────────────┘     └──────────────────┘
```

### Faz 3: Speech-to-Text

```
Ses Kaydi
  └── expo-av Recording
        └── Audio dosyasi
              ├── Yerel saklama (audioUri)
              └── Whisper API'ye gonder
                    └── Transkript → note.transcript
```

---

## Dosya Bagimliliklari

```
app/_layout.tsx
  └── src/lib/database.ts (initDatabase)
  └── src/lib/notifications.ts (requestPermissions)

app/(tabs)/index.tsx
  └── src/stores/useNoteStore.ts
  └── src/components/NoteCard.tsx
  │     └── src/lib/colors.ts
  └── src/components/VoiceRecorder.tsx
  └── src/components/ColorPicker.tsx
  └── src/components/EmptyState.tsx
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

src/lib/database.ts
  └── src/lib/schema.ts
```
