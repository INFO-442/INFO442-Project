import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';

import dashboardCSS from './Dashboard.module.css'
import { useAuth } from "@/context/AuthContext.jsx"
import { useLanguage } from "@/i18n/LanguageContext.jsx"
import { supabase } from "@/lib/supabase";
import { LABELS } from '@/i18n/translations';
import { computeStats, hasFeedback, getFeedback, getPastFeedback,
         getResponseForEachFeedback, buildRatingSeries, countSentiment,
         getAISummary, computeAISummary, uploadAISummary, computeAITimeText
       } from './Dashboard.controller.js';
import RatingChart from '@/components/Charts/RatingChart.jsx';
import SentimentChart from '@/components/Charts/SentimentChart.jsx';
import QRCode from "qrcode"

const stars = {
    5: "★★★★★",
    4: "★★★★☆",
    3: "★★★☆☆",
    2: "★★☆☆☆",
    1: "★☆☆☆☆",
  }

function DashboardPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const userId = session.user.id;

  const [restaurant, setRestaurant] = useState(null);

  const [timeRange, setTimeRange] = useState(30); // "" is all time otherwise n days
  const [stats, setStats] = useState(undefined)
  const [recentFeedback, setRecentFeedback] = useState(undefined)
  const [AIsummaryData, setAIsummaryData] = useState(null)
  const [feedbackData, setFeedbackData] = useState(null)
  const [qrCode, setQrCode] = useState("")
  const [link, setLink] = useState("")
  const [copyState, setCopyState] = useState("")
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId) return;

    supabase
      .from("restaurants")
      .select()
      .eq("owner_id", userId)
      .single()
      .then(({ data, error }) => {
        if (error) throw Error;
        setRestaurant(data);
        const linkTemp = `${window.location.origin}/f/${data.slug}`;
        setLink(linkTemp);
        QRCode.toDataURL(linkTemp, { width: 200, margin: 1 })
          .then(setQrCode)
          .catch(() => setQrCode(""))
      })
      .catch(setError);

  }, [userId]);

  useEffect(() => {
    if (!restaurant) return;

    hasFeedback(supabase, restaurant.id).then((has) => {
      if (has) {
        getFeedback(supabase, restaurant.id, timeRange)
          .then((res) => {
            setFeedbackData(res)
            getPastFeedback(supabase, restaurant.id, timeRange)
              .then((pastRes) => { return computeStats(pastRes, res) })
              .then(setStats)
              .catch(setError)
            const feedbackData = res;
            if (feedbackData.length > 3) {
              getAISummary(supabase, restaurant.id, timeRange)
                .then((res) => {
                  if (res && feedbackData.length == res.response_count) {
                    setAIsummaryData(res);
                  } else {
                    computeAISummary(feedbackData)
                      .then(res => uploadAISummary(supabase, res, feedbackData.length,
                                                   restaurant.id, timeRange, restaurant.feedback_language))
                      .then(setAIsummaryData)
                  }
                })
            } else {
              setAIsummaryData(false)
            }
            return getResponseForEachFeedback(supabase, res.slice(0, 5))
          })
          .then(setRecentFeedback)
          .catch(setError);
      } else {
        setStats(null);
      }
    })

  }, [restaurant, timeRange]);


  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopyState("copied")
    } catch {
      setCopyState("copyFailed")
    }
  }

  if (error) {
    return  <main className={dashboardCSS.page}>
      <div className={dashboardCSS.error}>
        <span>{t("dashboard.loadError")} </span>
        <Link to={"/"} reloadDocument>{t("dashboard.tryAgain")}</Link>
      </div>
    </main>
  }

  if (stats === undefined) {
    return  <main className={dashboardCSS.page}>
      <h3>{t("dashboard.loading")}</h3>
    </main>
  }
  if (stats === null) {
    return <main className={dashboardCSS.page}>
        <h1 className={dashboardCSS.welcome}>{t("dashboard.welcome")}, {restaurant && restaurant.owner_name} — {restaurant && restaurant.name}</h1>
        <div className={dashboardCSS.no_feedback}>
          <h2>{t("dashboard.noFeedback")}</h2>
          <p>{t("dashboard.noFeedbackBody")}</p>
            <div className={dashboardCSS.qrRow}>
              {qrCode ? (
                <img
                  className={dashboardCSS.qrImage}
                  src={qrCode}
                  alt={t("dashboard.qrCode")}
                />
              ) : (
                <div className={dashboardCSS.qrPlaceholder}>{t("dashboard.qrCode")}</div>
              )}
              <div>
                <div className={dashboardCSS.inputs}>
                  <input
                    type="text"
                    className={dashboardCSS.inputLink}
                    value={link}
                    readOnly
                    onFocus={(event) => event.target.select()}
                  />
                  <div className={dashboardCSS.buttons}>
                    <button type="button" className={dashboardCSS.copy} onClick={handleCopy}>
                      {t("dashboard.copyLink")}
                    </button>
                    {qrCode && (
                      <a className={dashboardCSS.download} href={qrCode} download="wingman-qr.png">
                        {t("dashboard.downloadQr")}
                      </a>
                    )}
                  </div>
                </div>
                {copyState && <p className={dashboardCSS.muted}>{t(`dashboard.${copyState}`)}</p>}
              </div>
            </div>
            <div className={dashboardCSS.next_steps}>
              <span>{t("dashboard.nextStep")} </span>
              <Link to="/questions">{t("dashboard.chooseQuestions")}</Link></div>
        </div>

    </main>
  }


  return (
      <main className={dashboardCSS.page}>
        <h1 className={dashboardCSS.welcome}>{t("dashboard.welcome")}, {restaurant && restaurant.owner_name} — {restaurant && restaurant.name}</h1>
        <div className={dashboardCSS.subheader}>
          <span>{t("dashboard.feedbackLanguage")} <b>{restaurant && LABELS[restaurant.feedback_language]}</b></span>
          <label>{t("dashboard.timeRange")}</label>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="7">{t("dashboard.last7Days")}</option>
            <option value="30">{t("dashboard.last30Days")}</option>
            <option value="90">{t("dashboard.last3Months")}</option>
            <option value="">{t("dashboard.allTime")}</option>
          </select>
        </div>
        <div className={dashboardCSS.stats}>
          {stats && Object.entries(stats).map(([label, value]) => (
            <div key={label} className={dashboardCSS.statBox}>
              <p>{value}</p>
              <span>{t(`dashboard.${label}`)}</span>
            </div>
          ))}
        </div>
        <section className={dashboardCSS.graphics}>
          <AISection summary={AIsummaryData}/>
          <RatingsSection feedback={feedbackData} timeRange={timeRange}/>
          <SentimentSection feedback={feedbackData}/>
          <FeedbackSection feedbackData={recentFeedback}/>
        </section>

      </main>
  )
}

