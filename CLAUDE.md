# Asyra - CLAUDE.md

Bu belge, **Asyra** projesiyle calisirken Claude'a rehberlik saglar.

---

## Proje Ozeti

Asyra (AI Notes, Voice & Photos), gunluk hayatta hizli not almak icin tasarlanmis cross-platform bir mobil uygulamadir. Yazili ve sesli not destegi, AI transkripsiyon, hatirlaticilar ve renkli Google Keep tarzi kartlarla kullanici deneyimi sunar.

- **Platform:** iOS + Android + Web (tek codebase)
- **Framework:** React Native + Expo SDK 54
- **Routing:** Expo Router (file-based)
- **UI Stili:** Colorful & Playful (Google Keep benzeri renkli kart tasarimi)
- **i18n:** Türkçe + İngilizce (cihaz dili otomatik algılama)

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
| **Framework** | React Native + Expo | SDK 54, RN 0.81 |
| **Dil** | TypeScript | 5.9 |
| **Routing** | Expo Router | 6.x |
| **State** | Zustand | 5.x |
| **Local DB** | expo-sqlite + Drizzle ORM | - |
| **i18n** | i18next + react-i18next + expo-localization | - |
| **Styling** | NativeWind (Tailwind CSS) | 4.x + TW 3.x |
| **Ses Kayit** | expo-av | 16.x |
| **Bildirimler** | expo-notifications | - |
| **AI / STT** | Google Gemini 2.5 Flash (Vercel proxy) | - |
| **UI** | @gorhom/bottom-sheet, Ionicons | 5.x |
| **Tarih** | date-fns | 4.x |
| **Haptics** | expo-haptics | - |

---

## Proje Yapisi

```
asyra/
├── app/                          # Expo Router - ekranlar
│   ├── _layout.tsx               # Root layout (DB init, bildirim izni, i18n import)
│   ├── (tabs)/                   # Tab navigasyonu
│   │   ├── _layout.tsx           # Tab bar yapilandirmasi (i18n tab labels)
│   │   ├── index.tsx             # Ana ekran: Not listesi + FAB + BottomSheet
│   │   └── reminders.tsx         # Hatirlaticilar ekrani
│   └── note/
│       └── [id].tsx              # Not detay/duzenleme ekrani
├── src/
│   ├── components/               # Yeniden kullanilabilir bilesenler
│   │   ├── ColorPicker.tsx       # Not renk secici (8 renk)
│   │   ├── ColorFilter.tsx       # Yatay renk chip filtreleri
│   │   ├── EmptyState.tsx        # Bos liste placeholder
│   │   ├── NoteCard.tsx          # Renkli not karti (Google Keep tarzi)
│   │   ├── ReminderPicker.tsx    # Hatirlatici tarih/saat secici
│   │   ├── SearchBar.tsx         # Arama input
│   │   ├── TranscriptionStatus.tsx # AI isleme durumu
│   │   └── VoiceRecorder.tsx     # Ses kayit butonu ve UI
│   ├── i18n/                     # Coklu dil destegi
│   │   ├── index.ts              # i18next init + cihaz dili algılama
│   │   ├── dateLocale.ts         # date-fns locale helper (TR/EN)
│   │   └── locales/
│   │       ├── tr.json           # Türkçe çeviriler (~85 key)
│   │       └── en.json           # İngilizce çeviriler (~85 key)
│   ├── lib/                      # Yardimci moduller
│   │   ├── colors.ts             # 8 not rengi tanimlari ve yardimcilar
│   │   ├── database.ts           # SQLite baglantisi ve tablo olusturma
│   │   ├── database.web.ts       # Web stub (null doner)
│   │   ├── gemini.ts             # Vercel proxy client + retry + i18n dil gönderimi
│   │   ├── notifications.ts      # Push bildirim izinleri ve zamanlama + i18n başlık
│   │   └── schema.ts             # Drizzle ORM tablo semalari
│   ├── stores/
│   │   └── useNoteStore.ts       # Zustand store (CRUD + hatirlatici islemleri)
│   └── types/
│       └── note.ts               # TypeScript tip tanimlari
├── api/
│   └── transcribe.ts             # Vercel Serverless: Gemini proxy + dil bazlı prompt
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

### i18n (Çoklu Dil Desteği)
- **Cihaz dili algılama:** `expo-localization` → `getLocales()[0].languageCode`
- **Desteklenen diller:** Türkçe (tr), İngilizce (en). Fallback: en
- **React bileşenlerinde:** `const { t } = useTranslation()` → `t('notes.title')`
- **Utility dosyalarında:** `import i18n` → `i18n.t('errors.generic')`
- **Tarih formatları:** `getDateLocale()` → `date-fns` TR veya EN-US locale
- **Sunucu tarafı:** Client `language` param gönderir → server dil bazlı Gemini prompt seçer
- **Yeni çeviri eklemek:** Her iki JSON dosyasına aynı key ile ekle (`tr.json` + `en.json`)

### State Management (Zustand)
Tek bir store (`useNoteStore`) tum not ve hatirlatici islemlerini yonetir:
- `loadNotes()` / `loadReminders()` - DB'den yukle
- `createNote(content, type, color?, audioUri?, transcript?, reminderDate?)` - Yeni not
- `updateNote(id, content)` - Icerik guncelle
- `deleteNote(id)` - Not sil (cascade hatirlatici)
- `addReminder(noteId, noteContent, remindAt)` - Hatirlatici ekle + bildirim zamanla
- `completeReminder(id)` / `deleteReminder(id)` - Hatirlatici yonet

### Not Renkleri
8 renk secenegi (Google Keep tarzi): yellow, green, blue, purple, pink, orange, teal, red.
Yeni not olusturulurken rastgele renk atanir. `src/lib/colors.ts`'de tanimli.
Renk label'ları artık i18n ile: `t('colors.yellow')` vb.

### Sesli Not Akisi
1. `VoiceRecorder` → `expo-av` ile ses kaydi
2. Kayit tamamlanınca `gemini.ts` → Vercel proxy'ye POST (audioBase64 + language)
3. Server dil bazlı Gemini prompt ile transkript + intent çıkarır
4. Client auto-fill: noteContent → TextInput, reminder → badge
5. Kullanıcı kaydeder → SQLite INSERT + bildirim zamanla

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
8. **i18n:** Tum kullanıcı-görünür metinler `src/i18n/locales/` altındaki JSON dosyalarında tanımlanmalı. Hardcoded string YASAK. React'te `useTranslation`, utility'de `i18n.t()` kullan

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

# Deploy
git push                     # Vercel auto-deploy (api/transcribe.ts)
```

