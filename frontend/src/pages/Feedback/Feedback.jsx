import feedbackCSS from './Feedback.module.css'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { useAuth } from "@/context/AuthContext.jsx"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/i18n/LanguageContext.jsx"
import { ensureTranslations, loadFeedback } from './Feedback.controller.js'

const stars = {
    5: "★★★★★",
    4: "★★★★☆",
    3: "★★★☆☆",
    2: "★★☆☆☆",
    1: "★☆☆☆☆",
  }

function answerText(response) {
  if (response.native_text) {
    return response.native_text
  }
  if (response.scale_value !== null && response.scale_value !== undefined) {
    return String(response.scale_value)
  }
  if (response.yes_no === true) {
    return "Yes"
  }
  if (response.yes_no === false) {
    return "No"
  }
  return ""
}

function toPageFeedback(feedback) {
  let voice = false
  const responses = []

  for (let i = 0; i < feedback.responses.length; i++) {
    const response = feedback.responses[i]
    const original = answerText(response)

    let questionText = ""
    let questionType = ""
    if (response.questions) {
      questionText = response.questions.main_text
      questionType = response.questions.answer_type
    }

    let translated = original
    if (response.translated_text) {
      translated = response.translated_text
    }

    if (response.by_voice) {
      voice = true
    }

    responses.push({
      Response_ID: response.question_id,
      Question_ID: response.question_id,
      Question_Type: questionType,
      Question_Native: questionText,
      Question_Translated: questionText,
      Native: original,
      Translated: translated,
    })
  }

  let sentiment = "—"
  if (feedback.sentiment) {
    sentiment = feedback.sentiment[0].toUpperCase() + feedback.sentiment.slice(1)
  }

  return {
    Feedback_ID: feedback.id,
    Language: feedback.language,
    Date: feedback.submitted_at,
    voice: voice,
    Rating: feedback.rating,
    Sentiment: sentiment,
    Responses: responses,
  }
}

function sentimentLabel(t, sentiment) {
  if (sentiment === "—") {
    return "—"
  }
  return t("dashboard.sentiment." + sentiment.toLowerCase())
}

