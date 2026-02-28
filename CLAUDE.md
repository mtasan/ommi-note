# OmmiNote - CLAUDE.md

Bu belge, **OmmiNote** projesiyle calisirken Claude'a rehberlik saglar.

---

## Proje Ozeti

OmmiNote, gunluk hayatta hizli not almak icin tasarlanmis cross-platform bir mobil uygulamadir. Yazili ve sesli not destegi, hatirlaticilar ve renkli Google Keep tarzi kartlarla kullanici deneyimi sunar.

- **Platform:** iOS + Android (tek codebase)
- **Framework:** React Native + Expo SDK 55
- **Routing:** Expo Router (file-based)
- **UI Stili:** Colorful & Playful (Google Keep benzeri renkli kart tasarimi)

---

## Hizli Baslangic

```bash
# Bagimlilik kurulumu
cd /Users/mehmet.tasan/Documents/projects/ommi-note
npm install

# Gelistirme sunucusu (Expo Go ile telefondan test)
npm start

# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web onizleme (sinirli ozellik)
npx expo start --web
```

---

## Teknoloji Yigini

| Kategori | Teknoloji | Versiyon |
|----------|-----------|----------|
| **Framework** | React Native + Expo | SDK 55, RN 0.83 |
| **Dil** | TypeScript | 5.9 |
| **Routing** | Expo Router | 55.0.3 |
| **State** | Zustand | 5.x |
| **Local DB** | expo-sqlite + Drizzle ORM | - |
| **Styling** | NativeWind (Tailwind CSS) | 4.x + TW 3.x |
| **Ses Kayit** | expo-av | 16.x |
| **Bildirimler** | expo-notifications | 55.x |
| **UI** | @gorhom/bottom-sheet, Ionicons | 5.x |
| **Tarih** | date-fns | 4.x |
| **Haptics** | expo-haptics | 55.x |

---

## Proje Yapisi

```
ommi-note/
├── app/                          # Expo Router - ekranlar
│   ├── _layout.tsx               # Root layout (DB init, bildirim izni)
│   ├── (tabs)/                   # Tab navigasyonu
│   │   ├── _layout.tsx           # Tab bar yapilandirmasi
│   │   ├── index.tsx             # Ana ekran: Not listesi + FAB + BottomSheet
│   │   └── reminders.tsx         # Hatirlaticilar ekrani
│   └── note/
│       └── [id].tsx              # Not detay/duzenleme ekrani
├── src/
│   ├── components/               # Yeniden kullanilabilir bilesenler
│   │   ├── ColorPicker.tsx       # Not renk secici (8 renk)
│   │   ├── EmptyState.tsx        # Bos liste placeholder
│   │   ├── NoteCard.tsx          # Renkli not karti (Google Keep tarzi)
│   │   ├── ReminderPicker.tsx    # Hatirlatici tarih/saat secici
│   │   └── VoiceRecorder.tsx     # Ses kayit butonu ve UI
│   ├── lib/                      # Yardimci moduller
│   │   ├── colors.ts             # 8 not rengi tanimlari ve yardimcilar
│   │   ├── database.ts           # SQLite baglantisi ve tablo olusturma
│   │   ├── notifications.ts      # Push bildirim izinleri ve zamanlama
│   │   └── schema.ts             # Drizzle ORM tablo semalari
│   ├── stores/
│   │   └── useNoteStore.ts       # Zustand store (CRUD + hatirlatici islemleri)
│   └── types/
│       └── note.ts               # TypeScript tip tanimlari
├── assets/                       # Ikon ve splash gorselleri
├── app.json                      # Expo yapilandirmasi
├── metro.config.js               # Metro bundler + NativeWind
├── tailwind.config.js            # Tailwind renk paleti
├── tsconfig.json                 # TypeScript ayarlari
└── package.json
```

---

## Veritabani Semasi

**SQLite** ile yerel depolama. Drizzle ORM ile type-safe erisim.

### notes tablosu
| Kolon | Tip | Aciklama |
|-------|-----|----------|
| `id` | TEXT PK | UUID |
| `content` | TEXT | Not icerigi |
| `type` | TEXT | `'text'` / `'voice'` / `'mixed'` |
| `color` | TEXT | Renk adi (yellow, green, blue, purple, pink, orange, teal, red) |
| `audio_uri` | TEXT | Ses dosyasi yerel yolu (nullable) |
| `transcript` | TEXT | Ses transkripti (nullable) |
| `created_at` | INTEGER | Olusturma zamani (ms) |
| `updated_at` | INTEGER | Guncelleme zamani (ms) |

