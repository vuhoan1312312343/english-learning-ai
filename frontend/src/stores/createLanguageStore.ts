import languages, { type Language } from "~/utils/languages";
import type { BoundStateCreator } from "~/hooks/useBoundStore";

export type LanguageSlice = {
  language: Language;
  setLanguage: (newLanguage: Language) => void;
};

const defaultLanguage =
  languages.find(
    (language) =>
      language.code.toLowerCase() === "en" ||
      language.name.toLowerCase() === "english",
  ) ?? languages[0];

export const createLanguageSlice: BoundStateCreator<LanguageSlice> = (set) => ({
  language: defaultLanguage,
  setLanguage: (newLanguage: Language) => set({ language: newLanguage }),
});
