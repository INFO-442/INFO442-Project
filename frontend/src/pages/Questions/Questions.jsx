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
  "How was the food?",
  "How was the service?",
  "How was the wait time?",
  "How clean was the restaurant?",
  "What should we add to the menu?",
  "How did you hear about us?",
]
const answerTypes = [
  { value: "short_answer", label: "Short answer" },
  { value: "scale", label: "1-5 scale" },
  { value: "yes_no", label: "Yes / No" },
]

function answerTypeLabel(value) {
  const type = answerTypes.find((item) => item.value === value)
  return type ? type.label : value
}

function QuestionsPage() {
  const { session } = useAuth()
  const { language } = useLanguage()
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
        setLoadError("Couldn't load your questions. Check your connection and try again.")
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
      setNotice("✓ Questions saved. Your customer form is updated.")
      setText("")
      setSuggested("")
      setAnswerType("short_answer")
    } catch (addError) {
      setError(addError.message)
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
      setNotice("✓ Questions saved. Your customer form is updated.")
    } catch (removeError) {
      setError(removeError.message)
    }
  }
  if (loading) {
    return (
        <main className={questionsCSS.page}>
        <p className={questionsCSS.muted}>Loading your questions...</p>
      </main>
    )
  }

  if (loadError) {
    return (
        <main className={questionsCSS.page}>
        <p className={questionsCSS.error}>{loadError}</p>
      </main>
    )
  }
  return (
    <main className={questionsCSS.page}>
      <div className={questionsCSS.layout}>
        <div className={questionsCSS.mainColumn}>
          <h1>Your feedback questions</h1>
          <p className={questionsCSS.subtitle}>Create up to 5 questions.</p>

          <ul className={questionsCSS.list}>
            <li className={questionsCSS.row}>
              <span className={questionsCSS.number}>1.</span>
              <span aria-hidden="true">★</span>
              <span>{ratingQuestionLabel}</span>
              <span className={questionsCSS.pill}>Always on</span>
            </li>

            {questions.map((question, index) => (
              <li key={question.id} className={questionsCSS.row}>
                <span className={questionsCSS.number}>{index + 2}.</span>
                <span>{question.text}</span>
                <span className={questionsCSS.pill}>
                  {answerTypeLabel(question.answerType)}
                </span>
                {!question.suggestedKey && <span className={questionsCSS.pill}>Custom</span>}
                <button
                  type="button"
                  className={questionsCSS.linkButton}
                  onClick={() => setPendingRemove(question)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          {questions.length === 0 && (
            <p className={questionsCSS.muted}>
              No extra questions yet. Customers only see the rating.
            </p>
          )}
        </div>

        <aside className={questionsCSS.sideColumn}>
          <section className={questionsCSS.card}>
            <h2>Add a question</h2>

            <form className={questionsCSS.form} onSubmit={handleAdd}>
              <label className={questionsCSS.field}>
                Pick a suggested question
                <select className={questionsCSS.select} value={suggested} onChange={pickSuggested}>
                  <option value="">Choose a suggested question</option>
                  {suggestedQuestions.map((question) => (
                    <option key={question} value={question}>
                      {question}
                    </option>
                  ))}
                </select>
              </label>

              <label className={questionsCSS.field}>
                ...or write your own (any language)
                <input
                  type="text"
                  className={questionsCSS.input}
                  value={text}
                  placeholder="Type your question"
                  onChange={(event) => setText(event.target.value)}
                />
                <span className={questionsCSS.counter}>
                  {text.length} / {maxQuestionLength}
                </span>
              </label>

              <label className={questionsCSS.field}>
                Answer type
                <select
                  className={questionsCSS.select}
                  value={answerType}
                  onChange={(event) => setAnswerType(event.target.value)}
                >
                  {answerTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <button type="submit" className={questionsCSS.primary} disabled={atLimit || saving}>
                  + Add question
                </button>
              </div>

              {atLimit && (
                <p className={questionsCSS.muted}>
                  You can have up to 5 questions. Remove one to add another.
                </p>
              )}
              {error && <p className={questionsCSS.error}>{error}</p>}
              {notice && <p className={questionsCSS.notice}>{notice}</p>}
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
            aria-label="Remove question"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Remove this question?</h2>
            <p>
              Remove “{pendingRemove.text}” Past answers will still appear on your
              dashboard.
            </p>
            <div className={questionsCSS.actions}>
              <button
                type="button"
                className={questionsCSS.secondary}
                onClick={() => setPendingRemove(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={questionsCSS.danger}
                onClick={handleConfirmRemove}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default QuestionsPage