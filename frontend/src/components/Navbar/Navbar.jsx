import { Link, NavLink, useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/i18n/LanguageContext.jsx";
import LanguageSelector from "@/components/LanguageSelector/LanguageSelector.jsx";
import styles from "./Navbar.module.css";

function Navbar({ type, restaurantName }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.group}>
        {type === "customer" ? (
          <span className={styles.brand}>{restaurantName}</span>
        ) : (
          <Link to="/" className={styles.brand}>
            Wingman
          </Link>
        )}

        {type === "owner" && (
          <>
            <NavLink to="/" end>{t("nav.dashboard")}</NavLink>
            <NavLink to="/feedback">{t("nav.feedback")}</NavLink>
            <NavLink to="/questions">{t("nav.questions")}</NavLink>
            <NavLink to="/settings">{t("nav.settings")}</NavLink>
          </>
        )}
      </div>

      <div className={styles.group}>
        <LanguageSelector />

        {type === "owner" && (
          <button type="button" className={styles.logout} onClick={handleLogout}>
            {t("nav.logout")}
          </button>
        )}

        {type === "guest" && (
          <>
            <NavLink to="/login">{t("nav.login")}</NavLink>
            <NavLink to="/signup">{t("nav.signup")}</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;