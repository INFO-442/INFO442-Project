import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "./translations";

const LanguageContext = createContext(null);

function getSavedLanguage() {
  const saved = localStorage.getItem("language");
  return translations[saved] ? saved : "en";
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getSavedLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  function setLanguage(code) {
    if (!translations[code]) return;
    localStorage.setItem("language", code);
    setLanguageState(code);
  }

  function t(key) {
    return translations[language][key] ?? translations.en[key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}