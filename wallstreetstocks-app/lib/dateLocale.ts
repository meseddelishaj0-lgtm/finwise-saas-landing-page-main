// lib/dateLocale.ts
// Map app language codes to BCP-47 locales for date formatting
// (Hermes ships Intl, so toLocaleDateString honors these).
const LOCALES: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  sq: 'sq-AL',
  tr: 'tr-TR',
  el: 'el-GR',
  zh: 'zh-CN',
  hi: 'hi-IN',
  ar: 'ar',
  ja: 'ja-JP',
  ko: 'ko-KR',
};

export const dateLocale = (lang?: string): string => LOCALES[lang || 'en'] || 'en-US';
