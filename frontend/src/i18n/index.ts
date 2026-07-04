import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import hu from "./hu.json";
import en from "./en.json";

// A magyar az alapértelmezett; az angol fordítás tartalma később készül el,
// addig a hiányzó kulcsok a magyarra esnek vissza (fallback).
void i18n.use(initReactI18next).init({
  resources: {
    hu: { translation: hu },
    en: { translation: en },
  },
  lng: localStorage.getItem("garas.language") ?? "hu",
  fallbackLng: "hu",
  interpolation: { escapeValue: false },
});

export default i18n;
