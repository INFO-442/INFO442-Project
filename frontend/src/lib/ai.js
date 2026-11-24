const endpoint = "https://translation.googleapis.com/language/translate/v2";

function apiKey() {
  if (typeof process !== "undefined" && process.env) {
    return process.env.VITE_GOOGLE_TRANSLATE_KEY;
  }
  return import.meta.env.VITE_GOOGLE_TRANSLATE_KEY;
}

export async function translate(text, target) {
  const key = apiKey();
  if (!key || !text) return { text: null, source: null };

  const response = await fetch(`${endpoint}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, target, format: "text" }),
  });

  if (!response.ok) return { text: null, source: null };

  const body = await response.json();
  const item = body.data?.translations?.[0];
  if (!item) return { text: null, source: null };

  return {
    text: item.translatedText,
    source: item.detectedSourceLanguage ?? null,
  };
}
