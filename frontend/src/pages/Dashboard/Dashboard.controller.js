export const computeStats = function(pastData, feedbackData) {
  if (!feedbackData) return null;
  if (!pastData) return null;
  
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
  let pastRatings = 0;
  let pastResponses = 0;
  if (pastData.length > 0) {
    pastData.forEach((feedback) => {
      pastRatings += feedback.rating;
      pastResponses += 1;
    })
  }
  const avgRating = Number((ratings / responses).toFixed(2));
  let prevPeriodDiff = "--"
  if (pastData.length !== 0) {
    const num = avgRating - Number((pastRatings / pastResponses).toFixed(2));
    prevPeriodDiff = (num > 0 ? "+" : "") + num;
  }
  return {
    "Avg rating": avgRating,
    "Responses": responses,
    "Positive": Number((pos / (pos + neg)).toFixed(2)) * 100 + "%",
    "avg rating vs. previous period": prevPeriodDiff
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

export const getPastFeedback = async function(supabase, restaurant_id, timeRange) {
  let query = supabase
    .from("feedback")
    .select()
    .eq("restaurant_id", restaurant_id)

  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - Number(timeRange))
  query = query.lt('submitted_at', pastDate.toISOString())
  pastDate.setDate(pastDate.getDate() - Number(timeRange))
  query = query.gte('submitted_at', pastDate.toISOString())

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