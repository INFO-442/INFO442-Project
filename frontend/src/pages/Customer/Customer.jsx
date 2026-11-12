import { useRef, useState, useEffect } from "react"
import { useParams } from "react-router"
import customerCSS from "./Customer.module.css"
import { demoRestaurant } from "./demoRestaurant.js"
import { useLanguage } from "@/i18n/LanguageContext.jsx"

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'

const maxAnswerLength = 1000
const counterFrom = 900
const storageKey = "wingman.customer.responses"

function saveResponse(response) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const stored = localStorage.getItem(storageKey)
        const list = stored ? JSON.parse(stored) : []
        list.push(response)
        localStorage.setItem(storageKey, JSON.stringify(list))
        resolve()
      } catch (error) {
        reject(error)
      }
    }, 300)
  })
}

function CustomerPage() {
  const { business } = useParams()
  const { t, language } = useLanguage()
  const [rating, setRating] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [ratingError, setRatingError] = useState(false)
  const ratingRef = useRef(null)

  if (business !== demoRestaurant.slug) {
    return (
      <div className={customerCSS.page}>
        <p className={customerCSS.invalid}>{t("customer.invalid")}</p>
      </div>
    )
  }

  function setAnswer(questionId, value) {
    setAnswers((current) => ({ ...current, [questionId]: value }))
  }
  function appendAnswer(questionId, value) {
    setAnswers((current) => ({ ...current, [questionId]: (questionId in current ? current[questionId] : "") + value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    if (rating === 0) {
      setRatingError(true)
      ratingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    setSubmitting(true)
    setError("")
    try {
      await saveResponse({
        restaurant: demoRestaurant.slug,
        rating,
        answers,
        submittedAt: new Date().toISOString(),
      })
      setSubmitted(true)
    } catch {
      setError(t("customer.sendError"))
    } finally {
      setSubmitting(false)
    }
  }

  function startOver() {
    setRating(0)
    setAnswers({})
    setSubmitted(false)
    setError("")
    setRatingError(false)
  }


  const [voiceQID, setVoiceQID] = useState(null) // voice questionID

  const {
    transcript,
    listening,
    interimTranscript,
    finalTranscript,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition();


  async function handleVoice(questionID) {
    if (listening && voiceQID === questionID) {
      await SpeechRecognition.stopListening();
      if (finalTranscript === "" && interimTranscript !== "") appendAnswer(voiceQID, interimTranscript + ". ")
      resetTranscript();
      setVoiceQID(null);
    } else {
      if (listening) {
        await SpeechRecognition.stopListening();
        if (finalTranscript === "" && interimTranscript !== "") appendAnswer(voiceQID, interimTranscript + ". ")
        resetTranscript();
      }

      await SpeechRecognition.startListening({ continuous: true, language });
      setVoiceQID(questionID);
    }
  }


  useEffect(() => {
  if (finalTranscript) {
    appendAnswer(voiceQID, finalTranscript + ". ")
    resetTranscript();
  }
  }, [finalTranscript])

  useEffect(() => {
  if (!isMicrophoneAvailable) {
    SpeechRecognition.stopListening();
    setVoiceQID(null);
  }
}, [isMicrophoneAvailable]);

  if (submitted) {
    return (
      <div className={customerCSS.page}>
        <div className={customerCSS.thanks}>
          <div className={customerCSS.check} aria-hidden="true">
            ✓
          </div>
          <h1>{t("customer.thanks")}</h1>
          <p>
            {demoRestaurant.name} {t("customer.thanksBody")}
          </p>
          <button type="button" className={customerCSS.submit} onClick={startOver}>
            {t("customer.another")}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={customerCSS.page}>
      <form className={customerCSS.form} onSubmit={handleSubmit}>
        <h1>{t("customer.title")}</h1>

        <fieldset
          className={`${customerCSS.block} ${customerCSS.ratingBlock}`}
          ref={ratingRef}
        >
          <legend className={customerCSS.legend}>
            {t("customer.rating")} <span className={customerCSS.required}>*</span>
          </legend>
          <div className={`${customerCSS.stars} ${ratingError ? customerCSS.starsError : ""}`}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value}`}
                aria-pressed={rating === value}
                className={value <= rating ? customerCSS.starOn : customerCSS.starOff}
                onClick={() => {
                  setRating(value)
                  setRatingError(false)
                }}
              >
                ★
              </button>
            ))}
          </div>
          {ratingError && <p className={customerCSS.error}>{t("customer.needRating")}</p>}
        </fieldset>

        {demoRestaurant.questions.map((question) => (
          <fieldset
            key={question.id}
            className={`${customerCSS.block}${
              question.id === "q2" ? ` ${customerCSS.tightBlock}` : ""
            }`}
          >
            <legend className={customerCSS.legend}>
              {question.text[language] ?? question.text.en}
            </legend>

            {question.answerType === "short_answer" && (
              <>
              <div className={customerCSS.short_answer}>
                <div>
                <textarea
                  className={customerCSS.textarea}
                  rows={3}
                  maxLength={maxAnswerLength}
                  placeholder={t("customer.shortAnswer")}
                  disabled={voiceQID === question.id && interimTranscript !== ""}
                  value={(answers[question.id] ?? "") +
                        ((voiceQID === question.id  && interimTranscript !== "") ? interimTranscript + "..." : "")}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                />
                {(answers[question.id]?.length ?? 0) >= counterFrom && (
                  <p className={customerCSS.counter}>
                    {answers[question.id].length} / {maxAnswerLength}
                  </p>
                )}
                </div>
                <button type="button" disabled={!isMicrophoneAvailable} className={`${customerCSS.voice_button}
                ${voiceQID === question.id ? customerCSS.listening : ""}`} onClick={() => handleVoice(question.id)}>
                  {voiceQID === question.id ? t("customer.stop") : t("customer.rec")}
                </button>
              </div>
              {browserSupportsSpeechRecognition && voiceQID === question.id &&
              <p className={customerCSS.stop_text}>● {t("customer.voice")}</p>}
              </>
            )}

            {question.answerType === "scale" && (
              <div className={customerCSS.scale}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      answers[question.id] === value ? customerCSS.chipOn : customerCSS.chip
                    }
                    onClick={() => setAnswer(question.id, value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}

            {question.answerType === "yes_no" && (
              <div className={customerCSS.scale}>
                <button
                  type="button"
                  className={answers[question.id] === true ? customerCSS.chipOn : customerCSS.chip}
                  onClick={() => setAnswer(question.id, true)}
                >
                  {t("customer.yes")}
                </button>
                <button
                  type="button"
                  className={answers[question.id] === false ? customerCSS.chipOn : customerCSS.chip}
                  onClick={() => setAnswer(question.id, false)}
                >
                  {t("customer.no")}
                </button>
              </div>
            )}
          </fieldset>
        ))}

        {error && <p className={customerCSS.error}>{error}</p>}

        <button type="submit" className={customerCSS.submit} disabled={submitting}>
          {submitting ? t("customer.submitting") : t("customer.submit")}
        </button>
      </form>
    </div>
  )
}

export default CustomerPage
