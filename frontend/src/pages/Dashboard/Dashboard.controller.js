export const computeStats = function(feedbackData) {
  if (!feedbackData) return null;
  let ratings = 0;
  let responses = 0;
  let pos = 0;
  let neg = 0;
  feedbackData.forEach((feedback) => {
    responses += 1;
    ratings += feedback.rating;
    if (feedback.sentiment === "positive") pos += 1;
    else if (feedback.sentiment === "negative") neg += 1;
  })
  return {
    "Avg rating": Number((ratings / responses).toFixed(2)),
    "Responses": responses,
    "Positive": Number((pos / (pos + neg)).toFixed(2)),
    "vs. previous period": "--"
  }
}

export const getFeedback = async function(supabase, restaurant_id, timeRange) {
  let query = supabase
    .from("feedback")
    .select()
    .eq("restaurant_id", restaurant_id)

  if (timeRange !== "") {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - Number(timeRange))
    query = query.gte('submitted_at', pastDate.toISOString())
  }
  let { data, error } = await query;
  if (error) throw error;
  return data;
}

export const getResponseForEachFeedback = async (supabase, feedbackData) => {
  async function getSingleResponse(feedback) {
      let query = supabase
        .from("responses")
        .select()
        .eq("feedback_id", feedback.id)
        .not("native_text", "is", null)
        .limit(1)
        .maybeSingle()

      let { data, error } = await query;
      if (error) throw error;
      if (data === undefined || data === null) return {...feedback,
        native_text: "",
        translated_text: "No written comments."
      };
      return {...feedback,
        native_text: data?.native_text ?? "No written comments.",
        translated_text: data?.translated_text ?? "No written comments.",
      }
  }
  return await Promise.all(
    feedbackData.map(async (feedback) => {
      return getSingleResponse(feedback)
    }))
}