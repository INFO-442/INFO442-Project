import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext.jsx";
import { LANGUAGES } from "@/i18n/translations";
import styles from "./LanguageSelector.module.css";

function LanguageSelector() {
  const { t, language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const selectorRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event) {
      if (!selectorRef.current.contains(event.target)) setOpen(false);
    }

    function handleEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const current = LANGUAGES.find((lang) => lang.code === language);

  function chooseLanguage(code) {
    setLanguage(code);
    setOpen(false);
  }

  return (
    <div className={styles.selector} ref={selectorRef}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {t("nav.language")}: {current.label} ▾
      </button>

      {open && (
        <ul className={styles.menu}>
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                lang={lang.code}
                className={lang.code === language ? styles.selected : ""}
                onClick={() => chooseLanguage(lang.code)}
              >
                <span className={styles.check}>{lang.code === language ? "✓" : ""}</span>
                {lang.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LanguageSelector;