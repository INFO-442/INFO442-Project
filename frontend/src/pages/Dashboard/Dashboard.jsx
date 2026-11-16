import { useState, useEffect } from 'react';
import { Link } from 'react-router';

import dashboardCSS from './Dashboard.module.css'
import { useAuth } from "@/context/AuthContext.jsx"
import { supabase } from "@/lib/supabase";
import { LABELS } from '@/i18n/translations';
import { computeStats, hasFeedback, getFeedback, getPastFeedback,
         getResponseForEachFeedback } from './Dashboard.controller.js';
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
  const userId = session.user.id;

  const [restaurant, setRestaurant] = useState(null);

  const [timeRange, setTimeRange] = useState(30); // "" is all time otherwise n days
  const [stats, setStats] = useState(undefined)
  const [recentFeedback, setRecentFeedback] = useState(undefined)
  const [qrCode, setQrCode] = useState("")
  const [link, setLink] = useState("")
  const [copyState, setCopyState] = useState("")

  useEffect(() => {
    if (!userId) return;

    supabase
      .from("restaurants")
      .select()
      .eq("owner_id", userId)
      .single()
      .then(({ data }) => {
        setRestaurant(data);
        const linkTemp = `${window.location.origin}/f/${data.slug}`;
        setLink(linkTemp);
        QRCode.toDataURL(linkTemp, { width: 200, margin: 1 })
          .then(setQrCode)
          .catch(() => setQrCode(""))
      });
  }, [userId]);

  useEffect(() => {
    if (!restaurant) return;

    hasFeedback(supabase, restaurant.id).then((has) => {
      if (has) {
        getFeedback(supabase, restaurant.id, timeRange)
          .then((res) => {
            getPastFeedback(supabase, restaurant.id, timeRange)
              .then((pastRes) => { return computeStats(pastRes, res) })
              .then(setStats)
                return getResponseForEachFeedback(supabase, res)
          })
          .then(setRecentFeedback);
      } else {
        setStats(null);
      }
    })

  }, [restaurant, timeRange]);


  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopyState("Copied!")
    } catch {
      setCopyState("Couldn't copy. Please select the link and copy it manually.")
    }
  }

  if (stats === undefined) {
    return  <main className={dashboardCSS.page}>
      <h3>Loading...</h3>
    </main>
  }
  if (stats === null) {
    return <main className={dashboardCSS.page}>
        <h1 className={dashboardCSS.welcome}>Welcome, {restaurant && restaurant.owner_name} — {restaurant && restaurant.name} </h1>
        <div className={dashboardCSS.no_feedback}>
          <h2>No customer feedback</h2>
          <p>Share your feedback link or QR code with customers. Their answers will appear here, translated into your language.</p>
            <div className={dashboardCSS.qrRow}>
              {qrCode ? (
                <img
                  className={dashboardCSS.qrImage}
                  src={qrCode}
                  alt="QR code for the feedback link"
                />
              ) : (
                <div className={dashboardCSS.qrPlaceholder}>QR code</div>
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
                      Copy Link
                    </button>
                    {qrCode && (
                      <a className={dashboardCSS.download} href={qrCode} download="wingman-qr.png">
                        Download QR (PNG)
                      </a>
                    )}
                  </div>
                </div>
                {copyState && <p className={dashboardCSS.muted}>{copyState}</p>}
              </div>
            </div>
            <div className={dashboardCSS.next_steps}>
              <span>Next step: </span>
              <Link to="/questions">Choose your feedback questions →</Link></div>
        </div>

    </main>
  }


  return (
      <main className={dashboardCSS.page}>
        <h1 className={dashboardCSS.welcome}>Welcome, {restaurant && restaurant.owner_name} — {restaurant && restaurant.name} </h1>
        <div className={dashboardCSS.subheader}>
          <span>Showing feedback in: <b>{restaurant && LABELS[restaurant.feedback_language]}</b></span>
          <label>Time range:</label>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="">All time</option>
          </select>
        </div>
        <div className={dashboardCSS.stats}>
          {stats && Object.entries(stats).map(([label, value]) => (
            <div key={label} className={dashboardCSS.statBox}>
              <p>{value}</p>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <section className={dashboardCSS.graphics}>
          <AISection/>
          <RatingsSection/>
          <SentimentSection/>
          <FeedbackSection feedbackData={recentFeedback}/>
        </section>

      </main>
  )
}

function AISection() {
  return <div className={dashboardCSS.ai}><p>AI Section</p></div>
}
function RatingsSection() {
  return <div className={dashboardCSS.ratings}><p>Ratings Section</p></div>
}
function SentimentSection() {
  return <div className={dashboardCSS.sentiment}><p>Sentiment Section</p></div>
}


function FeedbackSection({ feedbackData }) {
  return <div className={dashboardCSS.feedback}>
      <div className={dashboardCSS.f_header}><h3>Recent feedback</h3><Link to="/feedback">See all→</Link></div>
      {feedbackData && feedbackData.map((feedback) => {
        const capitalized = feedback.sentiment.charAt(0).toUpperCase() + feedback.sentiment.slice(1);
        return <div className={dashboardCSS.feedbackRow} key={feedback.id}>
          <div>
            <span className={dashboardCSS.rating}>{stars[feedback.rating]}</span>
            <span className={dashboardCSS.bubble}>{capitalized}</span>
            <span className={dashboardCSS.bubble}>Original: {LABELS[feedback.language]}</span>
          </div>
          <FeedbackText feedback={feedback}/>
        </div>
      })}
    </div>
}

function FeedbackText({ feedback }) {
  const [translated, setTranslated] = useState(true);
  return <div>
        <span>{translated ? feedback.translated_text : feedback.native_text}</span>
        {feedback.native_text !== "" && <button onClick={() => setTranslated(!translated)} >Show {translated ? "original" : "translated"}</button>}
      </div>
}

export default DashboardPage
