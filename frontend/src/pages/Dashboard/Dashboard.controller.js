export const computeStats = function(pastData, feedbackData) {
  if (!feedbackData) return null;
  if (!pastData) return null;

  if (feedbackData.length === 0) {
    return {
      avgRating: "--",
      responses: 0,
      positiveSentiment: "--",
      avgRatingVsPrevious: "--"
    }
  }
  
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
    avgRating,
    responses,
    positiveSentiment: Number((pos / responses).toFixed(2)) * 100 + "%",
    avgRatingVsPrevious: prevPeriodDiff
  }
}

export const hasFeedback = async function(supabase, restaurant_id) {
  const { data, error } = await supabase
    .from("feedback")
    .select()
    .eq("restaurant_id", restaurant_id)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export const getFeedback = async function(supabase, restaurant_id, timeRange) {
  let query = supabase
    .from("feedback")
    .select()
    .eq("restaurant_id", restaurant_id)
    .order("submitted_at", { ascending: false });

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
        translated_text: "",
        noWrittenComments: true,
      };
      const nativeText = data.native_text ?? "";
      const translatedText = data.translated_text ?? "";
      return {...feedback,
        native_text: nativeText,
        translated_text: translatedText,
        noWrittenComments: nativeText === "" && translatedText === "",
      }
  }
  return await Promise.all(
    feedbackData.map(async (feedback) => {
      return getSingleResponse(feedback)
    }))
}
