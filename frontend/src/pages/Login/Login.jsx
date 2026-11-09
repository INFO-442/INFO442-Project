import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/i18n/LanguageContext.jsx";
import styles from "./Login.module.css";

function LoginPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const newErrors = {};
    if (!email.trim()) newErrors.email = "error.emailRequired";
    if (!password) newErrors.password = "error.passwordRequired";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      setErrors({
        form: error.code === "invalid_credentials" ? "error.incorrectLogin" : "error.generic",
      });
      return;
    }

    navigate("/");
  }

  return (
    <main className={styles.page}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h1>{t("login.title")}</h1>
        <p className={styles.subtitle}>{t("login.subtitle")}</p>

        {errors.form && <p className={styles.alert}>{t(errors.form)}</p>}

        <label className={styles.field}>
          {t("login.email")}
          <input
            type="email"
            placeholder="owner@restaurant.com"
            className={errors.email ? styles.invalid : ""}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {errors.email && <span className={styles.error}>{t(errors.email)}</span>}
        </label>

        <label className={styles.field}>
          {t("login.password")}
          <input
            type="password"
            className={errors.password ? styles.invalid : ""}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {errors.password && <span className={styles.error}>{t(errors.password)}</span>}
        </label>

        <button type="submit" className={styles.submit} disabled={loading}>
          {t("login.submit")}
        </button>

        <p className={styles.switch}>
          {t("login.newHere")} <Link to="/signup">{t("login.createAccount")}</Link>
        </p>
      </form>
    </main>
  );
}

export default LoginPage;