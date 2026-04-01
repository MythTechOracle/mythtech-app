const translationCache = new Map();
const translationEndpoint = process.env.TRANSLATION_ENDPOINT || "https://translate.googleapis.com/translate_a/single";
const translationEnabled = String(process.env.TRANSLATION_ENABLED || "true").toLowerCase() !== "false";
const languageNames =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "language" })
    : null;

function fallbackTranslation(text, error = null) {
  return {
    translated: false,
    translatedText: text,
    sourceLanguage: "en",
    sourceLanguageLabel: "English",
    note: null,
    provider: null,
    error,
  };
}

function toLanguageLabel(code = "") {
  const normalized = String(code || "").trim();
  if (!normalized) {
    return "another language";
  }

  const base = normalized.split("-")[0].toLowerCase();

  try {
    return languageNames?.of(base) || normalized.toUpperCase();
  } catch {
    return normalized.toUpperCase();
  }
}

async function requestEnglishTranslation(text) {
  const url = new URL(translationEndpoint);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", "en");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url, {
    headers: { "User-Agent": "live-signals-app/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Translation HTTP ${response.status}`);
  }

  const payload = await response.json();
  const translatedText = Array.isArray(payload?.[0])
    ? payload[0].map((segment) => segment?.[0] || "").join("").trim()
    : "";
  const sourceLanguage = String(payload?.[2] || "unknown");
  const sourceLanguageLabel = toLanguageLabel(sourceLanguage);
  const translated = Boolean(
    translatedText &&
      !sourceLanguage.toLowerCase().startsWith("en") &&
      translatedText.trim() !== String(text).trim()
  );

  return {
    translated,
    translatedText: translated ? translatedText : text,
    sourceLanguage,
    sourceLanguageLabel,
    note: translated ? `Machine-translated to English from ${sourceLanguageLabel}` : null,
    provider: translated ? "google-translate-web" : null,
    error: null,
  };
}

export async function translateTextToEnglish(text = "") {
  const originalText = String(text || "").trim();
  if (!translationEnabled || !originalText) {
    return fallbackTranslation(originalText);
  }

  const cacheKey = `en:${originalText}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return await cached;
  }

  const pending = requestEnglishTranslation(originalText)
    .catch((error) => fallbackTranslation(originalText, String(error)))
    .then((result) => {
      translationCache.set(cacheKey, result);
      return result;
    });

  translationCache.set(cacheKey, pending);
  return await pending;
}

export async function enrichEventItemsWithTranslation(items = []) {
  const translatedItems = [];

  for (const item of items) {
    const translation = await translateTextToEnglish(item.summary || "");

    translatedItems.push({
      ...item,
      summary_original: item.summary || "",
      summary_translated: translation.translated ? translation.translatedText : null,
      translation: {
        applied: translation.translated,
        source_language: translation.sourceLanguage,
        source_language_label: translation.sourceLanguageLabel,
        note: translation.note,
        provider: translation.provider,
      },
    });
  }

  return translatedItems;
}
