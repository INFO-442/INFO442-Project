import feedbackCSS from './Feedback.module.css'
import { useState } from 'react'

import { feedbacks } from './Feedback.mockdata.js'

function FeedbackPage() {
  return (
    <div className={feedbackCSS.feedbackPage}>
      <h1>All Feedback</h1>
      <Filters />
      <table className={feedbackCSS.table}>
        <tr>
          <th>Date</th>
          <th>Rating</th>
          <th className={feedbackCSS.wideColumn} >Feedback (translated to Tiếng Việt)</th>
          <th>Sentiment</th>
        </tr>
        {feedbacks.map((feedback) => ( <TableRow key={feedback.id} feedback={feedback}/> ))}
      </table>
      <dialog id="full-response">
        <p>This dialog was opened using an invoker command.</p>
        <button commandfor="full-response" command="close">Close</button>
      </dialog>
    </div>
  )
}

function Filters() {
  return <div className={feedbackCSS.filterDiv}>
        <input type="text" id="search" name="search" required minlength="2" size="40" />
        <select name="rating" id="rating">
          <option value="">Rating: All</option>
          <option value="5">Rating: 5</option>
          <option value="4">Rating: 4</option>
          <option value="3">Rating: 3</option>
          <option value="2">Rating: 2</option>
          <option value="1">Rating: 1</option>
        </select>
        <select name="sentiment" id="sentiment">
          <option value="">Sentiment: All</option>
          <option value="positive">Sentiment: positive</option>
          <option value="neutral">Sentiment: neutral</option>
          <option value="negative">Sentiment: negative</option>
        </select>
        <select name="sort" id="sort">
          <option value="new">Newest first</option>
          <option value="old">Oldest first</option>
          <option value="high">Highest rating</option>
          <option value="low">Lowest rating</option>
        </select>
      </div>
}

function TableRow({ feedback }) {
  const stars = {
    5: "★★★★★",
    4: "★★★★☆",
    3: "★★★☆☆",
    2: "★★☆☆☆",
    1: "★☆☆☆☆",
  }
  return <tr>
    <td>{feedback.Date}</td>
    <td>{stars[feedback.Rating]}</td>
    <td><Feedback response={feedback.Responses[0]} language={feedback.Language} /></td>
    <td><span className={feedbackCSS.sentiment}>{feedback.Sentiment}</span></td>
  </tr>
}

function Feedback({ response, language }) {
  const [translated, setTranslated] = useState(true);

  return <>
      <span>Q: {translated ? response.Question_Translated : response.Question_Native} → 
      "{translated ? response.Translated.substring(0, 10) : response.Native.substring(0, 10)}..."</span>
      <div className={feedbackCSS.feedbackUnder}>
        <span>Original: {language} </span>
        <button onClick={() => setTranslated(!translated)} >Show {translated ? "original" : "translated"}</button>
        <button command="show-modal" commandfor="full-response">View full response</button>
      </div>
  </>
}


export default FeedbackPage
