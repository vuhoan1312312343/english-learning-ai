import { units } from "~/utils/units";
import type { BoundStateCreator } from "~/hooks/useBoundStore";

const LESSONS_PER_TILE = 1;

export type LessonSlice = {
  lessonsCompleted: number;
  setLessonsCompleted: (value: number) => void;
  increaseLessonsCompleted: (by?: number) => void;
  jumpToUnit: (unitNumber: number) => void;
};

export const createLessonSlice: BoundStateCreator<LessonSlice> = (set) => ({
  lessonsCompleted: 0,
  setLessonsCompleted: (value) =>
    set(() => ({
      lessonsCompleted: Math.max(0, value),
    })),
  increaseLessonsCompleted: (by = 1) =>
    set(({ lessonsCompleted }) => ({
      lessonsCompleted: lessonsCompleted + by,
    })),
  jumpToUnit: (unitNumber: number) =>
    set(({ lessonsCompleted }) => {
      const totalLessonsToJumpToUnit = units
        .filter((unit) => unit.unitNumber < unitNumber)
        .map((unit) => unit.tiles.length * LESSONS_PER_TILE)
        .reduce((a, b) => a + b, 0);
      return {
        lessonsCompleted: Math.max(lessonsCompleted, totalLessonsToJumpToUnit),
      };
    }),
});
