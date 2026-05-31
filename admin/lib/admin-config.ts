import { QuestionType } from './admin-types';

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export const SECTION_OPTIONS = [
  { key: 'vocabulary', label: 'Vocabulary' },
  { key: 'reading', label: 'Reading' },
  { key: 'speaking', label: 'Speaking' },
  { key: 'writing', label: 'Writing' },
  { key: 'grammar-focus', label: 'Grammar Focus' },
  { key: 'practice', label: 'Practice' },
  { key: 'unit-review', label: 'Unit review' },
] as const;

export type SectionKey = (typeof SECTION_OPTIONS)[number]['key'];

export const QUESTION_TYPE_OPTIONS_BY_SECTION: Record<Exclude<SectionKey, 'unit-review'>, QuestionType[]> = {
  'vocabulary': ['FLASHCARD'],
  'reading': ['READING_MCQ', 'TRUE_FALSE', 'MATCHING_HEADING', 'SUMMARY_COMPLETION'],
  'speaking': ['INTERVIEW', 'DESCRIBE_PICTURE', 'DISCUSSION', 'PRESENTATION'],
  'writing': ['ESSAY', 'REPORT', 'NARRATIVE'],
  'grammar-focus': ['GRAMMAR_INTRO'],
  'practice': ['SELECT_1_OF_3', 'WRITE_IN_ENGLISH'],
};

export const isSelectType = (type: QuestionType): boolean => {
  return [
    'FLASHCARD',
    'READING_MCQ',
    'TRUE_FALSE',
    'MATCHING_HEADING',
    'SELECT_1_OF_3',
  ].includes(type);
};

export const parseSectionFromLessonTitle = (title: string): SectionKey | null => {
  const normalized = title.trim().toLowerCase();
  if (normalized.endsWith(' - vocabulary')) return 'vocabulary';
  if (normalized.endsWith(' - reading')) return 'reading';
  if (normalized.endsWith(' - speaking')) return 'speaking';
  if (normalized.endsWith(' - writing')) return 'writing';
  if (normalized.endsWith(' - grammar focus')) return 'grammar-focus';
  if (normalized.endsWith(' - practice')) return 'practice';
  if (/unit\s*\d+\s*review/.test(normalized) || normalized.endsWith(' - unit review')) {
    return 'unit-review';
  }
  return null;
};
