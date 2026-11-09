import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/i18n/LanguageContext.jsx";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setLanguage } = useLanguage();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    supabase
      .from("restaurants")
      .select("interface_language")
      .eq("owner_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLanguage(data.interface_language);
      });
  }, [userId]);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}