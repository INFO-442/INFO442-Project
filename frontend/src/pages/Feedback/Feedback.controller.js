export async function loadFeedback(supabase, restaurantId) {
  const columns =
    "id, rating, sentiment, language, submitted_at, " +
    "responses(question_id, native_text, translated_text, scale_value, yes_no, by_voice, " +
    "questions(main_text, answer_type))";

  const { data, error } = await supabase
    .from("feedback")
    .select(columns)
    .eq("restaurant_id", restaurantId)
    .order("submitted_at", { ascending: false });

  if (error) {
    const loadError = new Error("We couldn't load your feedback.");
    loadError.code = "load";
    throw loadError;
  }
  return data;
}