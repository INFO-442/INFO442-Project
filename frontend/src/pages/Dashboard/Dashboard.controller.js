/**
 * Calculates dashboard metrics from current and previous-period feedback.
 * @param {Array<{rating: number, sentiment: string}>} pastData Feedback from the previous period.
 * @param {Array<{rating: number, sentiment: string}>} feedbackData Feedback from the selected period.
 * @returns {{avgRating: number|string, responses: number,
 *          positiveSentiment: string, avgRatingVsPrevious: string}|null}
 *          Metrics, "--" if feedbackData has no entries, or null if either input is missing.
 */
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

/**
 * Checks whether a restaurant has at least one feedback record.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase Supabase client used to query the database.
 * @param {string} restaurant_id Restaurant UUID to check.
 * @returns {Promise<boolean>} True if a feedback record exists; otherwise false.
 */
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

/**
 * Fetches a restaurant's feedback for the selected number of days, newest first.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase Supabase client used to query the database.
 * @param {string} restaurant_id Restaurant UUID whose feedback is fetched.
 * @param {number|string} timeRange Number of days to include, or an empty string for all time.
 * @returns {Promise<Array<Object>>} Matching feedback rows ordered by newest submitted date.
 */
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

/**
 * Fetches feedback from the period immediately before the selected time range.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase Supabase client used to query the database.
 * @param {string} restaurant_id Restaurant UUID whose feedback is fetched.
 * @param {number|string} timeRange Length of each period in days.
 * @returns {Promise<Array<Object>>} Feedback rows from the previous period.
 */
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

/**
 * Adds the first available written response to each feedback row.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase Supabase client used to query responses.
 * @param {Array<{id: string}>} feedbackData Feedback rows, each with a database ID.
 * @returns {Promise<Array<Object>>} Feedback rows enriched with native_text, translated_text, and noWrittenComments.
 */
export const getResponseForEachFeedback = async (supabase, feedbackData) => {
  /**
   * Finds one non-null written response associated with a feedback row.
   * @param {{id: string}} feedback Feedback row whose response is looked up.
   * @returns {Promise<Object>} The feedback row enriched with response text or empty text when no response exists.
   */
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
