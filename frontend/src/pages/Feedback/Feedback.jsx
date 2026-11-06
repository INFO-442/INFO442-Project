import feedbackCSS from './Feedback.module.css'
import { useState } from 'react'

import { mockData } from './Feedback.mockdata.js'

const stars = {
    5: "★★★★★",
    4: "★★★★☆",
    3: "★★★☆☆",
    2: "★★☆☆☆",
    1: "★☆☆☆☆",
  }

function FeedbackPage() {

  const sortFuncs = {
    new: (a, b) => b.Date.localeCompare(a.Date),
    old: (a, b) => a.Date.localeCompare(b.Date),
    high: (a, b) => b.Rating - a.Rating,
    low: (a, b) => a.Rating - b.Rating,
  }

  const [fullFeedback, setFullFeedback] = useState(null);

  const [sort, setSort] = useState("new");
  const [rating, setRating] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [search, setSearch] = useState("");

  function clearFilters() {
    setSort("new");
    setRating("");
    setSentiment("");
    setSearch("");
  }

  const filterProps = { sort, rating, sentiment, search, setSort, setRating, setSentiment, setSearch };

  let filtered = mockData;
  if (rating !== "") { filtered = filtered.filter(f => f.Rating == rating) }
  if (sentiment !== "") { filtered = filtered.filter(f => f.Sentiment == sentiment) }
  if (search !== "") { // Search may be too slow if load-tested, can switch to an inverted index method if needed
    filtered = filtered.filter(f =>
      f.Responses.some(response =>
        response.Translated.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  ));}
  const sorted = [...filtered].sort(sortFuncs[sort])

  return (
    <div className={feedbackCSS.feedbackPage}>
      <h1>All Feedback</h1>
      <Filters {...filterProps}/>
      <table className={feedbackCSS.table}>
        <tr>
          <th>Date</th>
          <th>Rating</th>
          <th className={feedbackCSS.wideColumn} >Feedback (translated to Tiếng Việt)</th>
          <th>Sentiment</th>
        </tr>
        {sorted.length > 0 && sorted.map((feedback) =>
          (<TableRow key={feedback.id} feedback={feedback} setFullFeedback={setFullFeedback} /> )
        )}
      </table>
      {sorted.length == 0 && <div className={feedbackCSS.noFeedback}>
        <span>No feedback matches your filters. </span>
        <button onClick={clearFilters}>Clear filters</button>
      </div> }
      {(fullFeedback && <FullResponse feedback={fullFeedback}/>)}
    </div>
  )
}

function Filters({search, rating, sentiment, sort, setSearch, setRating, setSentiment, setSort}) {
  return <div className={feedbackCSS.filterDiv}>
        <input value={search} type="text" required minlength="2" size="40"
        placeholder='Search Feedback (e.g. "service")' onChange={(e) =>
        setSearch(e.target.value.toLocaleLowerCase())}/>
        <select value={rating} onChange={(e) => setRating(e.target.value)}>
          <option value="">Rating: All</option>
          <option value="5">Rating: 5</option>
          <option value="4">Rating: 4</option>
          <option value="3">Rating: 3</option>
          <option value="2">Rating: 2</option>
          <option value="1">Rating: 1</option>
        </select>
        <select value={sentiment} onChange={(e) => setSentiment(e.target.value)}>
          <option value="">Sentiment: All</option>
          <option value="Positive">Sentiment: Positive</option>
          <option value="Neutral">Sentiment: Neutral</option>
          <option value="Negative">Sentiment: Negative</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="new">Newest first</option>
          <option value="old">Oldest first</option>
          <option value="high">Highest rating</option>
          <option value="low">Lowest rating</option>
        </select>
      </div>
}

function TableRow({ feedback, setFullFeedback }) {
  return <tr>
    <td>{new Date(feedback.Date).toLocaleString("en-US", { month: "short", day: "numeric"})}</td>
    <td>{stars[feedback.Rating]}</td>
    <td><Feedback setFullFeedback={setFullFeedback} feedback={feedback} /></td>
    <td><span className={feedbackCSS.sentiment}>{feedback.Sentiment}</span></td>
  </tr>
}

function Feedback({ setFullFeedback, feedback }) {
  const [translated, setTranslated] = useState(true);
  const response = feedback.Responses[0];
  const language = feedback.Language;

  return <>
      <span>Q: {translated ? response.Question_Translated : response.Question_Native} →
      "{translated ? response.Translated.substring(0, 10) : response.Native.substring(0, 10)}..."</span>
      <div className={feedbackCSS.feedbackUnder}>
        <span>Original: {language} </span>
        <button onClick={() => setTranslated(!translated)} >Show {translated ? "original" : "translated"}</button>
        <button onClick={() => setFullFeedback(feedback)} command="show-modal" commandfor="full-response">View full response</button>
      </div>
  </>
}

function FullResponse({ feedback }) {
  const dateText = new Date(feedback.Date).toLocaleString("en-US", {
          month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit" })
  return <dialog id="full-response" className={feedbackCSS.fullResponse}>
        <div>
          <h3>Response · {dateText}</h3>
          <button commandfor="full-response" command="close">✕</button>
        </div>
        <div className={feedbackCSS.subheader}>
          <span className={feedbackCSS.rating}>{stars[feedback.Rating]}</span>
          <span className={feedbackCSS.sentiment}>{feedback.Sentiment}</span>
          {(feedback.voice && <span className={feedbackCSS.sentiment}>Submitted by voice</span>)}
        </div>
        <div className={feedbackCSS.grid}>
          <h4>Questions</h4>
          <h4>Answers</h4>
          {feedback.Responses.map((response, i) =>
            (<><p>{response.Question_Translated}</p><p>{response.Translated}</p></> )
          )}
        </div>
      </dialog>
}


export default FeedbackPage
