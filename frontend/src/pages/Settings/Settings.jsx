import { useEffect, useState } from "react"
import QRCode from "qrcode"
import settingsCSS from "./Settings.module.css"
import { useAuth } from "@/context/AuthContext.jsx"
import { supabase } from "@/lib/supabase";

const initialRestaurant = {
  name: "",
  slug: "",
  address: "",
  cuisine: "",
  feedback_language: "",
  email: "",
}

const maxRestaurantNameLength = 80

const languages = {
  en: "English",
  es: "Español",
  vi: "Tiếng Việt",
  zh: "中文（简体）",
  ko: "한국어",
  tr: "Türkçe",
  am: "አማርኛ",
  ar: "العربية",
}

function SettingsPage() {
  const { session } = useAuth();
  const userId = session.user.id;

  const [restaurant, setRestaurant] = useState(initialRestaurant)
  const [form, setForm] = useState(restaurant)

  useEffect(() => {
    if (!userId) return;

    supabase
      .from("restaurants")
      .select()
      .eq("owner_id", userId)
      .single()
      .then(({ data }) => {
        data.email = session.user.email;
        setRestaurant(data);
        setForm(data);
      });
  }, [userId]);

  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [copyState, setCopyState] = useState("")
  const [qrCode, setQrCode] = useState("")

  const link = `${window.location.origin}/f/${restaurant.slug}`

  useEffect(() => {
    QRCode.toDataURL(link, { width: 200, margin: 1 })
      .then((dataUrl) => setQrCode(dataUrl))
      .catch(() => setQrCode(""))
  }, [link])

  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(""), 3000)
    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!copyState) return undefined
    const timer = setTimeout(() => setCopyState(""), 2000)
    return () => clearTimeout(timer)
  }, [copyState])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const name = form.name.trim()

    if (!name) {
      setError("Restaurant name is required.")
      return
    }
    if (name.length > maxRestaurantNameLength) {
      setError("Restaurant name must be 80 characters or less.")
      return
    }
    if (!(form.feedback_language in languages)) {
      setError("Couldn't save settings. Try again.")
      return
    }

    setError("")
    supabase
      .from("restaurants")
      .update({
        name: name,
        address: form.address,
        cuisine: form.cuisine,
        feedback_language: form.feedback_language,
      })
      .eq("owner_id", userId)
      .then(({ error }) => {
        if (error) {
          setError("Couldn't save settings. Try again.");
          return;
        }
        setRestaurant({ ...restaurant, ...form, name })
        setNotice("✓ Settings saved.")
      })

  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopyState("Copied!")
    } catch {
      setCopyState("Couldn't copy. Please select the link and copy it manually.")
    }
  }

  return (
    <main className={settingsCSS.page}>
      <h1>Settings</h1>

      <form onSubmit={handleSubmit}>
        <div className={settingsCSS.layout}>
          <div className={settingsCSS.cardColumn}>
            <section className={settingsCSS.card}>
              <h2>Restaurant profile</h2>

              <label className={settingsCSS.field}>
                Restaurant name
                <input
                  type="text"
                  name="name"
                  className={settingsCSS.input}
                  value={form.name}
                  onChange={handleChange}
                />
              </label>

              <label className={settingsCSS.field}>
                Address
                <input
                  type="text"
                  name="address"
                  className={settingsCSS.input}
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </label>

              <label className={settingsCSS.field}>
                Cuisine
                <input
                  type="text"
                  name="cuisine"
                  className={settingsCSS.input}
                  value={form.cuisine}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </label>
            </section>

            <div className={settingsCSS.saveRow}>
              <button type="submit" className={settingsCSS.primary}>
                Save changes
              </button>
              {error && <span className={settingsCSS.error}>{error}</span>}
              {notice && <span className={settingsCSS.notice}>{notice}</span>}
            </div>
          </div>

          <section className={settingsCSS.card}>
            <h2>Language</h2>

            <label className={settingsCSS.field}>
              Translate customer feedback into
              <select
                name="feedback_language"
                className={settingsCSS.select}
                value={form.feedback_language}
                onChange={handleChange}
              >
                {Object.entries(languages).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <h2 className={settingsCSS.sectionHeading}>Customer feedback link</h2>

            <div className={settingsCSS.linkRow}>
              <input
                type="text"
                className={settingsCSS.input}
                value={link}
                readOnly
                onFocus={(event) => event.target.select()}
              />
              <button type="button" className={settingsCSS.secondary} onClick={handleCopy}>
                Copy
              </button>
            </div>
            {copyState && <p className={settingsCSS.muted}>{copyState}</p>}

            <div className={settingsCSS.qrRow}>
              {qrCode ? (
                <img
                  className={settingsCSS.qrImage}
                  src={qrCode}
                  alt="QR code for the feedback link"
                />
              ) : (
                <div className={settingsCSS.qrPlaceholder}>QR code</div>
              )}
              {qrCode && (
                <a className={settingsCSS.secondary} href={qrCode} download="wingman-qr.png">
                  Download QR (PNG)
                </a>
              )}
            </div>
            <p className={settingsCSS.muted}>Print this for tables or receipts.</p>
          </section>

          <section className={settingsCSS.card}>
            <h2>Account</h2>
            <p className={settingsCSS.muted}>Email: {restaurant.email}</p>
          </section>
        </div>
      </form>
    </main>
  )
}

export default SettingsPage
