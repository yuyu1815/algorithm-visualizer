import enMessages from './locales/en.json';
import jaMessages from './locales/ja.json';

export const defaultLocale = 'en';

export const supportedLocales = [
  {
    code: 'en',
    name: 'English',
  },
  {
    code: 'ja',
    name: '日本語',
  },
];

const messages = {
  en: enMessages,
  ja: jaMessages,
};

const knownTitles = {
  'Algorithm Visualizer': 'titles.algorithmVisualizer',
  'Scratch Paper': 'titles.scratchPaper',
  Untitled: 'titles.untitled',
};

const isSupportedLocale = locale => supportedLocales.some(supportedLocale => supportedLocale.code === locale);

const matchLocale = (locale) => {
  if (!locale) return undefined;
  const code = String(locale).toLowerCase().split(/[-_]/)[0];
  return isSupportedLocale(code) ? code : undefined;
};

export const normalizeLocale = (locale) => {
  return matchLocale(locale) || defaultLocale;
};

export const detectLocale = (storedLocale) => {
  if (storedLocale) return normalizeLocale(storedLocale);
  if (typeof window === 'undefined') return defaultLocale;

  const browserLocales = window.navigator.languages || [window.navigator.language];
  const matchedLocale = browserLocales.map(matchLocale).find(Boolean);
  return matchedLocale || defaultLocale;
};

const getMessage = (locale, key) => key.split('.').reduce(
  (value, keyPart) => value && value[keyPart],
  messages[normalizeLocale(locale)],
);

const interpolate = (message, values = {}) => Object.keys(values).reduce(
  (result, key) => result.replace(new RegExp(`{${key}}`, 'g'), values[key]),
  message,
);

export const translate = (locale, key, values) => {
  const message = getMessage(locale, key) || getMessage(defaultLocale, key) || key;
  return interpolate(message, values);
};

export const translateTitle = (locale, title) => (
  knownTitles[title] ? translate(locale, knownTitles[title]) : title
);

export const translateDescription = (locale, description) => (
  description === messages.en.app.description ? translate(locale, 'app.description') : description
);
