import { useState, useEffect } from 'react';

import dashboardCSS from './Dashboard.module.css'
import { useAuth } from "@/context/AuthContext.jsx"
import { supabase } from "@/lib/supabase";
import { LABELS } from '@/i18n/translations';
import { computeStats, getFeedback, getPastFeedback,
         getResponseForEachFeedback } from './Dashboard.controller.js';

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

  const [timeRange, setTimeRange] = useState(30); // -1 is all time otherwise days
  const [stats, setStats] = useState(null)
  const [recentFeedback, setRecentFeedback] = useState(null)

  useEffect(() => {
    if (!userId) return;

    supabase
      .from("restaurants")
      .select()
      .eq("owner_id", userId)
      .single()
      .then(({ data }) => {
        setRestaurant(data);
      });
  }, [userId]);

  useEffect(() => {
    if (!restaurant) return;

    getFeedback(supabase, restaurant.id, timeRange)
      .then((res) => {
        getPastFeedback(supabase, restaurant.id, timeRange)
          .then((pastRes) => { return computeStats(pastRes, res) })
          .then(setStats)
        return getResponseForEachFeedback(supabase, res)
      })
      .then(setRecentFeedback);
  }, [restaurant, timeRange]);


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
      <div className={dashboardCSS.f_header}><h3>Recent feedback</h3><button>See all→</button></div>
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
