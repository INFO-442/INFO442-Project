import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/i18n/LanguageContext.jsx";
import { LANGUAGES } from "@/i18n/translations";
import styles from "../Login/Login.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SignupPage() {
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    ownerName: "",
    restaurantName: "",
    email: "",
    language: language,
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function validate() {
    const newErrors = {};

    if (!form.ownerName.trim()) newErrors.ownerName = "error.required";
    if (!form.restaurantName.trim()) newErrors.restaurantName = "error.required";

    if (!form.email.trim()) newErrors.email = "error.required";
    else if (!EMAIL_PATTERN.test(form.email.trim())) newErrors.email = "error.emailInvalid";

    if (!form.password) newErrors.password = "error.required";
    else if (form.password.length < 8) newErrors.password = "error.passwordShort";

    if (form.confirmPassword !== form.password) newErrors.confirmPassword = "error.passwordMismatch";

    return newErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          owner_name: form.ownerName.trim(),
          restaurant_name: form.restaurantName.trim(),
          language: form.language,
        },
      },
    });
    setLoading(false);

    if (error) {
      setErrors({ form: error.code === "user_already_exists" ? "error.emailTaken" : "error.generic" });
      return;
    }

    setLanguage(form.language);
    navigate("/");
  }

  function renderInput(name, type, placeholder) {
    return (
      <label className={styles.field}>
        {t(`signup.${name}`)}
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          className={errors[name] ? styles.invalid : ""}
          value={form[name]}
          onChange={handleChange}
        />
        {errors[name] && <span className={styles.error}>{t(errors[name])}</span>}
      </label>
    );
  }

  return (
    <main className={styles.page}>
      <form className={`${styles.form} ${styles.wide}`} onSubmit={handleSubmit} noValidate>
        <h1>{t("signup.title")}</h1>
        <p className={styles.subtitle}>{t("signup.subtitle")}</p>

        <div className={styles.grid}>
          {renderInput("ownerName", "text", "Mai Nguyen")}
          {renderInput("restaurantName", "text", "Pho Saigon")}
          {renderInput("email", "email", "mai@phosaigon.com")}

          <label className={styles.field}>
            {t("signup.language")}
            <select name="language" value={form.language} onChange={handleChange}>
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </label>

          {renderInput("password", "password", "")}
          {renderInput("confirmPassword", "password", "")}
        </div>

        {errors.form === "error.emailTaken" && (
          <p className={styles.alert}>
            {t("error.emailTaken")} <Link to="/login">{t("signup.loginInstead")}</Link>
          </p>
        )}
        {errors.form === "error.generic" && <p className={styles.alert}>{t("error.generic")}</p>}

        <button type="submit" className={styles.submit} disabled={loading}>
          {t("signup.submit")}
        </button>

        <p className={styles.switch}>
          {t("signup.haveAccount")} <Link to="/login">{t("signup.login")}</Link>
        </p>
      </form>
    </main>
  );
}

export default SignupPage;