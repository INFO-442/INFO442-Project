import { useEffect, useState } from "react"
import questionsCSS from "./Questions.module.css"

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
const initialQuestions = [
  {
    id: "q1",
    text: "How was the food?",
    answerType: "short_answer",
    suggestedKey: "How was the food?",
  },
  {
    id: "q2",
    text: "How was the wait time?",
    answerType: "scale",
    suggestedKey: "How was the wait time?",
  },
]

const storageKey = "wingman.questions"

function loadQuestions() {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : initialQuestions
  } catch {
    return initialQuestions
  }
}

function answerTypeLabel(value) {
  const type = answerTypes.find((item) => item.value === value)
  return type ? type.label : value
}

function QuestionsPage() {
  const [questions, setQuestions] = useState(loadQuestions)
  const [suggested, setSuggested] = useState("")
  const [text, setText] = useState("")
  const [answerType, setAnswerType] = useState("short_answer")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [pendingRemove, setPendingRemove] = useState(null)

  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(""), 3000)
    return () => clearTimeout(timer)
  }, [notice])

  const atLimit = questions.length >= maxQuestions

  function saveQuestions(next) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setQuestions(next)
      setNotice("✓ Questions saved. Your customer form is updated.")
      return true
    } catch {
      setError("Couldn't save your questions. Check your connection and try again.")
      return false
    }
  }

  function pickSuggested(event) {
    const value = event.target.value
    setSuggested(value)
    if (value) {
      setText(value)
      setError("")
    }
  }

  function handleAdd(event) {
    event.preventDefault()
    const trimmed = text.trim()

    if (!trimmed) {
      setError("Please type a question or pick a suggested one.")
      return
    }
    if (trimmed.length > maxQuestionLength) {
      setError("Questions must be 200 characters or less.")
      return
    }
    const existing = [ratingQuestionLabel, ...questions.map((question) => question.text)]
    if (existing.some((question) => question.toLowerCase() === trimmed.toLowerCase())) {
      setError("This question is already on your form.")
      return
    }
    if (atLimit) {
      setError("You can have up to 5 questions. Remove one to add another.")
      return
    }

    setError("")
    const suggestedKey = suggested === trimmed ? suggested : ""
    const next = [
      ...questions,
      { id: `q-${Date.now()}`, text: trimmed, answerType, suggestedKey },
    ]
    if (!saveQuestions(next)) return
    setText("")
    setSuggested("")
    setAnswerType("short_answer")
  }

  function handleConfirmRemove() {
    const question = pendingRemove
    setPendingRemove(null)
    saveQuestions(questions.filter((item) => item.id !== question.id))
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
                <button type="submit" className={questionsCSS.primary} disabled={atLimit}>
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
