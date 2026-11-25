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
import { ensureTranslations } from '@/pages/Feedback/Feedback.controller.js';
import QRCode from "qrcode"

import { GoogleGenAI } from "@google/genai";
import * as z from "zod";

const STARS = { 5: "★★★★★", 4: "★★★★☆", 3: "★★★☆☆", 2: "★★☆☆☆", 1: "★☆☆☆☆", }
const AI_COOLDOWN_MILLISECONDS = 60000

function DashboardPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const userId = session.user.id;

  const [restaurant, setRestaurant] = useState(null);

  const [timeRange, setTimeRange] = useState(30); // "" is all time otherwise n days
  const [stats, setStats] = useState(undefined)
  const [recentFeedback, setRecentFeedback] = useState(undefined)
  const [AIsummaryData, setAIsummaryData] = useState(undefined)
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
    setAIsummaryData(undefined);
    hasFeedback(supabase, restaurant.id).then(async (has) => {
      if (!has) {
        setStats(null);
        setAIsummaryData(null);
        return;
      }
      await ensureTranslations(supabase, restaurant.id);
      getFeedback(supabase, restaurant.id, timeRange)
        .then((res) => {
          if (res.length >= 3) loadAISummary(res)
          else setAIsummaryData(null);
          setFeedbackData(res)
          getPastFeedback(supabase, restaurant.id, timeRange)
            .then((pastRes) => { return computeStats(pastRes, res) })
            .then(setStats)
            .catch(setError)
          return getResponseForEachFeedback(supabase, res.slice(0, 5))
        })
        .then(setRecentFeedback)
        .catch(setError);
    })

  }, [restaurant, timeRange]);

  async function loadAISummary(feedbackData) {
    try {
      const existingSummary = await getAISummary(supabase, restaurant.id, timeRange, restaurant.feedback_language, feedbackData.length);
      if (existingSummary && existingSummary.language === restaurant.feedback_language) { setAIsummaryData(existingSummary); return }
      generateAISummary(feedbackData)
    } catch (error) { setAIsummaryData(false) }
  }


  async function generateAISummary(feedbackData) {
    try {
      const content = await computeAISummary(z, supabase, GoogleGenAI, feedbackData, LABELS[restaurant.feedback_language], import.meta.env.VITE_GEMINI_API_KEY)
      const summary = await uploadAISummary(supabase, content, feedbackData.length, restaurant.id, timeRange, restaurant.feedback_language)
      setAIsummaryData(summary)
    } catch (error) { setAIsummaryData(false) }
  }

  function handleLoadAIButton() {
    loadAISummary(feedbackData);
  }
  function handleRegenerateAIButton() {
    setAIsummaryData(undefined)
    generateAISummary(feedbackData);
  }


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

  if (stats === undefined) return <main className={dashboardCSS.page}><h3>{t("dashboard.loading")}</h3></main>

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
          <AISection summary={AIsummaryData} handleLoadAIButton={handleLoadAIButton} handleRegenerateAIButton={handleRegenerateAIButton}/>
          <RatingsSection feedback={feedbackData} timeRange={timeRange}/>
          <SentimentSection feedback={feedbackData}/>
          <FeedbackSection feedbackData={recentFeedback}/>
        </section>

      </main>
  )
}

function AISection({ summary, handleLoadAIButton, handleRegenerateAIButton }) {
  const { t, language } = useLanguage();

  if (summary === undefined) return <div className={dashboardCSS.ai}><p>{t("dashboard.loading")}</p></div>
  if (summary === null) return <div className={dashboardCSS.ai}><p>{t("dashboard.notEnoughFeedback")}</p></div>
  if (summary === false) {
    return <div className={dashboardCSS.ai}>
      <div className={dashboardCSS.error}>
        <span>{t("dashboard.summaryUnavailable")} {t("dashboard.feedbackSafe")} </span>
        <RetryAIButton onClick={handleLoadAIButton} label={t("dashboard.retrySummary")} cooldownLabel={t("dashboard.retryCooldown")} />
      </div>
    </div>
  }

  const content = summary.content;
  const dateText = computeAITimeText(summary.created_at, language, t);
  return <div className={dashboardCSS.ai}>
    <h3>{t("dashboard.aiSummaryTitle")}</h3>
    <p><strong>{t("dashboard.customersLove")}</strong> {content.loves.length === 0 ? t("dashboard.none") : content.loves.join(", ")}</p>
    <p><strong>{t("dashboard.commonComplaints")}</strong> {content.complaints.length === 0 ? t("dashboard.none") : content.complaints.join(", ")}</p>
    <p><strong>{t("dashboard.suggestions")}</strong> {content.suggestions.length === 0 ? t("dashboard.noSuggestions") : content.suggestions.join(", ")}</p>
    <div className={dashboardCSS.footer}>
      <span>{t("dashboard.updated")} {dateText} · {t("dashboard.basedOn")} {summary.response_count} {t("dashboard.responses")} · </span>
      <RegenerateAIButton createdAt={summary.created_at} onClick={handleRegenerateAIButton} label={t("dashboard.regenerate")} cooldownLabel={t("dashboard.regenerateCooldown")} />
      <p>{t("dashboard.aiDisclaimer")}</p>
    </div>
  </div>
}
function RetryAIButton({ onClick, label, cooldownLabel }) {
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const isCoolingDown = now < cooldownUntil;

  useEffect(() => {
    const remaining = cooldownUntil - Date.now();
    if (remaining <= 0) return;
    const timeout = setTimeout(() => setNow(Date.now()), remaining);
    return () => clearTimeout(timeout);
  }, [cooldownUntil, now]);

  function handleClick() {
    if (Date.now() < cooldownUntil) return;
    setCooldownUntil(Date.now() + AI_COOLDOWN_MILLISECONDS);
    onClick();
  }

  return <button onClick={handleClick} disabled={isCoolingDown}>{isCoolingDown ? cooldownLabel : label}</button>;
}

function RegenerateAIButton({ createdAt, onClick, label, cooldownLabel }) {
  const [now, setNow] = useState(Date.now());
  const createdAtTime = Date.parse(createdAt);
  const isCoolingDown = Number.isFinite(createdAtTime) && now >= createdAtTime && now - createdAtTime < AI_COOLDOWN_MILLISECONDS;

  useEffect(() => {
    const remaining = createdAtTime + AI_COOLDOWN_MILLISECONDS - Date.now();
    if (!Number.isFinite(createdAtTime) || remaining <= 0) return;
    const timeout = setTimeout(() => setNow(Date.now()), remaining);
    return () => clearTimeout(timeout);
  }, [createdAtTime, now]);

  return <button onClick={onClick} disabled={isCoolingDown}>{isCoolingDown ? cooldownLabel : label}</button>;
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
            <span className={dashboardCSS.rating}>{STARS[feedback.rating]}</span>
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