### reminders tablosu
| Kolon | Tip | Aciklama |
|-------|-----|----------|
| `id` | TEXT PK | UUID |
| `note_id` | TEXT FK | notes.id referansi (CASCADE DELETE) |
| `remind_at` | INTEGER | Hatirlatma zamani (ms) |
| `is_done` | INTEGER | Tamamlandi mi (0/1) |
| `created_at` | INTEGER | Olusturma zamani (ms) |

---

## Anahtar Kavramlar

### State Management (Zustand)
Tek bir store (`useNoteStore`) tum not ve hatirlatici islemlerini yonetir:
- `loadNotes()` / `loadReminders()` - DB'den yukle
- `createNote(content, type, color?, audioUri?, transcript?)` - Yeni not
- `updateNote(id, content)` - Icerik guncelle
- `deleteNote(id)` - Not sil (cascade hatirlatici)
- `addReminder(noteId, noteContent, remindAt)` - Hatirlatici ekle + bildirim zamanla
- `completeReminder(id)` / `deleteReminder(id)` - Hatirlatici yonet

### Not Renkleri
8 renk secenegi (Google Keep tarzi): yellow, green, blue, purple, pink, orange, teal, red.
Yeni not olusturulurken rastgele renk atanir. `src/lib/colors.ts`'de tanimli.

### Sesli Not Akisi
1. `VoiceRecorder` → `expo-av` ile ses kaydi
2. Kayit URI'si store'a kaydedilir (`audioUri`)
3. Not detayinda `Audio.Sound` ile oynatma
4. Opsiyonel: `transcript` alani gelecekte STT entegrasyonu icin hazir

### Bildirim Akisi
1. Uygulama acilisinda `requestNotificationPermissions()` cagirilir
2. `scheduleReminder()` → `expo-notifications` ile local notification zamanlama
3. Hatirlatici tamamlandiginda veya silindiginde `cancelReminder()` cagirilir

---

## Gelistirme Kurallari

1. **TypeScript:** Tum yeni dosyalar `.tsx` / `.ts` ile yazilmali
2. **Expo Router:** Yeni ekranlar `app/` dizini altinda dosya olarak eklenmeli
3. **Component:** Yeniden kullanilabilir bilesenler `src/components/` altinda
4. **Store:** Zustand store'a yeni ozellikler eklenirken interface'i guncelle
5. **Stil:** NativeWind (className) veya StyleSheet/inline style kullanilabilir. Renkli UI icin `src/lib/colors.ts`'deki paleti kullan
6. **Offline-First:** Tum veri SQLite'da yerel saklanir. Network bagimliligi yok (henuz)
7. **Haptics:** Onemli aksiyonlarda (kaydet, sil) haptic feedback kullan
8. **i18n:** Kullanici-gorunur metinler Turkce. Gelecekte coklu dil icin hazirlikliyiz

---

## Sik Kullanilan Komutlar

```bash
# Gelistirme
npm start                    # Expo dev server (QR kod ile telefonda test)
npm run ios                  # iOS Simulator
npm run android              # Android Emulator

# Build
npx expo prebuild            # Native projeler olustur
npx eas build --platform ios # iOS build (EAS)
npx eas build --platform android # Android build (EAS)

# Lint & Type Check
npx tsc --noEmit             # TypeScript type check
```

---

## Kritik Dosyalar

| Dosya | Aciklama |
|-------|----------|
| `app/(tabs)/index.tsx` | Ana ekran: Not listesi, FAB, BottomSheet ile not olusturma |
| `app/note/[id].tsx` | Not detay: duzenleme, ses oynatma, hatirlatici ekleme/silme |
| `src/stores/useNoteStore.ts` | Merkezi state: tum CRUD ve hatirlatici islemleri |
| `src/lib/database.ts` | SQLite baglantisi ve tablo migration |
| `src/lib/schema.ts` | Drizzle ORM sema tanimlari |
| `src/lib/notifications.ts` | Bildirim izinleri ve zamanlama |
| `src/lib/colors.ts` | 8 renkli not paleti |
| `app.json` | Expo konfigurasyonu (bundle ID, izinler, pluginler) |

---

## Gelecek Ozellikler (Roadmap)

- [ ] Supabase entegrasyonu (cloud sync + auth)
- [ ] Speech-to-Text (Whisper API ile ses transkripti)
- [ ] Arama fonksiyonu
- [ ] Not etiketleri / kategoriler
- [ ] Dark mode
- [ ] Not paylasimi
- [ ] Widget desteği (iOS/Android)
- [ ] Coklu dil destegi (i18n)