function FeedbackPage() {
  const { session } = useAuth()
  const { t } = useLanguage()
  const userId = session.user.id
  const [searchParams] = useSearchParams()
  const sentimentFromUrl = searchParams.get("sentiment")

  const sortFuncs = {
    new: (a, b) => b.Date.localeCompare(a.Date),
    old: (a, b) => a.Date.localeCompare(b.Date),
    high: (a, b) => b.Rating - a.Rating,
    low: (a, b) => a.Rating - b.Rating,
  }
  const [feedbackList, setFeedbackList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [fullFeedback, setFullFeedback] = useState(null);

  const [sort, setSort] = useState("new");
  const [rating, setRating] = useState("");
  const [sentiment, setSentiment] = useState(
    sentimentFromUrl ? sentimentFromUrl[0].toUpperCase() + sentimentFromUrl.slice(1) : "",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("restaurants")
          .select("id, feedback_language")
          .eq("owner_id", userId)
          .single()
        if (error) {
          throw error
        }
        setPreferredLanguage(data.feedback_language)

        await ensureTranslations(supabase, data.id)
        const list = await loadFeedback(supabase, data.id)
        const pageList = []
        for (let i = 0; i < list.length; i++) {
          pageList.push(toPageFeedback(list[i]))
        }
        setFeedbackList(pageList)
      } catch {
        setFeedbackList(null)
      }
      setLoading(false)
    }
    load()
  }, [userId])

  function clearFilters() {
    setSort("new");
    setRating("");
    setSentiment("");
    setSearch("");
  }

  const filterProps = { sort, rating, sentiment, search, setSort, setRating, setSentiment, setSearch };

  if (loading) {
    return (
      <main className={feedbackCSS.page}>
        <h1>{t("feedback.title")}</h1>
        <p>{t("feedback.loading")}</p>
      </main>
    )
  }

  let filtered = null;
  if (feedbackList !== null) {
    filtered = feedbackList.slice();
  }
  let pageCount = 0;
  let displayedFeedbacks = [];
  if (filtered !== null && filtered.length === 0) filtered = undefined;
  if (filtered !== null && filtered !== undefined) {
    if (rating !== "") { filtered = filtered.filter(f => f.Rating == rating) }
    if (sentiment !== "") { filtered = filtered.filter(f => f.Sentiment == sentiment) }
    if (search !== "") { // Search may be too slow if load-tested, can switch to an inverted index method if needed
      filtered = filtered.filter(f =>
        f.Responses.some(response =>
          {
            return response.Translated.toLocaleLowerCase().includes(search.toLocaleLowerCase()) ||
                   response.Question_Translated.toLocaleLowerCase().includes(search.toLocaleLowerCase())
          }
    ));}
    filtered.sort(sortFuncs[sort])
    pageCount = Math.ceil(filtered.length / 10);
    displayedFeedbacks = filtered.slice((page - 1) * 10, page * 10);
  }


  return (
    <main className={feedbackCSS.page}>
      <h1>{t("feedback.title")}</h1>
      <Filters {...filterProps}/>
      { (filtered !== null && filtered !== undefined) && <>
        <div className={feedbackCSS.tableDiv}>
          <table className={feedbackCSS.table}>
            <thead>
              <tr>
                <th>{t("feedback.date")}</th>
                <th>{t("feedback.rating")}</th>
                <th className={feedbackCSS.wideColumn} >{t("feedback.column").replace("{language}", t(`language.${preferredLanguage}`))}</th>
                <th>{t("feedback.sentiment")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered !== null && filtered.length > 0 && displayedFeedbacks.map((feedback) =>
                (<TableRow key={feedback.Feedback_ID} feedback={feedback} setFullFeedback={setFullFeedback} /> )
              )}
            </tbody>
          </table>
          {filtered.length == 0 && <div className={feedbackCSS.noFeedback}>
            <span>{t("feedback.noMatch")} </span>
            <button onClick={clearFilters}>{t("feedback.clearFilters")}</button>
          </div> }
          {filtered.length > 0 && pageCount == 1 && <div className={feedbackCSS.tableFooter}><span>{t("feedback.page").replace("{page}", page).replace("{count}", pageCount)}</span></div>}
        </div>
        {(filtered.length > 0 && pageCount != 1) &&
          <div className={feedbackCSS.tableFooter}>
            {page !== 1 ? <button onClick={() => {setPage(page - 1)}}>{t("feedback.prev")}</button> : <span></span>}
            <span>{t("feedback.page").replace("{page}", page).replace("{count}", pageCount)}</span>
            {page !== pageCount ? <button onClick={() => {setPage(page + 1)}}>{t("feedback.next")}</button> : <span></span>}
          </div>}
        {(fullFeedback && <FullResponse feedback={fullFeedback} preferredLanguage = {preferredLanguage}/>)}
      </>}
      {filtered === null && <p className={feedbackCSS.errorMessage}>{t("feedback.loadError")}</p>}
      {filtered === undefined && <p>{t("feedback.empty")}</p>}
    </main>
  )
}

function Filters({search, rating, sentiment, sort, setSearch, setRating, setSentiment, setSort}) {
  const { t } = useLanguage()
  return <div className={feedbackCSS.filterDiv}>
        <input className={feedbackCSS.search} value={search} type="text" required minLength="2"
        placeholder={t("feedback.search")} onChange={(e) =>
        setSearch(e.target.value.toLocaleLowerCase())}/>
        <select value={rating} onChange={(e) => setRating(e.target.value)}>
          <option value="">{t("feedback.rating")}: {t("feedback.all")}</option>
          <option value="5">{t("feedback.rating")}: 5</option>
          <option value="4">{t("feedback.rating")}: 4</option>
          <option value="3">{t("feedback.rating")}: 3</option>
          <option value="2">{t("feedback.rating")}: 2</option>
          <option value="1">{t("feedback.rating")}: 1</option>
        </select>
        <select value={sentiment} onChange={(e) => setSentiment(e.target.value)}>
          <option value="">{t("feedback.sentiment")}: {t("feedback.all")}</option>
          <option value="Positive">{t("feedback.sentiment")}: {t("dashboard.sentiment.positive")}</option>
          <option value="Neutral">{t("feedback.sentiment")}: {t("dashboard.sentiment.neutral")}</option>
          <option value="Negative">{t("feedback.sentiment")}: {t("dashboard.sentiment.negative")}</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="new">{t("feedback.sort.new")}</option>
          <option value="old">{t("feedback.sort.old")}</option>
          <option value="high">{t("feedback.sort.high")}</option>
          <option value="low">{t("feedback.sort.low")}</option>
        </select>
      </div>
}

