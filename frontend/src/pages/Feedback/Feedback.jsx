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

const preferredLanguage = "Tiếng Việt";

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
  const [page, setPage] = useState(1);

  function clearFilters() {
    setSort("new");
    setRating("");
    setSentiment("");
    setSearch("");
  }

  const filterProps = { sort, rating, sentiment, search, setSort, setRating, setSentiment, setSearch };

  let filtered = mockData;
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
      <h1>All feedback</h1>
      <Filters {...filterProps}/>
      { (filtered !== null && filtered !== undefined) && <>
        <div className={feedbackCSS.tableDiv}>
          <table className={feedbackCSS.table}>
            <tr>
              <th>Date</th>
              <th>Rating</th>
              <th className={feedbackCSS.wideColumn} >Feedback (translated to {preferredLanguage})</th>
              <th>Sentiment</th>
            </tr>
            {filtered !== null && filtered.length > 0 && displayedFeedbacks.map((feedback) =>
              (<TableRow key={feedback.id} feedback={feedback} setFullFeedback={setFullFeedback} /> )
            )}
          </table>
          {filtered.length == 0 && <div className={feedbackCSS.noFeedback}>
            <span>No feedback matches your filters. </span>
            <button onClick={clearFilters}>Clear filters</button>
          </div> }
          {filtered.length > 0 && pageCount == 1 && <div className={feedbackCSS.tableFooter}><span>Page {page} of {pageCount}</span></div>}
        </div>
        {(filtered.length > 0 && pageCount != 1) &&
          <div className={feedbackCSS.tableFooter}>
            {page !== 1 ? <button onClick={() => {setPage(page - 1)}}>←Prev</button> : <span></span>}
            <span>Page {page} of {pageCount}</span>
            {page !== pageCount ? <button onClick={() => {setPage(page + 1)}}>Next→</button> : <span></span>}
          </div>}
        {(fullFeedback && <FullResponse feedback={fullFeedback}/>)}
      </>}
      {filtered === null && <p className={feedbackCSS.errorMessage}>Error: Feedback could not be loaded.</p>}
      {filtered === undefined && <p>There is no feedback yet for this business.</p>}
    </main>
  )
}

function Filters({search, rating, sentiment, sort, setSearch, setRating, setSentiment, setSort}) {
  return <div className={feedbackCSS.filterDiv}>
        <input className={feedbackCSS.search} value={search} type="text" required minlength="2"
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
    <td><span className={feedbackCSS.rating}>{stars[feedback.Rating]}</span></td>
    <td><Feedback setFullFeedback={setFullFeedback} feedback={feedback} /></td>
    <td><span className={`${feedbackCSS.sentiment} ${
            feedback.Sentiment === "Positive" ? feedbackCSS.positive : feedback.Sentiment === "Negative"
            ? feedbackCSS.negative : feedbackCSS.neutral}`}>
            {feedback.Sentiment}</span></td>
  </tr>
}

function Feedback({ setFullFeedback, feedback }) {
  const [translated, setTranslated] = useState(true);
  const response = feedback.Responses.find((response) => response.Question_Type === "short_answer");
  const language = feedback.Language;

  return <>
      {response ? <span>Q: {translated ? response.Question_Translated : response.Question_Native} →
          "{translated ? response.Translated.substring(0, 10) : response.Native.substring(0, 10)}..."</span>
        : <span>No written comments.</span>}
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
        <div className={feedbackCSS.responseHeader}>
          <h3>Response · {dateText}</h3>
          <button commandfor="full-response" command="close">✕</button>
        </div>
        <div className={feedbackCSS.subheader}>
          <span className={feedbackCSS.rating}>{stars[feedback.Rating]}</span>
          <span className={`${feedbackCSS.sentiment} ${
            (feedback.Sentiment === "Positive" ?
            feedbackCSS.positive : feedback.Sentiment === "Negative")
            ? feedbackCSS.negative : feedbackCSS.neutral
          }`}>
            {feedback.Sentiment}
          </span>
          {(feedback.voice && <span className={feedbackCSS.sentiment}>Submitted by voice</span>)}
        </div>
        <div>
          {feedback.Responses.map((response, i) =>
            (<div className={feedbackCSS.response}>
              <h4>Q{i + 1}: {response.Question_Translated}</h4>
              <div className={feedbackCSS.responseAnswers}>
                <div>
                  <p>{response.Translated === "" ? "No answer." : response.Translated}</p>
                  <span>Translated ({preferredLanguage})</span>
                </div>
                <div>
                  <p>{response.Native === "" ? "No answer." : response.Native}</p>
                  <span>Original ({feedback.Language})</span>
                </div>
              </div>
            </div>)
          )}
        </div>
        <p className={feedbackCSS.responseFooter}>Machine translation may not be perfect.</p>
      </dialog>
}


export default FeedbackPage
