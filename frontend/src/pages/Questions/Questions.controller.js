const LANGUAGES = ["en", "es", "vi", "zh", "ko", "tr", "am", "ar"];
const ANSWER_TYPES = ["short_answer", "scale", "yes_no"];
const MAX_QUESTIONS = 5;
const MAX_LENGTH = 200;
const RATING_LABEL = "Overall rating (1-5 stars)";

const MESSAGES = {
  blank: "Please type a question or pick a suggested one.",
  tooLong: "Questions must be 200 characters or less.",
  duplicate: "This question is already on your form.",
  limit: "You can have up to 5 questions. Remove one to add another.",
  invalidType: "Please choose an answer type.",
  save: "Couldn't save your questions. Check your connection and try again.",
  load: "Couldn't load your questions. Check your connection and try again.",
};

function makeError(code) {
  const error = new Error(MESSAGES[code]);
  error.code = code;
  return error;
}

function getText(row, language) {
  if (row["text_" + language]) {
    return row["text_" + language];
  }
  for (let i = 0; i < LANGUAGES.length; i++) {
    const value = row["text_" + LANGUAGES[i]];
    if (value) {
      return value;
    }
  }
  return "";
}

function toPageQuestion(row, language) {
  let suggestedKey = "";
  if (row.suggested_key) {
    suggestedKey = row.text_en;
  }
  return {
    id: row.id,
    text: getText(row, language),
    answerType: row.answer_type,
    suggestedKey: suggestedKey,
  };
}

async function getLinks(supabase, restaurantId) {
  const { data, error } = await supabase
    .from("restaurant_questions")
    .select("position, questions(*)")
    .eq("restaurant_id", restaurantId)
    .order("position", { ascending: true });

  if (error) {
    throw makeError("load");
  }
  return data;
}

function isDuplicate(links, text) {
  const newText = text.toLowerCase();

  if (newText === RATING_LABEL.toLowerCase()) {
    return true;
  }

  for (let i = 0; i < links.length; i++) {
    const row = links[i].questions;
    for (let j = 0; j < LANGUAGES.length; j++) {
      const oldText = row["text_" + LANGUAGES[j]];
      if (oldText && oldText.trim().toLowerCase() === newText) {
        return true;
      }
    }
  }
  return false;
}

export async function loadQuestions(supabase, restaurantId, language) {
  if (!language) {
    language = "en";
  }
  const links = await getLinks(supabase, restaurantId);
  const questions = [];
  for (let i = 0; i < links.length; i++) {
    questions.push(toPageQuestion(links[i].questions, language));
  }
  return questions;
}

export async function getFormQuestions(supabase, restaurantId) {
  const links = await getLinks(supabase, restaurantId);
  const questions = [];

  for (let i = 0; i < links.length; i++) {
    const row = links[i].questions;
    const text = {};
    for (let j = 0; j < LANGUAGES.length; j++) {
      text[LANGUAGES[j]] = getText(row, LANGUAGES[j]);
    }

    const question = {
      id: row.id,
      answerType: row.answer_type,
      text: text,
    };
    if (row.answer_type === "short_answer") {
      question.length = 1000;
    }
    questions.push(question);
  }
  return questions;
}

export async function addQuestion(supabase, restaurantId, text, answerType, suggestedKey, language) {
  if (!LANGUAGES.includes(language)) {
    language = "en";
  }
  if (!text) {
    text = "";
  }
  const trimmed = text.trim();

  if (trimmed === "") {
    throw makeError("blank");
  }
  if (trimmed.length > MAX_LENGTH) {
    throw makeError("tooLong");
  }
  if (!ANSWER_TYPES.includes(answerType)) {
    throw makeError("invalidType");
  }

  const links = await getLinks(supabase, restaurantId);

  if (links.length >= MAX_QUESTIONS) {
    throw makeError("limit");
  }
  if (isDuplicate(links, trimmed)) {
    throw makeError("duplicate");
  }

  const newRow = {
    created_by: restaurantId,
    answer_type: answerType,
  };
  newRow["text_" + language] = trimmed;

  if (suggestedKey) {
    const { data: template, error } = await supabase
      .from("questions")
      .select()
      .is("created_by", null)
      .eq("text_en", suggestedKey)
      .maybeSingle();

    if (error) {
      throw makeError("save");
    }
    if (template) {
      newRow.suggested_key = template.suggested_key;
      for (let i = 0; i < LANGUAGES.length; i++) {
        const column = "text_" + LANGUAGES[i];
        newRow[column] = template[column];
      }
    }
  }

  const { data: created, error: insertError } = await supabase
    .from("questions")
    .insert(newRow)
    .select()
    .single();

  if (insertError) {
    throw makeError("save");
  }

  let nextPosition = 1;
  for (let i = 0; i < links.length; i++) {
    if (links[i].position >= nextPosition) {
      nextPosition = links[i].position + 1;
    }
  }

  const { error: linkError } = await supabase
    .from("restaurant_questions")
    .insert({
      restaurant_id: restaurantId,
      question_id: created.id,
      position: nextPosition,
    });

  if (linkError) {
    await supabase.from("questions").delete().eq("id", created.id);

    if (linkError.message.includes("QUESTION_LIMIT")) {
      throw makeError("limit");
    }
    if (linkError.message.includes("QUESTION_DUPLICATE")) {
      throw makeError("duplicate");
    }
    throw makeError("save");
  }

  return toPageQuestion(created, language);
}

export async function removeQuestion(supabase, restaurantId, questionId) {
  const { data, error } = await supabase
    .from("restaurant_questions")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("question_id", questionId)
    .select();

  if (error) {
    throw makeError("save");
  }
  if (!data || data.length === 0) {
    throw makeError("save");
  }

  await supabase.from("questions").delete().eq("id", questionId);
}