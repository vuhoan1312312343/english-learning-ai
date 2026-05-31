export type Language = (typeof languages)[number];

const languages = [
  {
    name: "English",
    nativeName: "English",
    viewBox: "0 0 82 66",
    code: "en",
  },
] as const;

export default languages;