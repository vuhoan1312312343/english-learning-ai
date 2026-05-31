export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const LEVEL_BADGE_COLORS: Record<CEFRLevel, string> = {
  A1: "border-green-200 bg-green-50 text-green-700",
  A2: "border-sky-200 bg-sky-50 text-sky-700",
  B1: "border-violet-200 bg-violet-50 text-violet-700",
  B2: "border-orange-200 bg-orange-50 text-orange-700",
  C1: "border-teal-200 bg-teal-50 text-teal-700",
  C2: "border-rose-200 bg-rose-50 text-rose-700",
};

export const normalizeLevel = (level?: string): CEFRLevel => {
  if (!level) return "A1";
  const upper = level.toUpperCase();
  if (upper === "A1" || upper === "A2" || upper === "B1" || upper === "B2" || upper === "C1" || upper === "C2") {
    return upper;
  }
  return "A1";
};

export const getLevelBadgeClassName = (level?: string): string => {
  return LEVEL_BADGE_COLORS[normalizeLevel(level)];
};
