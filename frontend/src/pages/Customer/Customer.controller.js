const MESSAGES = {
  invalidLink: "This feedback link isn't valid. Please ask the restaurant for a new one.",
  noRating: "Please give an overall rating before submitting.",
  tooLong: "Please keep answers under 1,000 characters.",
  send: "Couldn't send. Check your connection and try again.",
};

function makeError(code) {
  const error = new Error(MESSAGES[code]);
  error.code = code;
  return error;
}

export async function getRestaurantBySlug(supabase, slug) {
  const { data, error } = await supabase
    .rpc("get_restaurant_by_slug", { p_slug: slug })
    .maybeSingle();

  if (error || !data) {
    throw makeError("invalidLink");
  }
  return data;
}

export async function submitFeedback(supabase, restaurantId, feedbackId, rating, answers, language) {
  if (rating !== 1 && rating !== 2 && rating !== 3 && rating !== 4 && rating !== 5) {
    throw makeError("noRating");
  }

  const rows = [];
  let hasText = false;

  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i];
    const row = {
      feedback_id: feedbackId,
      question_id: answer.questionId,
      by_voice: answer.byVoice === true,
    };

    if (answer.answerType === "short_answer" && answer.value && answer.value.trim() !== "") {
      const text = answer.value.trim();
      if (text.length > 1000) {
        throw makeError("tooLong");
      }
      row.native_text = text;
      hasText = true;
      rows.push(row);
    }

    if (answer.answerType === "scale" && answer.value >= 1 && answer.value <= 5) {
      row.scale_value = answer.value;
      rows.push(row);
    }

    if (answer.answerType === "yes_no" && (answer.value === true || answer.value === false)) {
      row.yes_no = answer.value;
      rows.push(row);
    }
  }

  let sentiment = null;
  if (rating >= 4) {
    sentiment = "positive";
  } else if (rating === 3) {
    sentiment = "neutral";
  } else {
      sentiment = "negative";
  }
  

  const feedbackResult = await supabase.from("feedback").insert({
    id: feedbackId,
    restaurant_id: restaurantId,
    rating: rating,
    sentiment: sentiment,
    language: language,
  });

  if (feedbackResult.error && feedbackResult.error.code !== "23505") {
    throw makeError("send");
  }

  if (rows.length > 0) {
    const responseResult = await supabase.from("responses").insert(rows);

    if (responseResult.error && responseResult.error.code !== "23505") {
      throw makeError("send");
    }
  }

  return true;
}