function AISection({ summary }) {
  const { t } = useLanguage();
  console.log(summary)
  if (summary === false) {
    return <div className={dashboardCSS.ai}><p>Not enough feedback to summarize yet. At least 3 responses are needed.</p></div>
  }
  if (summary === null) {
    return <div className={dashboardCSS.ai}>
        <div className={dashboardCSS.error}>
        <span>{t("dashboard.summaryUnavailable")} {t("dashboard.feedbackSafe")} </span>
        <Link to={"/"} reloadDocument>{t("dashboard.tryAgain")}</Link>
        <span> {t("dashboard.tryAgainSoon")}</span>
      </div>
    </div>
  }

  const dateText = computeAITimeText(summary.created_at);
  return <div className={dashboardCSS.ai}>
      <h3>AI summary of feedback</h3>
      <p><strong>Customers love:</strong> {summary.loves.length === 0 ? "None" : summary.loves.join(", ")}</p>
      <p><strong>Common complaints:</strong> {summary.complaints.length === 0 ? "None" : summary.complaints.join(", ")}</p>
      <p><strong>Suggestions:</strong> {summary.suggestions.length === 0 ? "No suggestions" : summary.suggestions.join(", ")}</p>
      <span>Updated {dateText} · based on {summary.response_count} responses · </span>
      <button>Regenerate</button>
  </div>
}
function RatingsSection({ feedback, timeRange }) {
  const { t } = useLanguage();
  const series = buildRatingSeries(feedback ?? [], timeRange);
  return <div className={dashboardCSS.ratings}>
      <h3>{t("dashboard.ratingChart")}</h3>
      <RatingChart series={series}/>
    </div>
}

function SentimentSection({ feedback }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const counts = countSentiment(feedback ?? []);
  return <div className={dashboardCSS.sentiment}>
      <h3>{t("dashboard.sentimentChart")}</h3>
      <SentimentChart counts={counts} onSelect={(key) => navigate(`/feedback?sentiment=${key}`)}/>
    </div>
}


function FeedbackSection({ feedbackData }) {
  const { t } = useLanguage();
  return <div className={dashboardCSS.feedback}>
      <div className={dashboardCSS.f_header}><h3>{t("dashboard.recentFeedback")}</h3><Link to="/feedback">{t("dashboard.seeAll")}</Link></div>
      {feedbackData && feedbackData.slice(0, 5).map((feedback) => {
        return <div className={dashboardCSS.feedbackRow} key={feedback.id}>
          <div>
            <span className={dashboardCSS.rating}>{stars[feedback.rating]}</span>
            <span className={dashboardCSS.bubble}>{t(`dashboard.sentiment.${feedback.sentiment}`)}</span>
            <span className={dashboardCSS.bubble}>{t("dashboard.original")} {LABELS[feedback.language]}</span>
          </div>
          <FeedbackText feedback={feedback}/>
        </div>
      })}
    </div>
}

function FeedbackText({ feedback }) {
  const { t } = useLanguage();
  const [translated, setTranslated] = useState(true);
  return <div>
        <span>{feedback.noWrittenComments ? t("dashboard.noWrittenComments") : translated ? feedback.translated_text : feedback.native_text}</span>
        {feedback.native_text !== "" && <button onClick={() => setTranslated(!translated)} >{translated ? t("dashboard.showOriginal") : t("dashboard.showTranslated")}</button>}
      </div>
}

export default DashboardPage