---

## Kritik Dosyalar

| Dosya | Aciklama |
|-------|----------|
| `app/(tabs)/index.tsx` | Ana ekran: Not listesi, FAB, BottomSheet ile not olusturma |
| `app/note/[id].tsx` | Not detay: duzenleme, ses oynatma, hatirlatici ekleme/silme |
| `src/stores/useNoteStore.ts` | Merkezi state: tum CRUD ve hatirlatici islemleri |
| `src/i18n/index.ts` | i18next yapılandırması + cihaz dili algılama |
| `src/i18n/locales/tr.json` | Türkçe çeviriler (~85 key) |
| `src/i18n/locales/en.json` | İngilizce çeviriler (~85 key) |
| `src/lib/database.ts` | SQLite baglantisi ve tablo migration |
| `src/lib/gemini.ts` | Vercel proxy client + retry + i18n dil gönderimi |
| `src/lib/notifications.ts` | Bildirim izinleri ve zamanlama |
| `src/lib/colors.ts` | 8 renkli not paleti |
| `api/transcribe.ts` | Vercel serverless: Gemini proxy + dil bazlı prompt |
| `app.json` | Expo konfigurasyonu (bundle ID, izinler, pluginler) |

---

## Gelecek Ozellikler (Roadmap)

- [ ] Cloud sync (Supabase) — cross-device note synchronization
- [ ] Photo notes — notlara fotoğraf ekleme
- [ ] Offline queue — ses kaydını offline sakla, bağlantıda işle
- [ ] Tags / categories
- [ ] EAS Build — App Store & Play Store distribution
- [ ] Dark mode
- [ ] Ek dil desteği (yeni locale JSON dosyaları eklenerek)
