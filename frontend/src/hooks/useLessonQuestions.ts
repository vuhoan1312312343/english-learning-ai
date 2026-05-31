import { useEffect, useState } from 'react';
import { lessonAPI } from '~/utils/api';

interface Question {
  _id: string;
  type:
    | 'FLASHCARD'
    | 'READING_MCQ'
    | 'TRUE_FALSE'
    | 'MATCHING_HEADING'
    | 'SUMMARY_COMPLETION'
    | 'INTERVIEW'
    | 'DESCRIBE_PICTURE'
    | 'DISCUSSION'
    | 'PRESENTATION'
    | 'ESSAY'
    | 'REPORT'
    | 'NARRATIVE'
    | 'GRAMMAR_INTRO'
    | 'SELECT_1_OF_3'
    | 'WRITE_IN_ENGLISH';
  question: string;
  questionInVietnamese: string;
  answers?: { icon?: string; name: string }[];
  answerTiles?: string[];
  correctAnswer: number | number[];
  difficulty: string;
  category: string;
}

export const useLessonQuestions = (lessonId: string | null) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) return;

    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await lessonAPI.getLessonQuestions(lessonId);
        setQuestions(response.data.questions);
      } catch (err) {
        setError('Failed to load questions');
        console.error('Error fetching questions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [lessonId]);

  return { questions, loading, error };
};