function TableRow({ feedback, setFullFeedback }) {
  const { t, language } = useLanguage()
  return <tr>
    <td>{new Date(feedback.Date).toLocaleString(language, { month: "short", day: "numeric"})}</td>
    <td><span className={feedbackCSS.rating}>{stars[feedback.Rating]}</span></td>
    <td><Feedback setFullFeedback={setFullFeedback} feedback={feedback} /></td>
    <td><span className={`${feedbackCSS.sentiment} ${
            feedback.Sentiment === "Positive" ? feedbackCSS.positive : feedback.Sentiment === "Negative"
            ? feedbackCSS.negative : feedbackCSS.neutral}`}>
            {sentimentLabel(t, feedback.Sentiment)}</span></td>
  </tr>
}

function Feedback({ setFullFeedback, feedback }) {
  const { t } = useLanguage()
  const [translated, setTranslated] = useState(true);
  const response = feedback.Responses.find((response) => response.Question_Type === "short_answer");

  return <>
      {response ? <span>Q: {translated ? response.Question_Translated : response.Question_Native} →
          "{translated ? response.Translated.substring(0, 10) : response.Native.substring(0, 10)}..."</span>
        : <span>{t("dashboard.noWrittenComments")}</span>}
      <div className={feedbackCSS.feedbackUnder}>
        <span>{t("dashboard.original")} {t(`language.${feedback.Language}`)} </span>
        <button onClick={() => setTranslated(!translated)} >{translated ? t("dashboard.showOriginal") : t("dashboard.showTranslated")}</button>
        <button onClick={() => setFullFeedback(feedback)} command="show-modal" commandfor="full-response">{t("feedback.viewFull")}</button>
      </div>
  </>
}

function FullResponse({ feedback, preferredLanguage}) {
  const { t, language } = useLanguage()
  const dateText = new Date(feedback.Date).toLocaleString(language, {
          month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit" })
  return <dialog id="full-response" className={feedbackCSS.fullResponse}>
        <div className={feedbackCSS.responseHeader}>
          <h3>{t("feedback.response")} · {dateText}</h3>
          <button commandfor="full-response" command="close">✕</button>
        </div>
        <div className={feedbackCSS.subheader}>
          <span className={feedbackCSS.rating}>{stars[feedback.Rating]}</span>
          <span className={`${feedbackCSS.sentiment} ${
            feedback.Sentiment === "Positive" ? feedbackCSS.positive : feedback.Sentiment === "Negative"
              ? feedbackCSS.negative : feedbackCSS.neutral
          }`}>
            {sentimentLabel(t, feedback.Sentiment)}
          </span>
          {(feedback.voice && <span className={feedbackCSS.sentiment}>{t("feedback.byVoice")}</span>)}
        </div>
        <div>
          {feedback.Responses.map((response, i) =>
            (<div key={response.Response_ID} className={feedbackCSS.response}>
              <h4>Q{i + 1}: {response.Question_Translated}</h4>
              <div className={feedbackCSS.responseAnswers}>
                <div>
                  <p>{response.Translated === "" ? t("feedback.noAnswer") : response.Translated}</p>
                  <span>{t("feedback.translated").replace("{language}", t(`language.${preferredLanguage}`))}</span>
                </div>
                <div>
                  <p>{response.Native === "" ? t("feedback.noAnswer") : response.Native}</p>
                  <span>{t("feedback.originalLanguage").replace("{language}", t(`language.${feedback.Language}`))}</span>
                </div>
              </div>
            </div>)
          )}
        </div>
        <p className={feedbackCSS.responseFooter}>{t("feedback.machineNote")}</p>
      </dialog>
}


export default FeedbackPage
