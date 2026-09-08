/**
 * Real server-side translation via Google Cloud Translation API (v2, API-key
 * auth — simplest to provision: enable "Cloud Translation API" in a Google
 * Cloud project, create an API key, restrict it to that API, and set
 * GOOGLE_TRANSLATE_API_KEY. Swap the implementation below for DeepL/Azure if
 * you prefer — the call sites (messages API) only depend on this function's
 * signature, not the provider.
 *
 * Translation always happens here, server-side, before the row is written to
 * the `translations` table. The frontend never translates — it only ever
 * displays whichever column (original vs. translated) the viewer should see.
 */

const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY

export interface TranslationResult {
  translatedText: string
  detectedSourceLang?: string
  provider: string
}

export async function translateText(params: {
  text: string
  targetLang: string
  sourceLang?: string
}): Promise<TranslationResult> {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error(
      "GOOGLE_TRANSLATE_API_KEY is not set. Chat translation requires a real " +
        "translation provider — see setup instructions."
    )
  }

  // Skip the network call entirely when source === target.
  if (params.sourceLang && params.sourceLang === params.targetLang) {
    return { translatedText: params.text, provider: "none", detectedSourceLang: params.sourceLang }
  }

  const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: params.text,
      target: params.targetLang,
      source: params.sourceLang,
      format: "text",
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Translation API failed (${res.status}): ${body}`)
  }

  const data = await res.json()
  const translation = data?.data?.translations?.[0]
  if (!translation) throw new Error("Translation API returned no result")

  return {
    translatedText: translation.translatedText,
    detectedSourceLang: translation.detectedSourceLanguage,
    provider: "google",
  }
}
