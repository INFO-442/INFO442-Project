import { translate } from "../../lib/ai.js";

export async function loadFeedback(supabase, restaurantId) {
  const columns =
    "id, rating, sentiment, language, submitted_at, " +
    "responses(id, question_id, native_text, translated_text, translated_language, " +
    "scale_value, yes_no, by_voice, questions(main_text, answer_type))";

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

export async function ensureTranslations(supabase, restaurantId) {
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("feedback_language")
    .eq("id", restaurantId)
    .single();

  if (restaurantError) {
    const translateError = new Error("We couldn't load your feedback.");
    translateError.code = "load";
    throw translateError;
  }

  const language = restaurant.feedback_language;
  const feedback = await loadFeedback(supabase, restaurantId);
  let updated = 0;

  for (const item of feedback) {
    for (const response of item.responses ?? []) {
      if (!response.native_text || response.translated_language === language) continue;

      const result = await translate(response.native_text, language);
      if (!result.text) continue;

      const { error } = await supabase
        .from("responses")
        .update({ translated_text: result.text, translated_language: language })
        .eq("id", response.id);

      if (!error) updated += 1;
    }
  }

  return updated;
}
