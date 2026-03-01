import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import "intl-pluralrules";

import tr from "./locales/tr.json";
import en from "./locales/en.json";

const deviceLang = getLocales()[0]?.languageCode ?? "en";

i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: deviceLang === "tr" ? "tr" : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
