"use client";

const STORAGE_KEY = "homenageando_openai_ads_attribution";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const VALID_REF = /^[A-Za-z0-9._~%+=/-]{1,1024}$/;

export function storeConsentedOpenAIReference(oppref: string): boolean {
  if (typeof window === "undefined" || !VALID_REF.test(oppref)) return false;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ oppref, timestamp: Date.now() }));
  window.dispatchEvent(new Event("homenageando-openai-consent"));
  return true;
}

export function getConsentedOpenAIReference(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { oppref?: unknown; timestamp?: unknown };
    if (
      typeof value.oppref !== "string" ||
      !VALID_REF.test(value.oppref) ||
      typeof value.timestamp !== "number" ||
      Date.now() - value.timestamp > MAX_AGE_MS ||
      Date.now() - value.timestamp < 0
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return value.oppref;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
