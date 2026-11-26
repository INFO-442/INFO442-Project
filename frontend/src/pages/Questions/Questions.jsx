import { useEffect, useState } from "react"
import questionsCSS from "./Questions.module.css"
import { useAuth } from "@/context/AuthContext.jsx"
import { useLanguage } from "@/i18n/LanguageContext.jsx"
import { supabase } from "@/lib/supabase"
import { loadQuestions, addQuestion, removeQuestion } from "./Questions.controller.js"

const ratingQuestionLabel = "Overall rating (1-5 stars)"
const maxQuestions = 5
const maxQuestionLength = 200
const suggestedQuestions = [
  { key: "food", text: "How was the food?" },
  { key: "service", text: "How was the service?" },
  { key: "wait_time", text: "How was the wait time?" },
  { key: "cleanliness", text: "How clean was the restaurant?" },
  { key: "menu", text: "What should we add to the menu?" },
  { key: "heard_about", text: "How did you hear about us?" },
]

const answerTypes = [
  { value: "short_answer", label: "Short answer" },
  { value: "scale", label: "1-5 scale" },
  { value: "yes_no", label: "Yes / No" },
]

function QuestionsPage() {
  const { session } = useAuth()
  const {t, language } = useLanguage()
  const userId = session.user.id
  
  
  const [restaurantId, setRestaurantId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [saving, setSaving] = useState(false)
  const [suggested, setSuggested] = useState("")
  const [text, setText] = useState("")
  const [answerType, setAnswerType] = useState("short_answer")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [pendingRemove, setPendingRemove] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setLoadError("")
      try {
        const { data, error } = await supabase
          .from("restaurants")
          .select("id")
          .eq("owner_id", userId)
          .single()
        if (error) {
          throw error
        }
        setRestaurantId(data.id)
        const list = await loadQuestions(supabase, data.id, language)
        setQuestions(list)
      } catch {
        setLoadError("questions.error.load")
      }
      setLoading(false)
    }
    load()
  }, [userId, language])

  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(""), 3000)
    return () => clearTimeout(timer)
  }, [notice])

  const atLimit = questions.length >= maxQuestions

  function pickSuggested(event) {
    const value = event.target.value
    setSuggested(value)
    if (value) {
      setText(value)
      setError("")
    }
  }

  async function handleAdd(event) {
    event.preventDefault()
    if (saving) return

    let suggestedKey = ""
    if (suggested !== "" && suggested === text.trim()) {
      suggestedKey = suggested
    }

    setSaving(true)
    setError("")
    try {
      const added = await addQuestion(supabase, restaurantId, text, answerType, suggestedKey, language)
      const newList = questions.slice()
      newList.push(added)
      setQuestions(newList)
      setNotice("questions.saved")
      setText("")
      setSuggested("")
      setAnswerType("short_answer")
    } catch (addError) {
      setError("questions.error." + addError.code)
    }
    setSaving(false)
  }

  async function handleConfirmRemove() {
    const question = pendingRemove
    setPendingRemove(null)
    setError("")
    try {
      await removeQuestion(supabase, restaurantId, question.id)
      const newList = []
      for (let i = 0; i < questions.length; i++) {
        if (questions[i].id !== question.id) {
          newList.push(questions[i])
        }
      }
      setQuestions(newList)
      setNotice("questions.saved")
    } catch (removeError) {
      setError("questions.error." + removeError.code)
    }
  }
  if (loading) {
    return (
        <main className={questionsCSS.page}>
        <p className={questionsCSS.muted}>{t("questions.loading")}</p>
      </main>
    )
  }

  if (loadError) {
    return (
        <main className={questionsCSS.page}>
        <p className={questionsCSS.error}>{t(loadError)}</p>
      </main>
    )
  }
  return (
    <main className={questionsCSS.page}>
      <div className={questionsCSS.layout}>
        <div className={questionsCSS.mainColumn}>
          <h1>{t("questions.title")}</h1>
          <p className={questionsCSS.subtitle}>{t("questions.subtitle")}</p>

          <ul className={questionsCSS.list}>
            <li className={questionsCSS.row}>
              <span className={questionsCSS.number}>1.</span>
              <span aria-hidden="true">★</span>
              <span>{t("questions.ratingLabel")}</span>
              <span className={questionsCSS.pill}>{t("questions.alwaysOn")}</span>
            </li>

            {questions.map((question, index) => (
              <li key={question.id} className={questionsCSS.row}>
                <span className={questionsCSS.number}>{index + 2}.</span>
                <span>{question.text}</span>
                <span className={questionsCSS.pill}>
                  {t("questions.type." + question.answerType)}
                </span>
                {!question.suggestedKey && <span className={questionsCSS.pill}>{t("questions.custom")}</span>}
                <button
                  type="button"
                  className={questionsCSS.linkButton}
                  onClick={() => setPendingRemove(question)}
                >
                  {t("questions.remove")}
                </button>
              </li>
            ))}
          </ul>

          {questions.length === 0 && (
            <p className={questionsCSS.muted}>
              {t("questions.empty")}
            </p>
          )}
        </div>

        <aside className={questionsCSS.sideColumn}>
          <section className={questionsCSS.card}>
            <h2>{t("questions.addTitle")}</h2>

            <form className={questionsCSS.form} onSubmit={handleAdd}>
              <label className={questionsCSS.field}>
                {t("questions.pickSuggested")}
                <select className={questionsCSS.select} value={suggested} onChange={pickSuggested}>
                  <option value="">{t("questions.chooseSuggested")}</option>
                  {suggestedQuestions.map((question) => (
                    <option key={question.key} value={question.text}>
                      {t("questions.suggested." + question.key)}
                    </option>
                  ))}
                </select>
              </label>

              <label className={questionsCSS.field}>
                {t("questions.writeOwn")}
                <input
                  type="text"
                  className={questionsCSS.input}
                  value={text}
                  placeholder={t("questions.placeholder")}
                  onChange={(event) => setText(event.target.value)}
                />
                <span className={questionsCSS.counter}>
                  {text.length} / {maxQuestionLength}
                </span>
              </label>

              <label className={questionsCSS.field}>
                {t("questions.answerType")}
                <select
                  className={questionsCSS.select}
                  value={answerType}
                  onChange={(event) => setAnswerType(event.target.value)}
                >
                  {answerTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {t("questions.type." + type.value)}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <button type="submit" className={questionsCSS.primary} disabled={atLimit || saving}>
                  {t("questions.add")}
                </button>
              </div>

              {atLimit && (
                <p className={questionsCSS.muted}>
                  {t("questions.error.limit")}
                </p>
              )}
              {error && <p className={questionsCSS.error}>{t(error)}</p>}
              {notice && <p className={questionsCSS.notice}>{t(notice)}</p>}
            </form>
          </section>
        </aside>
      </div>

      {pendingRemove && (
        <div className={questionsCSS.overlay} onClick={() => setPendingRemove(null)}>
          <div
            className={questionsCSS.dialog}
            role="dialog"
            aria-modal="true"
            aria-label={t("questions.removeTitle")}
            onClick={(event) => event.stopPropagation()}
          >
            <h2>{t("questions.removeTitle")}</h2>
            <p>
              "{pendingRemove.text}" {t("questions.removeBody")}
            </p>
            <div className={questionsCSS.actions}>
              <button
                type="button"
                className={questionsCSS.secondary}
                onClick={() => setPendingRemove(null)}
              >
                {t("questions.cancel")}
              </button>
              <button
                type="button"
                className={questionsCSS.danger}
                onClick={handleConfirmRemove}
              >
                {t("questions.remove")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default QuestionsPage