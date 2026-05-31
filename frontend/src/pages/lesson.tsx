import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import {
  AppleSvg,
  BigCloseSvg,
  BoySvg,
  CloseSvg,
  DoneSvg,
  LessonFastForwardEndFailSvg,
  LessonFastForwardEndPassSvg,
  LessonFastForwardStartSvg,
  LessonTopBarEmptyHeart,
  LessonTopBarHeart,
  WomanSvg,
} from "~/components/Svgs";
import womanPng from "../../public/woman.png";
import { useBoundStore } from "~/hooks/useBoundStore";
import { useRouter } from "next/router";
import { lessonAPI } from "~/utils/api";

type LessonProblemAnswer = {
  icon?: React.ReactNode;
  name: string;
};

type LessonProblem =
  | {
      type: "SELECT_1_OF_3";
      question: string;
      questionImage?: string;
      answers: LessonProblemAnswer[];
      correctAnswer: number;
    }
  | {
      type: "TRUE_FALSE";
      question: string;
      questionImage?: string;
      answers: LessonProblemAnswer[];
      correctAnswer: number;
    }
  | {
      type: "HEADING_MATCH";
      question: string;
      questionImage?: string;
      answers: LessonProblemAnswer[];
      correctAnswer: number;
    }
  | {
      type: "WRITE_IN_ENGLISH";
      question: string;
      questionImage?: string;
      answerTiles: string[];
      correctAnswer: number[];
    }
  | {
      type: "SUMMARY_BUILD";
      question: string;
      questionImage?: string;
      answerTiles: string[];
      correctAnswer: number[];
    }
  | {
      type: "GRAMMAR_INTRO";
      question: string;
      questionImage?: string;
      content?: string;
      example?: string;
    }
  | {
      type: "INTERVIEW";
      question: string;
      questionImage?: string;
      sampleAnswer?: string;
    }
  | {
      type: "DISCUSSION";
      question: string;
      questionImage?: string;
      sampleAnswer?: string;
    }
  | {
      type: "DESCRIBE_PICTURE";
      question: string;
      questionImage?: string;
      sampleAnswer?: string;
    }
  | {
      type: "PRESENTATION";
      question: string;
      questionImage?: string;
      sampleAnswer?: string;
    }
  | {
      type: "WRITING_TASK";
      writingType: "ESSAY" | "REPORT" | "NARRATIVE";
      question: string;
      questionImage?: string;
      sampleAnswer?: string;
    };

type BackendQuestion = {
  _id: string;
  type:
    | "FLASHCARD"
    | "READING_MCQ"
    | "TRUE_FALSE"
    | "MATCHING_HEADING"
    | "SUMMARY_COMPLETION"
    | "INTERVIEW"
    | "DESCRIBE_PICTURE"
    | "DISCUSSION"
    | "PRESENTATION"
    | "ESSAY"
    | "REPORT"
    | "NARRATIVE"
    | "GRAMMAR_INTRO"
    | "SELECT_1_OF_3"
    | "WRITE_IN_ENGLISH";
  question: string;
  questionInVietnamese: string;
  questionImage?: string;
  image?: string;
  imageUrl?: string;
  picture?: string;
  answers?: { icon?: string; name: string }[];
  answerTiles?: string[];
  correctAnswer: number | number[];
};

const ICON_MAP: Record<string, React.ReactNode> = {
  apple: <AppleSvg />,
  boy: <BoySvg />,
  woman: <WomanSvg />,
};

const resolveIcon = (iconKey?: string): React.ReactNode | undefined => {
  if (!iconKey) return undefined;
  if (ICON_MAP[iconKey]) return ICON_MAP[iconKey];

  const looksLikeImageUrl =
    iconKey.startsWith("/") ||
    iconKey.startsWith("http://") ||
    iconKey.startsWith("https://") ||
    iconKey.startsWith("data:image/");

  if (looksLikeImageUrl) {
    return (
      <img
        src={iconKey}
        alt="answer icon"
        className="h-8 w-8 rounded object-cover"
      />
    );
  }

  return <span className="text-2xl font-bold">{iconKey}</span>;
};

const normalizeQuestionImage = (image?: string): string | undefined => {
  if (!image || typeof image !== "string") return undefined;

  const trimmedImage = image.trim();
  if (!trimmedImage) return undefined;

  if (trimmedImage.startsWith("/uploads/")) {
    return `http://localhost:5000${trimmedImage}`;
  }

  return trimmedImage;
};

const getQuestionImage = (question: BackendQuestion): string | undefined => {
  return normalizeQuestionImage(
    question.questionImage ||
      question.image ||
      question.imageUrl ||
      question.picture,
  );
};

const getSampleAnswer = (question: BackendQuestion) =>
  Array.isArray(question.answerTiles) && question.answerTiles.length > 0
    ? question.answerTiles.join("\n").trim()
    : "";

type LessonResponse = {
  data?: {
    lesson?: {
      _id: string;
      title: string;
      questions?: BackendQuestion[];
    };
  };
};

const lessonProblem1 = {
  type: "SELECT_1_OF_3",
  question: `Từ nào có nghĩa là "quả táo"?`,
  answers: [
    { icon: <AppleSvg />, name: "apple" },
    { icon: <BoySvg />, name: "boy" },
    { icon: <WomanSvg />, name: "woman" },
  ],
  correctAnswer: 0,
} as const;

const lessonProblem2 = {
  type: "WRITE_IN_ENGLISH",
  question: "Cậu bé",
  answerTiles: ["woman", "milk", "water", "I", "The", "boy"],
  correctAnswer: [4, 5],
} as const;

const lessonProblem3 = {
  type: "SELECT_1_OF_3",
  question: `Từ nào có nghĩa là "người phụ nữ"?`,
  answers: [
    { icon: <BoySvg />, name: "boy" },
    { icon: <WomanSvg />, name: "woman" },
    { icon: <AppleSvg />, name: "apple" },
  ],
  correctAnswer: 1,
} as const;

const lessonProblem4 = {
  type: "WRITE_IN_ENGLISH",
  question: "Xin chào",
  answerTiles: ["Good", "morning", "Hello", "Goodbye", "Thank", "you"],
  correctAnswer: [2],
} as const;

const lessonProblem5 = {
  type: "WRITE_IN_ENGLISH",
  question: "Chào buổi sáng",
  answerTiles: ["Good", "morning", "evening", "night", "afternoon", "Hello"],
  correctAnswer: [0, 1],
} as const;

const lessonProblem6 = {
  type: "SELECT_1_OF_3",
  question: `Câu nào có nghĩa là "Tôi là..."?`,
  answers: [
    { icon: <span className="text-2xl font-bold">👋</span>, name: "Hello" },
    { icon: <span className="text-2xl font-bold">🙋</span>, name: "I am" },
    { icon: <span className="text-2xl font-bold">👍</span>, name: "Thank you" },
  ],
  correctAnswer: 1,
} as const;

const lessonProblem7 = {
  type: "WRITE_IN_ENGLISH",
  question: "Cảm ơn bạn",
  answerTiles: ["Thank", "you", "Hello", "Please", "Sorry", "Welcome"],
  correctAnswer: [0, 1],
} as const;

const lessonProblem8 = {
  type: "WRITE_IN_ENGLISH",
  question: "Tạm biệt",
  answerTiles: ["Good", "Goodbye", "Hello", "morning", "See", "you"],
  correctAnswer: [1],
} as const;

const lessonProblem9 = {
  type: "SELECT_1_OF_3",
  question: `Từ nào có nghĩa là "xin lỗi"?`,
  answers: [
    { icon: <span className="text-2xl font-bold">🙏</span>, name: "Please" },
    { icon: <span className="text-2xl font-bold">😢</span>, name: "Sorry" },
    { icon: <span className="text-2xl font-bold">😊</span>, name: "Happy" },
  ],
  correctAnswer: 1,
} as const;

const lessonProblem10 = {
  type: "WRITE_IN_ENGLISH",
  question: "Tên tôi là John",
  answerTiles: ["My", "name", "is", "John", "am", "I"],
  correctAnswer: [0, 1, 2, 3],
} as const;

const staticLessonProblems = [
  lessonProblem1,
  lessonProblem2,
  lessonProblem3,
  lessonProblem4,
  lessonProblem5,
  lessonProblem6,
  lessonProblem7,
  lessonProblem8,
  lessonProblem9,
  lessonProblem10,
] as unknown as LessonProblem[];

const mapBackendQuestionToProblem = (
  question: BackendQuestion,
): LessonProblem | null => {
  const selectQuestionTypes = new Set([
    "FLASHCARD",
    "READING_MCQ",
    "SELECT_1_OF_3",
  ]);

  const selectAnswers = question.answers?.length
    ? question.answers.map((answer) => ({
        icon: resolveIcon(answer.icon),
        name: answer.name,
      }))
    : Array.isArray(question.answerTiles)
      ? question.answerTiles.map((answerTile) => ({
          name: answerTile,
        }))
      : [];

  const selectCorrectAnswer =
    typeof question.correctAnswer === "number"
      ? question.correctAnswer
      : Array.isArray(question.correctAnswer) &&
          question.correctAnswer.length === 1
        ? question.correctAnswer[0]
        : null;

  if (question.type === "GRAMMAR_INTRO") {
    return {
      type: "GRAMMAR_INTRO",
      question: question.question || "Grammar Lesson",
      questionImage: getQuestionImage(question),
      content:
        question.questionInVietnamese ||
        "Đây là phần giới thiệu ngữ pháp. Hãy đọc nội dung và bấm Continue để tiếp tục bài học.",
      example:
        Array.isArray(question.answerTiles) && question.answerTiles.length > 0
          ? question.answerTiles.join(" ")
          : undefined,
    };
  }

  if (question.type === "INTERVIEW") {
    return {
      type: "INTERVIEW",
      question: question.question,
      questionImage: getQuestionImage(question),
      sampleAnswer:
        getSampleAnswer(question),
    };
  }

  if (question.type === "DISCUSSION") {
    return {
      type: "DISCUSSION",
      question: question.question,
      questionImage: getQuestionImage(question),
      sampleAnswer:
        getSampleAnswer(question),
    };
  }

  if (question.type === "PRESENTATION") {
    return {
      type: "PRESENTATION",
      question: question.question,
      questionImage: getQuestionImage(question),
      sampleAnswer:
        getSampleAnswer(question),
    };
  }

  if (question.type === "DESCRIBE_PICTURE") {
    return {
      type: "DESCRIBE_PICTURE",
      question: question.question || "Describe this picture",
      questionImage: getQuestionImage(question),
      sampleAnswer:
        getSampleAnswer(question),
    };
  }

  if (
    question.type === "ESSAY" ||
    question.type === "REPORT" ||
    question.type === "NARRATIVE"
  ) {
    return {
      type: "WRITING_TASK",
      writingType: question.type,
      question: question.question,
      questionImage: getQuestionImage(question),
      sampleAnswer: getSampleAnswer(question),
    };
  }

  if (question.type === "TRUE_FALSE" && typeof selectCorrectAnswer === "number") {
    return {
      type: "TRUE_FALSE",
      question: question.question,
      questionImage: getQuestionImage(question),
      answers: [
        { name: "True" },
        { name: "False" },
      ],
      correctAnswer: selectCorrectAnswer,
    };
  }

  if (
    question.type === "MATCHING_HEADING" &&
    selectAnswers.length > 0 &&
    typeof selectCorrectAnswer === "number"
  ) {
    return {
      type: "HEADING_MATCH",
      question: question.question,
      questionImage: getQuestionImage(question),
      answers: selectAnswers,
      correctAnswer: selectCorrectAnswer,
    };
  }

  if (
    selectQuestionTypes.has(question.type) &&
    selectAnswers.length > 0 &&
    typeof selectCorrectAnswer === "number"
  ) {
    return {
      type: "SELECT_1_OF_3",
      question: question.question,
      questionImage: getQuestionImage(question),
      answers: selectAnswers,
      correctAnswer: selectCorrectAnswer,
    };
  }

  const answerTiles = question.answerTiles;
  const correctAnswer = question.correctAnswer;
  if (!Array.isArray(answerTiles) || !Array.isArray(correctAnswer)) {
    return null;
  }

  if (question.type === "SUMMARY_COMPLETION") {
    return {
      type: "SUMMARY_BUILD",
      question: question.question,
      questionImage: getQuestionImage(question),
      answerTiles,
      correctAnswer,
    };
  }

  return {
    type: "WRITE_IN_ENGLISH",
    question: question.questionInVietnamese || question.question,
    questionImage: getQuestionImage(question),
    answerTiles,
    correctAnswer,
  };
};

const numbersEqual = (a: readonly number[], b: readonly number[]): boolean => {
  return a.length === b.length && a.every((_, i) => a[i] === b[i]);
};

const formatTime = (timeMs: number): string => {
  const seconds = Math.floor(timeMs / 1000) % 60;
  const minutes = Math.floor(timeMs / 1000 / 60) % 60;
  const hours = Math.floor(timeMs / 1000 / 60 / 60);
  if (hours === 0)
    return [minutes, seconds]
      .map((x) => x.toString().padStart(2, "0"))
      .join(":");
  return [hours, minutes, seconds]
    .map((x) => x.toString().padStart(2, "0"))
    .join(":");
};

const Lesson: NextPage = () => {
  const router = useRouter();
  const lessonId =
    typeof router.query.lessonId === "string" ? router.query.lessonId : null;
  const shouldUseBackendLesson = Boolean(lessonId);

  const [lessonProblem, setLessonProblem] = useState(0);
  const [correctAnswerCount, setCorrectAnswerCount] = useState(0);
  const [incorrectAnswerCount, setIncorrectAnswerCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<null | number>(null);
  const [correctAnswerShown, setCorrectAnswerShown] = useState(false);
  const [quitMessageShown, setQuitMessageShown] = useState(false);

  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);

  const startTime = useRef(Date.now());
  const endTime = useRef(startTime.current + 1000 * 60 * 3 + 1000 * 33);

  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [reviewLessonShown, setReviewLessonShown] = useState(false);
  const [backendProblems, setBackendProblems] = useState<
    LessonProblem[] | null
  >(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);

  useEffect(() => {
    setLessonProblem(0);
    setCorrectAnswerCount(0);
    setIncorrectAnswerCount(0);
    setSelectedAnswer(null);
    setCorrectAnswerShown(false);
    setQuitMessageShown(false);
    setSelectedAnswers([]);
    setQuestionResults([]);
    setReviewLessonShown(false);
    startTime.current = Date.now();
    endTime.current = startTime.current + 1000 * 60 * 3 + 1000 * 33;
  }, [router.asPath]);

  useEffect(() => {
    if (!router.isReady) return;

    if (!lessonId) {
      setBackendProblems(null);
      setLessonError(null);
      setLoadingLesson(false);
      return;
    }

    let isMounted = true;

    const fetchLesson = async () => {
      try {
        setLoadingLesson(true);
        setLessonError(null);
        const response = (await lessonAPI.getLesson(
          lessonId,
        )) as LessonResponse;
        const questions = response.data?.lesson?.questions ?? [];
        const nextProblems = questions
          .map(mapBackendQuestionToProblem)
          .filter((problem): problem is LessonProblem => problem !== null);

        if (!isMounted) return;

        if (nextProblems.length === 0) {
          setBackendProblems([]);
          setLessonError("This lesson has no questions yet.");
          return;
        }

        setBackendProblems(nextProblems);
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to load lesson:", error);
        setLessonError("Unable to load this lesson.");
        setBackendProblems([]);
      } finally {
        if (isMounted) {
          setLoadingLesson(false);
        }
      }
    };

    void fetchLesson();

    return () => {
      isMounted = false;
    };
  }, [lessonId, router.isReady]);

  const lessonIsLoading =
    shouldUseBackendLesson &&
    (loadingLesson || (backendProblems === null && !lessonError));
  const problems = shouldUseBackendLesson
    ? (backendProblems ?? [])
    : staticLessonProblems;

  const problem = (problems[lessonProblem] ??
    problems[0] ??
    staticLessonProblems[0]) as LessonProblem;

  const totalQuestions = shouldUseBackendLesson
    ? problems.length
    : staticLessonProblems.length;
  const totalCorrectAnswersNeeded = totalQuestions;
  const requiredCorrectAnswersToPass = Math.max(
    1,
    Math.ceil(totalQuestions * 0.8),
  );
  const answeredQuestions = correctAnswerCount + incorrectAnswerCount;
  const lessonHasEnded =
    answeredQuestions >= totalQuestions && !correctAnswerShown;
  const lessonPassed = correctAnswerCount >= requiredCorrectAnswersToPass;

  const [isStartingLesson, setIsStartingLesson] = useState(true);
  const hearts =
    "fast-forward" in router.query &&
    !isNaN(Number(router.query["fast-forward"]))
      ? 3 - incorrectAnswerCount
      : null;

  const correctAnswer = "correctAnswer" in problem ? problem.correctAnswer : [];
  const isAnswerCorrect = Array.isArray(correctAnswer)
    ? numbersEqual(selectedAnswers, correctAnswer)
    : selectedAnswer === correctAnswer;

  const onCheckAnswer = () => {
    setCorrectAnswerShown(true);
    if (isAnswerCorrect) {
      setCorrectAnswerCount((x) => x + 1);
    } else {
      setIncorrectAnswerCount((x) => x + 1);
    }
    setQuestionResults((questionResults) => [
      ...questionResults,
      {
        question: problem.question,
        yourResponse:
          problem.type === "SELECT_1_OF_3" ||
          problem.type === "TRUE_FALSE" ||
          problem.type === "HEADING_MATCH"
            ? (problem.answers[selectedAnswer ?? 0]?.name ?? "")
            : problem.type === "WRITE_IN_ENGLISH" ||
                problem.type === "SUMMARY_BUILD"
              ? selectedAnswers.map((i) => problem.answerTiles[i]).join(" ")
              : problem.type === "INTERVIEW"
                ? "Đã trả lời Interview"
                : problem.type === "DISCUSSION"
                  ? "Đã trả lời Discussion"
                  : problem.type === "DESCRIBE_PICTURE"
                    ? "Đã mô tả hình ảnh"
                    : problem.type === "PRESENTATION"
                    ? "Đã luyện thuyết trình"
                    : "Đã đọc bài ngữ pháp",
        correctResponse:
          problem.type === "SELECT_1_OF_3" ||
          problem.type === "TRUE_FALSE" ||
          problem.type === "HEADING_MATCH"
            ? (problem.answers[problem.correctAnswer]?.name ?? "")
            : problem.type === "WRITE_IN_ENGLISH" ||
                problem.type === "SUMMARY_BUILD"
              ? problem.correctAnswer
                  .map((i) => problem.answerTiles[i] ?? "")
                  .join(" ")
              : problem.type === "INTERVIEW"
                ? problem.sampleAnswer || "Câu trả lời mở"
                : problem.type === "DISCUSSION"
                  ? problem.sampleAnswer || "Câu trả lời mở"
                  : problem.type === "DESCRIBE_PICTURE"
                    ? problem.sampleAnswer || "Câu trả lời mở"
                    : problem.type === "PRESENTATION"
                    ? problem.sampleAnswer || "Bài thuyết trình mẫu"
                    : "Đã đọc bài ngữ pháp",
      },
    ]);
  };

  const onFinish = () => {
    setSelectedAnswer(null);
    setSelectedAnswers([]);
    setCorrectAnswerShown(false);
    setLessonProblem((x) => Math.min(x + 1, totalQuestions));
    endTime.current = Date.now();
  };

  const onSkip = () => {
    setSelectedAnswer(null);
    setCorrectAnswerShown(true);
  };

  // Dùng cho các dạng bài mở như Grammar, Interview, Discussion,
  // Describe Picture, Presentation. Khi bấm Continue sẽ tính là đã hoàn thành
  // để tránh bị kẹt lesson khi demo.
  const onFinishOpenEnded = () => {
    setCorrectAnswerCount((x) => x + 1);
    setQuestionResults((questionResults) => [
      ...questionResults,
      {
        question: problem.question,
        yourResponse:
          problem.type === "INTERVIEW"
            ? "Đã trả lời Interview"
            : problem.type === "DISCUSSION"
              ? "Đã trả lời Discussion"
              : problem.type === "DESCRIBE_PICTURE"
                ? "Đã mô tả hình ảnh"
                : problem.type === "PRESENTATION"
                  ? "Đã luyện thuyết trình"
                  : "Đã đọc bài ngữ pháp",
        correctResponse:
          problem.type === "INTERVIEW" ||
          problem.type === "DISCUSSION" ||
          problem.type === "DESCRIBE_PICTURE" ||
          problem.type === "PRESENTATION"
            ? problem.sampleAnswer || "Câu trả lời mở"
            : "Đã đọc bài ngữ pháp",
      },
    ]);
    onFinish();
  };

  const unitNumber = Number(router.query["fast-forward"]);

  if (lessonIsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Loading lesson...
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Fetching questions from the backend.
          </p>
        </div>
      </div>
    );
  }

  if (shouldUseBackendLesson && lessonError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-md rounded-3xl border-2 border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">
            Lesson unavailable
          </h1>
          <p className="mt-2 text-sm text-gray-500">{lessonError}</p>
          <Link
            href="/learn"
            className="mt-6 inline-flex rounded-2xl border-b-4 border-blue-500 bg-[#1cb0f6] px-5 py-3 text-sm font-bold uppercase text-white transition hover:brightness-110"
          >
            Back to learn
          </Link>
        </div>
      </div>
    );
  }

  if (hearts !== null && hearts < 0 && !correctAnswerShown) {
    return (
      <LessonFastForwardEndFail
        unitNumber={unitNumber}
        reviewLessonShown={reviewLessonShown}
        setReviewLessonShown={setReviewLessonShown}
        questionResults={questionResults}
      />
    );
  }

  if (hearts !== null && hearts >= 0 && lessonHasEnded && lessonPassed) {
    return (
      <LessonFastForwardEndPass
        unitNumber={unitNumber}
        reviewLessonShown={reviewLessonShown}
        setReviewLessonShown={setReviewLessonShown}
        questionResults={questionResults}
      />
    );
  }

  if (hearts !== null && lessonHasEnded && !lessonPassed) {
    return (
      <LessonFastForwardEndFail
        unitNumber={unitNumber}
        reviewLessonShown={reviewLessonShown}
        setReviewLessonShown={setReviewLessonShown}
        questionResults={questionResults}
      />
    );
  }

  if (hearts !== null && isStartingLesson) {
    return (
      <LessonFastForwardStart
        unitNumber={unitNumber}
        setIsStartingLesson={setIsStartingLesson}
      />
    );
  }

  if (hearts === null && lessonHasEnded && lessonPassed) {
    return (
      <LessonComplete
        correctAnswerCount={correctAnswerCount}
        incorrectAnswerCount={incorrectAnswerCount}
        startTime={startTime}
        endTime={endTime}
        reviewLessonShown={reviewLessonShown}
        setReviewLessonShown={setReviewLessonShown}
        questionResults={questionResults}
      />
    );
  }

  if (hearts === null && lessonHasEnded && !lessonPassed) {
    return (
      <LessonEndNeedsEightyPercent
        correctAnswerCount={correctAnswerCount}
        requiredCorrectAnswersToPass={requiredCorrectAnswersToPass}
        totalQuestions={totalQuestions}
      />
    );
  }

  switch (problem.type) {
    case "SELECT_1_OF_3": {
      return (
        <ProblemSelect1Of3
          problem={problem}
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          selectedAnswer={selectedAnswer}
          setSelectedAnswer={setSelectedAnswer}
          quitMessageShown={quitMessageShown}
          correctAnswerShown={correctAnswerShown}
          setQuitMessageShown={setQuitMessageShown}
          isAnswerCorrect={isAnswerCorrect}
          onCheckAnswer={onCheckAnswer}
          onFinish={onFinish}
          onSkip={onSkip}
          hearts={hearts}
        />
      );
    }

    case "TRUE_FALSE": {
      return (
        <ProblemTrueFalse
          problem={problem}
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          selectedAnswer={selectedAnswer}
          setSelectedAnswer={setSelectedAnswer}
          quitMessageShown={quitMessageShown}
          correctAnswerShown={correctAnswerShown}
          setQuitMessageShown={setQuitMessageShown}
          isAnswerCorrect={isAnswerCorrect}
          onCheckAnswer={onCheckAnswer}
          onFinish={onFinish}
          onSkip={onSkip}
          hearts={hearts}
        />
      );
    }

    case "HEADING_MATCH": {
      return (
        <ProblemHeadingMatch
          problem={problem}
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          selectedAnswer={selectedAnswer}
          setSelectedAnswer={setSelectedAnswer}
          quitMessageShown={quitMessageShown}
          correctAnswerShown={correctAnswerShown}
          setQuitMessageShown={setQuitMessageShown}
          isAnswerCorrect={isAnswerCorrect}
          onCheckAnswer={onCheckAnswer}
          onFinish={onFinish}
          onSkip={onSkip}
          hearts={hearts}
        />
      );
    }

    case "INTERVIEW": {
      return (
        <ProblemInterview
          problem={problem}
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          quitMessageShown={quitMessageShown}
          setQuitMessageShown={setQuitMessageShown}
          onFinish={onFinishOpenEnded}
          hearts={hearts}
        />
      );
    }

    case "DISCUSSION": {
      return (
        <ProblemDiscussion
          problem={problem}
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          quitMessageShown={quitMessageShown}
          setQuitMessageShown={setQuitMessageShown}
          onFinish={onFinishOpenEnded}
          hearts={hearts}
        />
      );
    }

    case "DESCRIBE_PICTURE": {
      return (
        <ProblemDescribePicture
          problem={problem}
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          quitMessageShown={quitMessageShown}
          setQuitMessageShown={setQuitMessageShown}
          onFinish={onFinishOpenEnded}
          hearts={hearts}
        />
      );
    }

    case "PRESENTATION": {
      return (
        <ProblemPresentationV2
          problem={problem}
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          quitMessageShown={quitMessageShown}
          setQuitMessageShown={setQuitMessageShown}
          onFinish={onFinishOpenEnded}
          hearts={hearts}
        />
      );
    }

    case "WRITING_TASK": {
      return (
        <ProblemWritingTask
          problem={problem}
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          quitMessageShown={quitMessageShown}
          setQuitMessageShown={setQuitMessageShown}
          onFinish={onFinishOpenEnded}
          hearts={hearts}
        />
      );
    }

    case "GRAMMAR_INTRO": {
      return (
        <ProblemGrammarIntro
          problem={problem}
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          quitMessageShown={quitMessageShown}
          setQuitMessageShown={setQuitMessageShown}
          onFinish={onFinishOpenEnded}
          hearts={hearts}
        />
      );
    }

    case "WRITE_IN_ENGLISH": {
      return (
        <ProblemWriteInEnglish
          problem={problem}
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          selectedAnswers={selectedAnswers}
          setSelectedAnswers={setSelectedAnswers}
          quitMessageShown={quitMessageShown}
          correctAnswerShown={correctAnswerShown}
          setQuitMessageShown={setQuitMessageShown}
          isAnswerCorrect={isAnswerCorrect}
          onCheckAnswer={onCheckAnswer}
          onFinish={onFinish}
          onSkip={onSkip}
          hearts={hearts}
        />
      );
    }

    case "SUMMARY_BUILD": {
      return (
        <ProblemSummaryBuild
          problem={problem}
          correctAnswerCount={correctAnswerCount}
          totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
          selectedAnswers={selectedAnswers}
          setSelectedAnswers={setSelectedAnswers}
          quitMessageShown={quitMessageShown}
          correctAnswerShown={correctAnswerShown}
          setQuitMessageShown={setQuitMessageShown}
          isAnswerCorrect={isAnswerCorrect}
          onCheckAnswer={onCheckAnswer}
          onFinish={onFinish}
          onSkip={onSkip}
          hearts={hearts}
        />
      );
    }
  }
};

export default Lesson;

const ProgressBar = ({
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  setQuitMessageShown,
  hearts,
}: {
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  setQuitMessageShown: (isShown: boolean) => void;
  hearts: null | number;
}) => {
  return (
    <header className="flex items-center gap-4">
      {correctAnswerCount === 0 ? (
        <Link href="/learn" className="text-gray-400">
          <CloseSvg />
          <span className="sr-only">Exit lesson</span>
        </Link>
      ) : (
        <button
          className="text-gray-400"
          onClick={() => setQuitMessageShown(true)}
        >
          <CloseSvg />
          <span className="sr-only">Exit lesson</span>
        </button>
      )}
      <div
        className="h-4 grow rounded-full bg-gray-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={correctAnswerCount / totalCorrectAnswersNeeded}
      >
        <div
          className={
            "h-full rounded-full bg-green-500 transition-all duration-700 " +
            (correctAnswerCount > 0 ? "px-2 pt-1 " : "")
          }
          style={{
            width: `${(correctAnswerCount / totalCorrectAnswersNeeded) * 100}%`,
          }}
        >
          <div className="h-[5px] w-full rounded-full bg-green-400"></div>
        </div>
      </div>
      {hearts !== null &&
        [1, 2, 3].map((heart) => {
          if (heart <= hearts) {
            return <LessonTopBarHeart key={heart} />;
          }
          return <LessonTopBarEmptyHeart key={heart} />;
        })}
    </header>
  );
};

const QuitMessage = ({
  quitMessageShown,
  setQuitMessageShown,
}: {
  quitMessageShown: boolean;
  setQuitMessageShown: (isShown: boolean) => void;
}) => {
  return (
    <>
      <div
        className={
          quitMessageShown
            ? "fixed bottom-0 left-0 right-0 top-0 z-30 bg-black bg-opacity-60 transition-all duration-300"
            : "pointer-events-none fixed bottom-0 left-0 right-0 top-0 z-30 bg-black bg-opacity-0 transition-all duration-300"
        }
        onClick={() => setQuitMessageShown(false)}
        aria-label="Close quit message"
        role="button"
      ></div>

      <article
        className={
          quitMessageShown
            ? "fixed bottom-0 left-0 right-0 z-40 flex flex-col gap-4 bg-white px-5 py-12 text-center transition-all duration-300 sm:flex-row"
            : "fixed -bottom-96 left-0 right-0 z-40 flex flex-col bg-white px-5 py-12 text-center transition-all duration-300 sm:flex-row"
        }
        aria-hidden={!quitMessageShown}
      >
        <div className="flex grow flex-col gap-4">
          <h2 className="text-lg font-bold sm:text-2xl">
            Are you sure you want to quit?
          </h2>
          <p className="text-gray-500 sm:text-lg">
            All progress for this lesson will be lost.
          </p>
        </div>
        <div className="flex grow flex-col items-center justify-center gap-4 sm:flex-row-reverse">
          <Link
            className="flex w-full items-center justify-center rounded-2xl border-b-4 border-blue-500 bg-blue-400 py-3 font-bold uppercase text-white transition hover:brightness-105 sm:w-48"
            href="/learn"
          >
            Quit
          </Link>
          <button
            className="w-full rounded-2xl py-3 font-bold uppercase text-blue-400 transition hover:brightness-90 sm:w-48 sm:border-2 sm:border-b-4 sm:border-gray-300 sm:text-gray-400 sm:hover:bg-gray-100"
            onClick={() => setQuitMessageShown(false)}
          >
            Stay
          </button>
        </div>
      </article>
    </>
  );
};

const CheckAnswer = ({
  isAnswerSelected,
  isAnswerCorrect,
  correctAnswerShown,
  correctAnswer,
  onCheckAnswer,
  onFinish,
  onSkip,
}: {
  isAnswerSelected: boolean;
  isAnswerCorrect: boolean;
  correctAnswerShown: boolean;
  correctAnswer: string;
  onCheckAnswer: () => void;
  onFinish: () => void;
  onSkip: () => void;
}) => {
  return (
    <>
      <section className="border-gray-200 sm:border-t-2 sm:p-10">
        <div className="mx-auto flex max-w-5xl sm:justify-between">
          <button
            className="hidden rounded-2xl border-2 border-b-4 border-gray-200 bg-white p-3 font-bold uppercase text-gray-400 transition hover:border-gray-300 hover:bg-gray-200 sm:block sm:min-w-[150px] sm:max-w-fit"
            onClick={onSkip}
          >
            Skip
          </button>
          {!isAnswerSelected ? (
            <button
              className="grow rounded-2xl bg-gray-200 p-3 font-bold uppercase text-gray-400 sm:min-w-[150px] sm:max-w-fit sm:grow-0"
              disabled
            >
              Check
            </button>
          ) : (
            <button
              onClick={onCheckAnswer}
              className="grow rounded-2xl border-b-4 border-green-600 bg-green-500 p-3 font-bold uppercase text-white sm:min-w-[150px] sm:max-w-fit sm:grow-0"
            >
              Check
            </button>
          )}
        </div>
      </section>

      <div
        className={
          correctAnswerShown
            ? isAnswerCorrect
              ? "fixed bottom-0 left-0 right-0 bg-lime-100 font-bold text-green-600 transition-all"
              : "fixed bottom-0 left-0 right-0 bg-red-100 font-bold text-red-500 transition-all"
            : "fixed -bottom-52 left-0 right-0"
        }
      >
        <div className="flex max-w-5xl flex-col gap-4 p-5 sm:mx-auto sm:flex-row sm:items-center sm:justify-between sm:p-10 sm:py-14">
          <>
            {isAnswerCorrect ? (
              <div className="mb-2 flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="hidden rounded-full bg-white p-5 text-green-500 sm:block">
                  <DoneSvg />
                </div>
                <div className="text-2xl">Good job!</div>
              </div>
            ) : (
              <div className="mb-2 flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="hidden rounded-full bg-white p-5 text-red-500 sm:block">
                  <BigCloseSvg />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-2xl">Correct solution:</div>{" "}
                  <div className="text-sm font-normal">{correctAnswer}</div>
                </div>
              </div>
            )}
          </>
          <button
            onClick={onFinish}
            className={
              isAnswerCorrect
                ? "w-full rounded-2xl border-b-4 border-green-600 bg-green-500 p-3 font-bold uppercase text-white transition hover:brightness-105 sm:min-w-[150px] sm:max-w-fit"
                : "w-full rounded-2xl border-b-4 border-red-600 bg-red-500 p-3 font-bold uppercase text-white transition hover:brightness-105 sm:min-w-[150px] sm:max-w-fit"
            }
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

const ProblemSelect1Of3 = ({
  problem,
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  selectedAnswer,
  setSelectedAnswer,
  quitMessageShown,
  correctAnswerShown,
  setQuitMessageShown,
  isAnswerCorrect,
  onCheckAnswer,
  onFinish,
  onSkip,
  hearts,
}: {
  problem: Extract<LessonProblem, { type: "SELECT_1_OF_3" }>;
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  selectedAnswer: number | null;
  setSelectedAnswer: React.Dispatch<React.SetStateAction<number | null>>;
  correctAnswerShown: boolean;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  isAnswerCorrect: boolean;
  onCheckAnswer: () => void;
  onFinish: () => void;
  onSkip: () => void;
  hearts: number | null;
}) => {
  const { question, questionImage, answers, correctAnswer } = problem;

  return (
    <div className="flex min-h-screen flex-col gap-5 px-4 py-5 sm:px-0 sm:py-0">
      <div className="flex grow flex-col items-center gap-5">
        <div className="w-full max-w-5xl sm:mt-8 sm:px-5">
          <ProgressBar
            correctAnswerCount={correctAnswerCount}
            totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
            setQuitMessageShown={setQuitMessageShown}
            hearts={hearts}
          />
        </div>
        <section className="flex max-w-2xl grow flex-col gap-5 self-center sm:items-center sm:justify-center sm:gap-24 sm:px-5">
          <h1 className="self-start text-2xl font-bold sm:text-3xl">
            {question}
          </h1>

          {questionImage ? (
            <img
              src={questionImage}
              alt={question}
              className="max-h-[320px] w-full max-w-xl rounded-3xl border-2 border-gray-200 object-cover shadow-sm"
            />
          ) : null}

          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            role="radiogroup"
          >
            {answers.map((answer, i) => {
              return (
                <div
                  key={i}
                  className={
                    i === selectedAnswer
                      ? "cursor-pointer rounded-xl border-2 border-b-4 border-blue-300 bg-blue-100 p-4 text-blue-400"
                      : "cursor-pointer rounded-xl border-2 border-b-4 border-gray-200 p-4 hover:bg-gray-100"
                  }
                  role="radio"
                  aria-checked={i === selectedAnswer}
                  tabIndex={0}
                  onClick={() => setSelectedAnswer(i)}
                >
                  {answer.icon}
                  <h2 className="text-center">{answer.name}</h2>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <CheckAnswer
        correctAnswer={answers[correctAnswer]?.name ?? ""}
        correctAnswerShown={correctAnswerShown}
        isAnswerCorrect={isAnswerCorrect}
        isAnswerSelected={selectedAnswer !== null}
        onCheckAnswer={onCheckAnswer}
        onFinish={onFinish}
        onSkip={onSkip}
      />

      <QuitMessage
        quitMessageShown={quitMessageShown}
        setQuitMessageShown={setQuitMessageShown}
      />
    </div>
  );
};


const ProblemTrueFalse = ({
  problem,
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  selectedAnswer,
  setSelectedAnswer,
  quitMessageShown,
  correctAnswerShown,
  setQuitMessageShown,
  isAnswerCorrect,
  onCheckAnswer,
  onFinish,
  onSkip,
  hearts,
}: {
  problem: Extract<LessonProblem, { type: "TRUE_FALSE" }>;
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  selectedAnswer: number | null;
  setSelectedAnswer: React.Dispatch<React.SetStateAction<number | null>>;
  correctAnswerShown: boolean;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  isAnswerCorrect: boolean;
  onCheckAnswer: () => void;
  onFinish: () => void;
  onSkip: () => void;
  hearts: number | null;
}) => {
  const { question, questionImage, answers, correctAnswer } = problem;
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const askTrueFalseAI = async () => {
    try {
      setLoadingAI(true);
      setAiFeedback("");

      const res = await fetch("http://localhost:5000/api/true-false-ai/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          correctAnswer,
          userAnswer: selectedAnswer,
          selectedAnswer,
        }),
      });

      let data: any = {};

      try {
        data = await res.json();
      } catch (jsonError) {
        console.error("TRUE_FALSE_AI_JSON_ERROR:", jsonError);
      }

      if (!res.ok) {
        console.error("TRUE_FALSE_AI_STATUS:", res.status);
        console.error("TRUE_FALSE_AI_RESPONSE:", data);

        setAiFeedback(
          data?.message ||
            data?.error ||
            `Backend AI bị lỗi. Status: ${res.status}`
        );
        return;
      }

      if (!data.success) {
        console.error("TRUE_FALSE_AI_UNSUCCESSFUL:", data);

        setAiFeedback(
          data?.message ||
            data?.error ||
            "AI chưa thể giải thích câu True/False này."
        );
        return;
      }

      setAiFeedback(data.feedback || data.explanation || "AI chưa có phản hồi.");
    } catch (error: any) {
      console.error("TRUE_FALSE_AI_FETCH_ERROR:", error);

      setAiFeedback(
        error?.message ||
          "Không thể kết nối AI True/False."
      );
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-5 px-4 py-5 sm:px-0 sm:py-0">
      <div className="flex grow flex-col items-center gap-5">
        <div className="w-full max-w-5xl sm:mt-8 sm:px-5">
          <ProgressBar
            correctAnswerCount={correctAnswerCount}
            totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
            setQuitMessageShown={setQuitMessageShown}
            hearts={hearts}
          />
        </div>

        <section className="flex w-full max-w-3xl grow flex-col items-center justify-center gap-6 sm:px-5">
          <div className="rounded-full bg-blue-100 px-5 py-2 text-sm font-black uppercase tracking-wide text-blue-700">
            True / False
          </div>

          <h1 className="text-center text-2xl font-bold text-gray-800 sm:text-3xl">
            {question}
          </h1>

          {questionImage ? (
            <img
              src={questionImage}
              alt={question}
              className="max-h-[320px] w-full max-w-xl rounded-3xl border-2 border-gray-200 object-cover shadow-sm"
            />
          ) : null}

          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {answers.map((answer, index) => (
              <button
                key={answer.name}
                type="button"
                onClick={() => {
                  if (!correctAnswerShown) {
                    setSelectedAnswer(index);
                  }
                }}
                disabled={correctAnswerShown}
                className={
                  index === selectedAnswer
                    ? "rounded-3xl border-2 border-b-4 border-blue-400 bg-blue-100 p-8 text-2xl font-bold text-blue-700 transition"
                    : "rounded-3xl border-2 border-b-4 border-gray-200 bg-white p-8 text-2xl font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-80"
                }
              >
                {answer.name}
              </button>
            ))}
          </div>

          {correctAnswerShown ? (
            <div className="w-full rounded-3xl border-2 border-purple-200 bg-purple-50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-bold text-purple-700">
                    AI True/False Explanation
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    AI giải thích vì sao đáp án là {answers[correctAnswer]?.name ?? ""}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={askTrueFalseAI}
                  disabled={loadingAI}
                  className="rounded-2xl border-b-4 border-purple-700 bg-purple-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
                >
                  {loadingAI ? "AI is thinking..." : "🤖 AI Explain"}
                </button>
              </div>

              {aiFeedback ? (
                <div className="mt-4 whitespace-pre-line rounded-2xl bg-white p-4 text-sm leading-6 text-gray-700">
                  {aiFeedback}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <CheckAnswer
        correctAnswer={answers[correctAnswer]?.name ?? ""}
        correctAnswerShown={correctAnswerShown}
        isAnswerCorrect={isAnswerCorrect}
        isAnswerSelected={selectedAnswer !== null}
        onCheckAnswer={onCheckAnswer}
        onFinish={onFinish}
        onSkip={onSkip}
      />

      <QuitMessage
        quitMessageShown={quitMessageShown}
        setQuitMessageShown={setQuitMessageShown}
      />
    </div>
  );
};

const ProblemHeadingMatch = ({
  problem,
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  selectedAnswer,
  setSelectedAnswer,
  quitMessageShown,
  correctAnswerShown,
  setQuitMessageShown,
  isAnswerCorrect,
  onCheckAnswer,
  onFinish,
  onSkip,
  hearts,
}: {
  problem: Extract<LessonProblem, { type: "HEADING_MATCH" }>;
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  selectedAnswer: number | null;
  setSelectedAnswer: React.Dispatch<React.SetStateAction<number | null>>;
  correctAnswerShown: boolean;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  isAnswerCorrect: boolean;
  onCheckAnswer: () => void;
  onFinish: () => void;
  onSkip: () => void;
  hearts: number | null;
}) => {
  const { question, questionImage, answers, correctAnswer } = problem;
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const askHeadingAI = async () => {
    try {
      setLoadingAI(true);
      setAiFeedback("");

      const res = await fetch("http://localhost:5000/api/matching-heading-ai/hint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          headings: answers.map((answer) => answer.name),
          selectedHeading:
            selectedAnswer !== null ? answers[selectedAnswer]?.name : "",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAiFeedback(data.message || "AI cannot help with this heading match right now.");
        return;
      }

      setAiFeedback(data.feedback || "AI has no hint yet.");
    } catch (error) {
      setAiFeedback("Cannot connect to Heading Match AI.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-5 px-4 py-5 sm:px-0 sm:py-0">
      <div className="flex grow flex-col items-center gap-5">
        <div className="w-full max-w-5xl sm:mt-8 sm:px-5">
          <ProgressBar
            correctAnswerCount={correctAnswerCount}
            totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
            setQuitMessageShown={setQuitMessageShown}
            hearts={hearts}
          />
        </div>

        <section className="flex w-full max-w-4xl grow flex-col justify-center gap-5 sm:px-5">
          <div className="rounded-3xl border-2 border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-4 w-fit rounded-full bg-blue-100 px-5 py-2 text-sm font-black uppercase tracking-wide text-blue-700">
              Heading Match
            </div>

            <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
              Choose the best heading for the text
            </h1>

            {questionImage ? (
              <img
                src={questionImage}
                alt="Reading visual"
                className="mt-5 max-h-[280px] w-full rounded-2xl border-2 border-gray-200 object-cover shadow-sm"
              />
            ) : null}

            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-lg leading-8 text-gray-800">
              {question}
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 sm:grid-cols-3">
              <div>
                <div className="font-bold">1. Read for gist</div>
                <p className="mt-1">Do not translate every word.</p>
              </div>
              <div>
                <div className="font-bold">2. Find keywords</div>
                <p className="mt-1">Look for repeated or important ideas.</p>
              </div>
              <div>
                <div className="font-bold">3. Match meaning</div>
                <p className="mt-1">Choose the same main idea.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3" role="radiogroup">
              {answers.map((answer, index) => (
                <button
                  key={`${answer.name}-${index}`}
                  type="button"
                  role="radio"
                  aria-checked={selectedAnswer === index}
                  onClick={() => setSelectedAnswer(index)}
                  className={
                    selectedAnswer === index
                      ? "rounded-2xl border-2 border-b-4 border-blue-400 bg-blue-100 p-4 text-left font-bold text-blue-700"
                      : "rounded-2xl border-2 border-b-4 border-gray-200 bg-white p-4 text-left font-bold text-gray-700 hover:bg-gray-50"
                  }
                >
                  {answer.name}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={askHeadingAI}
                disabled={loadingAI}
                className="rounded-2xl border-b-4 border-purple-700 bg-purple-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
              >
                {loadingAI ? "AI is thinking..." : "AI Reading Hint"}
              </button>
            </div>

            {aiFeedback ? (
              <div className="mt-5 rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-purple-700">
                <div className="font-bold">AI Reading Coach</div>
                <div className="mt-2 whitespace-pre-line text-sm leading-6">
                  {aiFeedback}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <CheckAnswer
        correctAnswer={answers[correctAnswer]?.name ?? ""}
        correctAnswerShown={correctAnswerShown}
        isAnswerCorrect={isAnswerCorrect}
        isAnswerSelected={selectedAnswer !== null}
        onCheckAnswer={onCheckAnswer}
        onFinish={onFinish}
        onSkip={onSkip}
      />

      <QuitMessage
        quitMessageShown={quitMessageShown}
        setQuitMessageShown={setQuitMessageShown}
      />
    </div>
  );
};

const ProblemWriteInEnglish = ({
  problem,
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  selectedAnswers,
  setSelectedAnswers,
  quitMessageShown,
  correctAnswerShown,
  setQuitMessageShown,
  isAnswerCorrect,
  onCheckAnswer,
  onFinish,
  onSkip,
  hearts,
}: {
  problem: Extract<LessonProblem, { type: "WRITE_IN_ENGLISH" }>;
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  selectedAnswers: number[];
  setSelectedAnswers: React.Dispatch<React.SetStateAction<number[]>>;
  correctAnswerShown: boolean;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  isAnswerCorrect: boolean;
  onCheckAnswer: () => void;
  onFinish: () => void;
  onSkip: () => void;
  hearts: number | null;
}) => {
  const { question, questionImage, correctAnswer, answerTiles } = problem;

  return (
    <div className="flex min-h-screen flex-col gap-5 px-4 py-5 sm:px-0 sm:py-0">
      <div className="flex grow flex-col items-center gap-5">
        <div className="w-full max-w-5xl sm:mt-8 sm:px-5">
          <ProgressBar
            correctAnswerCount={correctAnswerCount}
            totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
            setQuitMessageShown={setQuitMessageShown}
            hearts={hearts}
          />
        </div>
        <section className="flex max-w-2xl grow flex-col gap-5 self-center sm:items-center sm:justify-center sm:gap-24">
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
            Write this in English
          </h1>

          {questionImage ? (
            <img
              src={questionImage}
              alt={question}
              className="max-h-[320px] w-full max-w-xl rounded-3xl border-2 border-gray-200 object-cover shadow-sm"
            />
          ) : null}

          <div className="w-full">
            <div className="flex items-center gap-2 px-2">
              <Image src={womanPng} alt="" width={92} height={115} />
              <div className="relative ml-2 w-fit rounded-2xl border-2 border-gray-200 p-4">
                {question}
                <div
                  className="absolute h-4 w-4 rotate-45 border-b-2 border-l-2 border-gray-200 bg-white"
                  style={{
                    top: "calc(50% - 8px)",
                    left: "-10px",
                  }}
                ></div>
              </div>
            </div>

            <div className="flex min-h-[60px] flex-wrap gap-1 border-b-2 border-t-2 border-gray-200 py-1">
              {selectedAnswers.map((i) => {
                return (
                  <button
                    key={i}
                    className="rounded-2xl border-2 border-b-4 border-gray-200 p-2 text-gray-700"
                    onClick={() => {
                      setSelectedAnswers((selectedAnswers) => {
                        return selectedAnswers.filter((x) => x !== i);
                      });
                    }}
                  >
                    {answerTiles[i]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {answerTiles.map((answerTile, i) => {
              return (
                <button
                  key={i}
                  className={
                    selectedAnswers.includes(i)
                      ? "rounded-2xl border-2 border-b-4 border-gray-200 bg-gray-200 p-2 text-gray-200"
                      : "rounded-2xl border-2 border-b-4 border-gray-200 p-2 text-gray-700"
                  }
                  disabled={selectedAnswers.includes(i)}
                  onClick={() =>
                    setSelectedAnswers((selectedAnswers) => {
                      if (selectedAnswers.includes(i)) {
                        return selectedAnswers;
                      }
                      return [...selectedAnswers, i];
                    })
                  }
                >
                  {answerTile}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <CheckAnswer
        correctAnswer={correctAnswer.map((i) => answerTiles[i]).join(" ")}
        correctAnswerShown={correctAnswerShown}
        isAnswerCorrect={isAnswerCorrect}
        isAnswerSelected={selectedAnswers.length > 0}
        onCheckAnswer={onCheckAnswer}
        onFinish={onFinish}
        onSkip={onSkip}
      />

      <QuitMessage
        quitMessageShown={quitMessageShown}
        setQuitMessageShown={setQuitMessageShown}
      />
    </div>
  );
};

const ProblemInterview = ({
  problem,
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  quitMessageShown,
  setQuitMessageShown,
  onFinish,
  hearts,
}: {
  problem: Extract<LessonProblem, { type: "INTERVIEW" }>;
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  onFinish: () => void;
  hearts: number | null;
}) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const askAI = async (mode: "hint" | "check") => {
    try {
      setLoadingAI(true);
      setAiFeedback("");

      const prompt =
        mode === "hint"
          ? `Câu hỏi phỏng vấn tiếng Anh: ${problem.question}. Hãy gợi ý cách trả lời ngắn gọn bằng tiếng Việt, không viết hộ toàn bộ câu trả lời.`
          : `Câu hỏi phỏng vấn tiếng Anh: ${problem.question}. Câu trả lời của người học: ${userAnswer}. Câu trả lời mẫu: ${problem.sampleAnswer || ""}. Hãy sửa lỗi ngữ pháp, giải thích dễ hiểu bằng tiếng Việt và gợi ý câu trả lời tự nhiên hơn.`;

      const res = await fetch("http://localhost:5000/api/fill-blank-ai/hint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: prompt,
          options: [],
          level: "A1",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAiFeedback(data.message || "AI chưa thể hỗ trợ câu hỏi này.");
        return;
      }

      setAiFeedback(data.hint || "AI chưa có phản hồi.");
    } catch (err) {
      setAiFeedback("Không thể kết nối AI.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-5 px-4 py-5 sm:px-0 sm:py-0">
      <div className="flex grow flex-col items-center gap-5">
        <div className="w-full max-w-5xl sm:mt-8 sm:px-5">
          <ProgressBar
            correctAnswerCount={correctAnswerCount}
            totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
            setQuitMessageShown={setQuitMessageShown}
            hearts={hearts}
          />
        </div>

        <section className="flex w-full max-w-3xl grow flex-col justify-center gap-6">
          <div className="rounded-3xl border-2 border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-3 text-sm font-black uppercase tracking-wide text-purple-600">
              AI Interview Practice
            </div>

            <h1 className="text-3xl font-bold text-gray-800">
              {problem.question}
            </h1>

            {problem.questionImage ? (
              <img
                src={problem.questionImage}
                alt={problem.question}
                className="mt-5 max-h-[320px] w-full rounded-2xl object-cover"
              />
            ) : null}

            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Write your answer in English..."
              className="mt-6 h-40 w-full rounded-2xl border-2 border-gray-200 p-4 text-lg outline-none focus:border-blue-400"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => askAI("hint")}
                disabled={loadingAI}
                className="rounded-2xl border-b-4 border-purple-700 bg-purple-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
              >
                {loadingAI ? "AI is thinking..." : "🤖 AI Suggest"}
              </button>

              <button
                onClick={() => askAI("check")}
                disabled={loadingAI || !userAnswer.trim()}
                className="rounded-2xl border-b-4 border-blue-600 bg-blue-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
              >
                AI Check
              </button>

              <button
                onClick={onFinish}
                className="rounded-2xl border-b-4 border-green-600 bg-green-500 px-5 py-3 font-bold text-white transition hover:brightness-110"
              >
                Continue
              </button>
            </div>

            {aiFeedback ? (
              <div className="mt-5 rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-purple-700">
                <div className="font-bold">AI Feedback:</div>
                <div className="mt-2 whitespace-pre-line text-sm leading-6">
                  {aiFeedback}
                </div>
              </div>
            ) : null}

            {problem.sampleAnswer ? (
              <div className="mt-5 rounded-2xl bg-green-100 p-4">
                <div className="font-bold text-green-700">Sample Answer</div>
                <div className="mt-2 text-gray-700">
                  {problem.sampleAnswer}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <QuitMessage
        quitMessageShown={quitMessageShown}
        setQuitMessageShown={setQuitMessageShown}
      />
    </div>
  );
};



const ProblemDescribePicture = ({
  problem,
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  quitMessageShown,
  setQuitMessageShown,
  onFinish,
  hearts,
}: {
  problem: Extract<LessonProblem, { type: "DESCRIBE_PICTURE" }>;
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  onFinish: () => void;
  hearts: number | null;
}) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const askDescribePictureAI = async (mode: "hint" | "check") => {
    try {
      setLoadingAI(true);
      setAiFeedback("");

      const res = await fetch(`http://localhost:5000/api/describe-picture-ai/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: problem.question,
          answer: userAnswer,
          sampleAnswer: problem.sampleAnswer || "",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAiFeedback(data.message || "AI cannot help with this picture right now.");
        return;
      }

      setAiFeedback(data.feedback || "AI has no feedback yet.");
    } catch (err) {
      setAiFeedback("Cannot connect to Describe Picture AI.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-5 px-4 py-5 sm:px-0 sm:py-0">
      <div className="flex grow flex-col items-center gap-5">
        <div className="w-full max-w-5xl sm:mt-8 sm:px-5">
          <ProgressBar
            correctAnswerCount={correctAnswerCount}
            totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
            setQuitMessageShown={setQuitMessageShown}
            hearts={hearts}
          />
        </div>

        <section className="flex w-full max-w-4xl grow flex-col justify-center gap-6 sm:px-5">
          <div className="rounded-3xl border-2 border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-2 text-sm font-black uppercase tracking-wide text-purple-600">
                  Describe Picture
                </div>
                <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
                  {problem.question || "Describe this picture in 2-3 sentences"}
                </h1>
              </div>
            </div>

            {problem.questionImage ? (
              <img
                src={problem.questionImage}
                alt={problem.question}
                className="mx-auto mt-5 max-h-[360px] w-full rounded-2xl border-2 border-gray-200 object-contain shadow-sm"
              />
            ) : (
              <div className="mt-5 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-400">
                No image available
              </div>
            )}

            <div className="mt-5 grid gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 sm:grid-cols-3">
              <div>
                <div className="font-bold">1. Observe</div>
                <p className="mt-1">Who, where, action, feeling.</p>
              </div>
              <div>
                <div className="font-bold">2. Build</div>
                <p className="mt-1">Use: I can see..., There is..., They are...</p>
              </div>
              <div>
                <div className="font-bold">3. Write</div>
                <p className="mt-1">Write 2-3 short, clear sentences.</p>
              </div>
            </div>

            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Example: I can see two students in a classroom. They are reading books. They look happy."
              className="mt-6 h-36 w-full rounded-2xl border-2 border-gray-200 p-4 text-lg outline-none focus:border-blue-400"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => askDescribePictureAI("hint")}
                disabled={loadingAI}
                className="rounded-2xl border-b-4 border-purple-700 bg-purple-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
              >
                {loadingAI ? "AI is thinking..." : "AI Hint"}
              </button>

              <button
                type="button"
                onClick={() => askDescribePictureAI("check")}
                disabled={loadingAI || !userAnswer.trim()}
                className="rounded-2xl border-b-4 border-blue-600 bg-blue-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
              >
                AI Check
              </button>

              <button
                type="button"
                onClick={onFinish}
                className="ml-auto rounded-2xl border-b-4 border-green-600 bg-green-500 px-6 py-3 font-bold text-white transition hover:brightness-110"
              >
                Continue
              </button>
            </div>

            {aiFeedback ? (
              <div className="mt-5 rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-purple-700">
                <div className="font-bold">AI Feedback</div>
                <div className="mt-2 whitespace-pre-line text-sm leading-6">
                  {aiFeedback}
                </div>
              </div>
            ) : null}

            {problem.sampleAnswer ? (
              <div className="mt-5 rounded-2xl bg-green-100 p-4">
                <div className="font-bold text-green-700">Sample Answer</div>
                <div className="mt-2 whitespace-pre-line text-gray-700">
                  {problem.sampleAnswer}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <QuitMessage
        quitMessageShown={quitMessageShown}
        setQuitMessageShown={setQuitMessageShown}
      />
    </div>
  );
};

const ProblemDiscussion = ({
  problem,
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  quitMessageShown,
  setQuitMessageShown,
  onFinish,
  hearts,
}: {
  problem: Extract<LessonProblem, { type: "DISCUSSION" }>;
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  onFinish: () => void;
  hearts: number | null;
}) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const askDiscussionAI = async (mode: "hint" | "check") => {
    try {
      setLoadingAI(true);
      setAiFeedback("");

      const res = await fetch(`http://localhost:5000/api/discussion-ai/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: problem.question,
          answer: userAnswer,
          sampleAnswer: problem.sampleAnswer || "",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAiFeedback(data.message || "AI chưa thể hỗ trợ phần Discussion.");
        return;
      }

      setAiFeedback(data.feedback || "AI chưa có phản hồi.");
    } catch (err) {
      setAiFeedback("Không thể kết nối AI Discussion.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-5 px-4 py-5 sm:px-0 sm:py-0">
      <div className="flex grow flex-col items-center gap-5">
        <div className="w-full max-w-5xl sm:mt-8 sm:px-5">
          <ProgressBar
            correctAnswerCount={correctAnswerCount}
            totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
            setQuitMessageShown={setQuitMessageShown}
            hearts={hearts}
          />
        </div>

        <section className="flex w-full max-w-3xl grow flex-col justify-center gap-6">
          <div className="rounded-3xl border-2 border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-3 text-sm font-black uppercase tracking-wide text-purple-600">
              AI Discussion Practice
            </div>

            <h1 className="text-3xl font-bold text-gray-800">
              {problem.question}
            </h1>

            {problem.questionImage ? (
              <img
                src={problem.questionImage}
                alt={problem.question}
                className="mt-5 max-h-[320px] w-full rounded-2xl object-cover"
              />
            ) : null}

            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Write your opinion in English..."
              className="mt-6 h-40 w-full rounded-2xl border-2 border-gray-200 p-4 text-lg outline-none focus:border-blue-400"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => askDiscussionAI("hint")}
                disabled={loadingAI}
                className="rounded-2xl border-b-4 border-purple-700 bg-purple-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
              >
                {loadingAI ? "AI is thinking..." : "💡 AI Hint"}
              </button>

              <button
                onClick={() => askDiscussionAI("check")}
                disabled={loadingAI || !userAnswer.trim()}
                className="rounded-2xl border-b-4 border-blue-600 bg-blue-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
              >
                ✅ AI Check
              </button>

              <button
                onClick={onFinish}
                className="rounded-2xl border-b-4 border-green-600 bg-green-500 px-5 py-3 font-bold text-white transition hover:brightness-110"
              >
                Continue
              </button>
            </div>

            {aiFeedback ? (
              <div className="mt-5 rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-purple-700">
                <div className="font-bold">AI Feedback:</div>
                <div className="mt-2 whitespace-pre-line text-sm leading-6">
                  {aiFeedback}
                </div>
              </div>
            ) : null}

            {problem.sampleAnswer ? (
              <div className="mt-5 rounded-2xl bg-green-100 p-4">
                <div className="font-bold text-green-700">Sample Answer</div>
                <div className="mt-2 whitespace-pre-line text-gray-700">
                  {problem.sampleAnswer}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <QuitMessage
        quitMessageShown={quitMessageShown}
        setQuitMessageShown={setQuitMessageShown}
      />
    </div>
  );
};

const ProblemPresentationV2 = ({
  problem,
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  quitMessageShown,
  setQuitMessageShown,
  onFinish,
  hearts,
}: {
  problem: Extract<LessonProblem, { type: "PRESENTATION" }>;
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  onFinish: () => void;
  hearts: number | null;
}) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const askPresentationAI = async (mode: "hint" | "check") => {
    try {
      setLoadingAI(true);
      setAiFeedback("");

      const res = await fetch(`http://localhost:5000/api/presentation-ai/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: problem.question,
          answer: userAnswer,
          sampleAnswer: problem.sampleAnswer || "",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAiFeedback(data.message || "AI cannot help with this presentation right now.");
        return;
      }

      setAiFeedback(data.feedback || "AI has no feedback yet.");
    } catch (err) {
      setAiFeedback("Cannot connect to Presentation AI.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-5 px-4 py-5 sm:px-0 sm:py-0">
      <div className="flex grow flex-col items-center gap-5">
        <div className="w-full max-w-5xl sm:mt-8 sm:px-5">
          <ProgressBar
            correctAnswerCount={correctAnswerCount}
            totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
            setQuitMessageShown={setQuitMessageShown}
            hearts={hearts}
          />
        </div>

        <section className="flex w-full max-w-4xl grow flex-col items-center justify-center gap-6 sm:px-5">
          <div className="w-full rounded-3xl border-2 border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-center">
              <div className="mx-auto mb-4 w-fit rounded-full bg-purple-100 px-5 py-2 text-sm font-black uppercase tracking-wide text-purple-700">
                Presentation Practice
              </div>

              <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
                {problem.question}
              </h1>
            </div>

            {problem.questionImage ? (
              <img
                src={problem.questionImage}
                alt={problem.question}
                className="mx-auto mt-6 max-h-[320px] w-full max-w-xl rounded-3xl border-2 border-gray-200 object-cover shadow-sm"
              />
            ) : null}

            <div className="mt-6 grid gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 sm:grid-cols-4">
              <div>
                <div className="font-bold">1. Opening</div>
                <p className="mt-1">Hello everyone. Today I will talk about...</p>
              </div>
              <div>
                <div className="font-bold">2. Main ideas</div>
                <p className="mt-1">Give 2-3 short ideas with examples.</p>
              </div>
              <div>
                <div className="font-bold">3. Easy words</div>
                <p className="mt-1">Use simple words you can say clearly.</p>
              </div>
              <div>
                <div className="font-bold">4. Closing</div>
                <p className="mt-1">Thank you for listening.</p>
              </div>
            </div>

            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Write your short presentation here..."
              className="mt-6 h-44 w-full rounded-2xl border-2 border-gray-200 p-4 text-lg leading-8 outline-none focus:border-blue-400"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => askPresentationAI("hint")}
                disabled={loadingAI}
                className="rounded-2xl border-b-4 border-purple-700 bg-purple-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
              >
                {loadingAI ? "AI is thinking..." : "AI Hint"}
              </button>

              <button
                type="button"
                onClick={() => askPresentationAI("check")}
                disabled={loadingAI || !userAnswer.trim()}
                className="rounded-2xl border-b-4 border-blue-600 bg-blue-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
              >
                AI Check
              </button>

              <button
                type="button"
                onClick={onFinish}
                className="ml-auto rounded-2xl border-b-4 border-green-600 bg-green-500 px-6 py-3 font-bold uppercase text-white transition hover:brightness-110"
              >
                Continue
              </button>
            </div>

            {aiFeedback ? (
              <div className="mt-5 rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-purple-700">
                <div className="font-bold">AI Feedback</div>
                <div className="mt-2 whitespace-pre-line text-sm leading-6">
                  {aiFeedback}
                </div>
              </div>
            ) : null}

            {problem.sampleAnswer ? (
              <details className="mt-5 rounded-2xl bg-green-100 p-4" open={!userAnswer.trim()}>
                <summary className="cursor-pointer font-bold text-green-700">
                  Sample Presentation Answer
                </summary>
                <div className="mt-3 whitespace-pre-line text-gray-800">
                  {problem.sampleAnswer}
                </div>
              </details>
            ) : (
              <div className="mt-5 rounded-2xl bg-gray-100 p-5 text-gray-600">
                No sample answer for this topic yet.
              </div>
            )}
          </div>
        </section>
      </div>

      <QuitMessage
        quitMessageShown={quitMessageShown}
        setQuitMessageShown={setQuitMessageShown}
      />
    </div>
  );
};

const ProblemPresentation = ({
  problem,
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  quitMessageShown,
  setQuitMessageShown,
  onFinish,
  hearts,
}: {
  problem: Extract<LessonProblem, { type: "PRESENTATION" }>;
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  onFinish: () => void;
  hearts: number | null;
}) => {
  return (
    <div className="flex min-h-screen flex-col gap-5 px-4 py-5 sm:px-0 sm:py-0">
      <div className="flex grow flex-col items-center gap-5">
        <div className="w-full max-w-5xl sm:mt-8 sm:px-5">
          <ProgressBar
            correctAnswerCount={correctAnswerCount}
            totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
            setQuitMessageShown={setQuitMessageShown}
            hearts={hearts}
          />
        </div>

        <section className="flex w-full max-w-3xl grow flex-col items-center justify-center gap-6 sm:px-5">
          <div className="rounded-full bg-purple-100 px-5 py-2 text-sm font-black uppercase tracking-wide text-purple-700">
            Presentation Practice
          </div>

          <div className="w-full rounded-3xl border-2 border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-center text-2xl font-bold text-gray-800 sm:text-3xl">
              {problem.question}
            </h1>

            {problem.questionImage ? (
              <img
                src={problem.questionImage}
                alt={problem.question}
                className="mx-auto mt-6 max-h-[320px] w-full max-w-xl rounded-3xl border-2 border-gray-200 object-cover shadow-sm"
              />
            ) : null}

            {problem.sampleAnswer ? (
              <div className="mt-6 rounded-2xl bg-green-100 p-5">
                <div className="font-bold text-green-700">Sample Presentation Answer</div>
                <div className="mt-2 whitespace-pre-line text-lg leading-8 text-gray-800">
                  {problem.sampleAnswer}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl bg-gray-100 p-5 text-gray-600">
                Chưa có bài mẫu cho chủ đề này.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="border-gray-200 sm:border-t-2 sm:p-10">
        <div className="mx-auto flex max-w-5xl justify-end">
          <button
            onClick={onFinish}
            className="w-full rounded-2xl border-b-4 border-green-600 bg-green-500 p-3 font-bold uppercase text-white transition hover:brightness-105 sm:min-w-[150px] sm:max-w-fit"
          >
            Continue
          </button>
        </div>
      </section>

      <QuitMessage
        quitMessageShown={quitMessageShown}
        setQuitMessageShown={setQuitMessageShown}
      />
    </div>
  );
};

const ProblemWritingTask = ({
  problem,
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  quitMessageShown,
  setQuitMessageShown,
  onFinish,
  hearts,
}: {
  problem: Extract<LessonProblem, { type: "WRITING_TASK" }>;
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  onFinish: () => void;
  hearts: number | null;
}) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const typeLabel =
    problem.writingType === "REPORT"
      ? "Report Coach"
      : problem.writingType === "NARRATIVE"
        ? "Story Coach"
        : "Essay Coach";

  const askWritingAI = async (mode: "hint" | "check") => {
    try {
      setLoadingAI(true);
      setAiFeedback("");

      const res = await fetch(`http://localhost:5000/api/writing-ai/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          writingType: problem.writingType,
          prompt: problem.question,
          answer: userAnswer,
          sampleAnswer: problem.sampleAnswer || "",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAiFeedback(data.message || "AI cannot help with this writing task right now.");
        return;
      }

      setAiFeedback(data.feedback || "AI has no feedback yet.");
    } catch (error) {
      setAiFeedback("Cannot connect to Writing AI.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-5 px-4 py-5 sm:px-0 sm:py-0">
      <div className="flex grow flex-col items-center gap-5">
        <div className="w-full max-w-5xl sm:mt-8 sm:px-5">
          <ProgressBar
            correctAnswerCount={correctAnswerCount}
            totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
            setQuitMessageShown={setQuitMessageShown}
            hearts={hearts}
          />
        </div>

        <section className="flex w-full max-w-4xl grow flex-col justify-center gap-5 sm:px-5">
          <div className="rounded-3xl border-2 border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-4 w-fit rounded-full bg-indigo-100 px-5 py-2 text-sm font-black uppercase tracking-wide text-indigo-700">
              {typeLabel}
            </div>

            <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
              {problem.question}
            </h1>

            {problem.questionImage ? (
              <img
                src={problem.questionImage}
                alt={problem.question}
                className="mt-5 max-h-[280px] w-full rounded-2xl border-2 border-gray-200 object-cover shadow-sm"
              />
            ) : null}

            <div className="mt-5 grid gap-3 rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-900 sm:grid-cols-3">
              <div>
                <div className="font-bold">1. Plan</div>
                <p className="mt-1">Write 2-3 ideas before you start.</p>
              </div>
              <div>
                <div className="font-bold">2. Draft</div>
                <p className="mt-1">Use short, clear English sentences.</p>
              </div>
              <div>
                <div className="font-bold">3. Improve</div>
                <p className="mt-1">Ask AI to correct and rewrite naturally.</p>
              </div>
            </div>

            <textarea
              value={userAnswer}
              onChange={(event) => setUserAnswer(event.target.value)}
              placeholder="Write your answer here..."
              className="mt-6 h-48 w-full rounded-2xl border-2 border-gray-200 p-4 text-lg leading-8 outline-none focus:border-blue-400"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => askWritingAI("hint")}
                disabled={loadingAI}
                className="rounded-2xl border-b-4 border-purple-700 bg-purple-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
              >
                {loadingAI ? "AI is thinking..." : "AI Writing Hint"}
              </button>

              <button
                type="button"
                onClick={() => askWritingAI("check")}
                disabled={loadingAI || !userAnswer.trim()}
                className="rounded-2xl border-b-4 border-blue-600 bg-blue-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
              >
                AI Check Writing
              </button>

              <button
                type="button"
                onClick={onFinish}
                className="ml-auto rounded-2xl border-b-4 border-green-600 bg-green-500 px-6 py-3 font-bold uppercase text-white transition hover:brightness-110"
              >
                Continue
              </button>
            </div>

            {aiFeedback ? (
              <div className="mt-5 rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-purple-700">
                <div className="font-bold">AI Writing Coach</div>
                <div className="mt-2 whitespace-pre-line text-sm leading-6">
                  {aiFeedback}
                </div>
              </div>
            ) : null}

            {problem.sampleAnswer ? (
              <details className="mt-5 rounded-2xl bg-green-100 p-4">
                <summary className="cursor-pointer font-bold text-green-700">
                  Sample Answer
                </summary>
                <div className="mt-3 whitespace-pre-line text-gray-800">
                  {problem.sampleAnswer}
                </div>
              </details>
            ) : null}
          </div>
        </section>
      </div>

      <QuitMessage
        quitMessageShown={quitMessageShown}
        setQuitMessageShown={setQuitMessageShown}
      />
    </div>
  );
};

const LessonComplete = ({
  correctAnswerCount,
  incorrectAnswerCount,
  startTime,
  endTime,
  reviewLessonShown,
  setReviewLessonShown,
  questionResults,
}: {
  correctAnswerCount: number;
  incorrectAnswerCount: number;
  startTime: React.MutableRefObject<number>;
  endTime: React.MutableRefObject<number>;
  reviewLessonShown: boolean;
  setReviewLessonShown: React.Dispatch<React.SetStateAction<boolean>>;
  questionResults: QuestionResult[];
}) => {
  const XP_PER_CORRECT_ANSWER = 5;
  const router = useRouter();
  const lessonId =
    typeof router.query.lessonId === "string" ? router.query.lessonId : null;
  const isPractice = "practice" in router.query;
  const totalXpEarned = correctAnswerCount * XP_PER_CORRECT_ANSWER;

  const increaseXp = useBoundStore((x) => x.increaseXp);
  const addToday = useBoundStore((x) => x.addToday);
  const increaseLingots = useBoundStore((x) => x.increaseLingots);
  const increaseLessonsCompleted = useBoundStore(
    (x) => x.increaseLessonsCompleted,
  );

  const persistProgress = async () => {
    if (isPractice || !lessonId) return;

    const totalQuestions = correctAnswerCount + incorrectAnswerCount;
    if (totalQuestions <= 0) return;

    const score = Math.round((correctAnswerCount / totalQuestions) * 100);
    const timeSpent = Math.max(
      0,
      Math.round((endTime.current - startTime.current) / 1000),
    );

    try {
      await lessonAPI.saveProgress({
        lessonId,
        completed: true,
        score,
        totalQuestions,
        correctAnswers: correctAnswerCount,
        incorrectAnswers: incorrectAnswerCount,
        timeSpent,
      });
    } catch (error) {
      console.error("Failed to save lesson progress:", error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-5 px-4 py-5 sm:px-0 sm:py-0">
      <div className="flex grow flex-col items-center justify-center gap-8 font-bold">
        <h1 className="text-center text-3xl text-yellow-400">
          Lesson Complete!
        </h1>
        <div className="flex flex-wrap justify-center gap-5">
          <div className="min-w-[110px] rounded-xl border-2 border-yellow-400 bg-yellow-400">
            <h2 className="py-1 text-center text-white">Total XP</h2>
            <div className="flex justify-center rounded-xl bg-white py-4 text-yellow-400">
              {totalXpEarned}
            </div>
          </div>
          <div className="min-w-[110px] rounded-xl border-2 border-blue-400 bg-blue-400">
            <h2 className="py-1 text-center text-white">Committed</h2>
            <div className="flex justify-center rounded-xl bg-white py-4 text-blue-400">
              {formatTime(endTime.current - startTime.current)}
            </div>
          </div>
          <div className="min-w-[110px] rounded-xl border-2 border-green-400 bg-green-400">
            <h2 className="py-1 text-center text-white">Amazing</h2>
            <div className="flex justify-center rounded-xl bg-white py-4 text-green-400">
              {Math.round(
                (correctAnswerCount /
                  (correctAnswerCount + incorrectAnswerCount)) *
                  100,
              )}
              %
            </div>
          </div>
        </div>
      </div>
      <section className="border-gray-200 sm:border-t-2 sm:p-10">
        <div className="mx-auto flex max-w-5xl sm:justify-between">
          <button
            className="hidden rounded-2xl border-2 border-b-4 border-gray-200 bg-white p-3 font-bold uppercase text-gray-400 transition hover:border-gray-300 hover:bg-gray-200 sm:block sm:min-w-[150px] sm:max-w-fit"
            onClick={() => setReviewLessonShown(true)}
          >
            Review lesson
          </button>
          <Link
            className={
              "flex w-full items-center justify-center rounded-2xl border-b-4 border-green-600 bg-green-500 p-3 font-bold uppercase text-white transition hover:brightness-105 sm:min-w-[150px] sm:max-w-fit"
            }
            href="/learn"
            onClick={() => {
              increaseXp(totalXpEarned);
              addToday();
              increaseLingots(isPractice ? 0 : 1);
              if (!isPractice) {
                increaseLessonsCompleted();
              }
              void persistProgress();
            }}
          >
            Continue
          </Link>
        </div>
      </section>
      <ReviewLesson
        reviewLessonShown={reviewLessonShown}
        setReviewLessonShown={setReviewLessonShown}
        questionResults={questionResults}
      />
    </div>
  );
};

const LessonEndNeedsEightyPercent = ({
  correctAnswerCount,
  requiredCorrectAnswersToPass,
  totalQuestions,
}: {
  correctAnswerCount: number;
  requiredCorrectAnswersToPass: number;
  totalQuestions: number;
}) => {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="max-w-md rounded-3xl border-2 border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">
          Need 80% to continue
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          You got {correctAnswerCount}/{totalQuestions} correct. Reach at least{" "}
          {requiredCorrectAnswersToPass}/{totalQuestions} to unlock the next
          section.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            className="inline-flex items-center justify-center rounded-2xl border-b-4 border-green-600 bg-green-500 px-5 py-3 text-sm font-bold uppercase text-white transition hover:brightness-110"
            onClick={() => void router.replace(router.asPath)}
          >
            Retry lesson
          </button>
          <Link
            href="/learn"
            className="inline-flex items-center justify-center rounded-2xl border-b-4 border-gray-300 bg-gray-200 px-5 py-3 text-sm font-bold uppercase text-gray-700 transition hover:brightness-95"
          >
            Back to learn
          </Link>
        </div>
      </div>
    </div>
  );
};

type QuestionResult = {
  question: string;
  yourResponse: string;
  correctResponse: string;
};

const ReviewLesson = ({
  reviewLessonShown,
  setReviewLessonShown,
  questionResults,
}: {
  reviewLessonShown: boolean;
  setReviewLessonShown: React.Dispatch<React.SetStateAction<boolean>>;
  questionResults: QuestionResult[];
}) => {
  const [selectedQuestionResult, setSelectedQuestionResult] =
    useState<null | QuestionResult>(null);
  return (
    <div
      className={[
        "fixed inset-0 flex items-center justify-center p-5 transition duration-300",
        reviewLessonShown ? "" : "pointer-events-none opacity-0",
      ].join(" ")}
    >
      <div
        className={[
          "absolute inset-0 bg-black",
          reviewLessonShown ? "opacity-75" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={() => setReviewLessonShown(false)}
      ></div>
      <div className="relative flex w-full max-w-4xl flex-col gap-5 rounded-2xl border-2 border-gray-200 bg-white p-8">
        <button
          className="absolute -right-5 -top-5 rounded-full border-2 border-gray-200 bg-gray-100 p-1 text-gray-400 hover:brightness-90"
          onClick={() => setReviewLessonShown(false)}
        >
          <BigCloseSvg className="h-8 w-8" />
          <span className="sr-only">Close</span>
        </button>
        <h2 className="text-center text-3xl">Check out your scorecard!</h2>
        <p className="text-center text-xl text-gray-400">
          Click the tiles below to reveal the solutions
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {questionResults.map((questionResult, i) => {
            return (
              <button
                key={i}
                className={[
                  "relative flex flex-col items-stretch gap-3 rounded-xl p-5 text-left",
                  questionResult.yourResponse === questionResult.correctResponse
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-red-100 text-red-500",
                ].join(" ")}
                onClick={() =>
                  setSelectedQuestionResult((selectedQuestionResult) =>
                    selectedQuestionResult === questionResult
                      ? null
                      : questionResult,
                  )
                }
              >
                <div className="flex justify-between gap-2">
                  <h3 className="font-bold">{questionResult.question}</h3>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
                    {questionResult.yourResponse ===
                    questionResult.correctResponse ? (
                      <DoneSvg className="h-5 w-5" />
                    ) : (
                      <BigCloseSvg className="h-5 w-5" />
                    )}
                  </div>
                </div>
                <div>{questionResult.yourResponse}</div>
                {selectedQuestionResult === questionResult && (
                  <div className="absolute left-1 right-1 top-20 z-10 rounded-2xl border-2 border-gray-200 bg-white p-3 text-sm tracking-tighter">
                    <div
                      className="absolute -top-2 h-3 w-3 rotate-45 border-l-2 border-t-2 border-gray-200 bg-white"
                      style={{ left: "calc(50% - 6px)" }}
                    ></div>
                    <div className="font-bold uppercase text-gray-400">
                      Your response:
                    </div>
                    <div className="mb-3 text-gray-700">
                      {questionResult.yourResponse}
                    </div>
                    <div className="font-bold uppercase text-gray-400">
                      Correct response:
                    </div>
                    <div className="text-gray-700">
                      {questionResult.correctResponse}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ProblemSummaryBuild = ({
  problem,
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  selectedAnswers,
  setSelectedAnswers,
  quitMessageShown,
  correctAnswerShown,
  setQuitMessageShown,
  isAnswerCorrect,
  onCheckAnswer,
  onFinish,
  onSkip,
  hearts,
}: {
  problem: Extract<LessonProblem, { type: "SUMMARY_BUILD" }>;
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  selectedAnswers: number[];
  setSelectedAnswers: React.Dispatch<React.SetStateAction<number[]>>;
  correctAnswerShown: boolean;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  isAnswerCorrect: boolean;
  onCheckAnswer: () => void;
  onFinish: () => void;
  onSkip: () => void;
  hearts: number | null;
}) => {
  const { question, questionImage, correctAnswer, answerTiles } = problem;
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const selectedWords = selectedAnswers.map((index) => answerTiles[index]);

  const askSummaryAI = async () => {
    try {
      setLoadingAI(true);
      setAiFeedback("");

      const res = await fetch("http://localhost:5000/api/summary-completion-ai/hint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summaryText: question,
          choices: answerTiles,
          selectedWords,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAiFeedback(data.message || "AI cannot help with this summary right now.");
        return;
      }

      setAiFeedback(data.feedback || "AI has no hint yet.");
    } catch (error) {
      setAiFeedback("Cannot connect to Summary AI.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-5 px-4 py-5 sm:px-0 sm:py-0">
      <div className="flex grow flex-col items-center gap-5">
        <div className="w-full max-w-5xl sm:mt-8 sm:px-5">
          <ProgressBar
            correctAnswerCount={correctAnswerCount}
            totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
            setQuitMessageShown={setQuitMessageShown}
            hearts={hearts}
          />
        </div>

        <section className="flex w-full max-w-4xl grow flex-col justify-center gap-5 sm:px-5">
          <div className="rounded-3xl border-2 border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-4 w-fit rounded-full bg-emerald-100 px-5 py-2 text-sm font-black uppercase tracking-wide text-emerald-700">
              Summary Builder
            </div>

            <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
              Complete the summary
            </h1>

            {questionImage ? (
              <img
                src={questionImage}
                alt="Summary visual"
                className="mt-5 max-h-[280px] w-full rounded-2xl border-2 border-gray-200 object-cover shadow-sm"
              />
            ) : null}

            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-lg leading-8 text-gray-800">
              {question}
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 sm:grid-cols-3">
              <div>
                <div className="font-bold">1. Understand meaning</div>
                <p className="mt-1">Read the full sentence first.</p>
              </div>
              <div>
                <div className="font-bold">2. Check grammar</div>
                <p className="mt-1">Look before and after the blank.</p>
              </div>
              <div>
                <div className="font-bold">3. Choose the word</div>
                <p className="mt-1">Pick the word that completes the idea.</p>
              </div>
            </div>

            <div className="mt-6 min-h-[64px] rounded-2xl border-2 border-gray-200 bg-white p-4">
              {selectedAnswers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedAnswers.map((index) => (
                    <button
                      key={`selected-summary-${index}`}
                      type="button"
                      disabled={correctAnswerShown}
                      onClick={() =>
                        setSelectedAnswers((current) =>
                          current.filter((value) => value !== index),
                        )
                      }
                      className="rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-2 font-bold text-blue-700"
                    >
                      {answerTiles[index]}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400">Choose word(s) below...</div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {answerTiles.map((tile, index) => (
                <button
                  key={`${tile}-${index}`}
                  type="button"
                  disabled={correctAnswerShown || selectedAnswers.includes(index)}
                  onClick={() =>
                    setSelectedAnswers((current) =>
                      current.includes(index) ? current : [...current, index],
                    )
                  }
                  className="rounded-xl border-2 border-b-4 border-gray-200 px-4 py-2 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  {tile}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={askSummaryAI}
                disabled={loadingAI}
                className="rounded-2xl border-b-4 border-purple-700 bg-purple-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
              >
                {loadingAI ? "AI is thinking..." : "AI Summary Hint"}
              </button>
            </div>

            {aiFeedback ? (
              <div className="mt-5 rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-purple-700">
                <div className="font-bold">AI Summary Coach</div>
                <div className="mt-2 whitespace-pre-line text-sm leading-6">
                  {aiFeedback}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <CheckAnswer
        correctAnswer={correctAnswer.map((index) => answerTiles[index] ?? "").join(" ")}
        correctAnswerShown={correctAnswerShown}
        isAnswerCorrect={isAnswerCorrect}
        isAnswerSelected={selectedAnswers.length > 0}
        onCheckAnswer={onCheckAnswer}
        onFinish={onFinish}
        onSkip={onSkip}
      />

      <QuitMessage
        quitMessageShown={quitMessageShown}
        setQuitMessageShown={setQuitMessageShown}
      />
    </div>
  );
};

const ProblemGrammarIntro = ({
  problem,
  correctAnswerCount,
  totalCorrectAnswersNeeded,
  quitMessageShown,
  setQuitMessageShown,
  onFinish,
  hearts,
}: {
  problem: Extract<LessonProblem, { type: "GRAMMAR_INTRO" }>;
  correctAnswerCount: number;
  totalCorrectAnswersNeeded: number;
  quitMessageShown: boolean;
  setQuitMessageShown: React.Dispatch<React.SetStateAction<boolean>>;
  onFinish: () => void;
  hearts: number | null;
}) => {
  const [userSentence, setUserSentence] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const callGrammarAI = async (mode: "explain" | "check") => {
    try {
      setLoadingAI(true);
      setAiFeedback("");

      const res = await fetch(`http://localhost:5000/api/grammar-ai/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grammarTitle: problem.question,
          example: problem.example || problem.content || "",
          userSentence,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAiFeedback(data.message || "AI chưa thể hỗ trợ phần ngữ pháp này.");
        return;
      }

      setAiFeedback(data.feedback || "AI chưa có phản hồi.");
    } catch (error) {
      setAiFeedback("Không thể kết nối AI Grammar. Kiểm tra backend port 5000.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-5 px-4 py-5 sm:px-0 sm:py-0">
      <div className="flex grow flex-col items-center gap-5">
        <div className="w-full max-w-5xl sm:mt-8 sm:px-5">
          <ProgressBar
            correctAnswerCount={correctAnswerCount}
            totalCorrectAnswersNeeded={totalCorrectAnswersNeeded}
            setQuitMessageShown={setQuitMessageShown}
            hearts={hearts}
          />
        </div>

        <section className="flex w-full max-w-3xl grow flex-col items-center justify-center gap-6 sm:px-5">
          <div className="rounded-full bg-green-100 px-5 py-2 text-sm font-black uppercase tracking-wide text-green-600">
            Grammar Focus
          </div>

          <div className="w-full rounded-3xl border-2 border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-left">
              <p className="text-sm font-black uppercase tracking-wide text-green-600">
                Grammar Structure
              </p>

              <h1 className="mt-2 text-2xl font-bold text-gray-800 sm:text-3xl">
                {problem.question}
              </h1>

              {problem.content ? (
                <p className="mt-5 whitespace-pre-line text-lg leading-8 text-gray-600">
                  {problem.content}
                </p>
              ) : null}
            </div>

            {problem.questionImage ? (
              <img
                src={problem.questionImage}
                alt={problem.question}
                className="mt-6 max-h-[350px] w-full rounded-3xl border-2 border-gray-200 object-cover shadow-sm"
              />
            ) : null}

            {problem.example ? (
              <div className="mt-6 rounded-2xl bg-green-100 p-5 text-center">
                <p className="text-sm font-black uppercase tracking-wide text-green-700">
                  Example
                </p>

                <p className="mt-2 whitespace-pre-line text-2xl font-bold text-gray-900">
                  {problem.example}
                </p>
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border-2 border-blue-100 bg-blue-50 p-5">
              <div className="font-bold text-blue-700">
                Try your own sentence
              </div>

              <textarea
                value={userSentence}
                onChange={(e) => setUserSentence(e.target.value)}
                placeholder="Example: I am a student."
                className="mt-3 h-28 w-full rounded-2xl border-2 border-gray-200 bg-white p-4 text-lg outline-none focus:border-blue-400"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => callGrammarAI("explain")}
                  disabled={loadingAI}
                  className="rounded-2xl border-b-4 border-purple-700 bg-purple-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
                >
                  {loadingAI ? "AI is thinking..." : "🤖 AI Explain"}
                </button>

                <button
                  type="button"
                  onClick={() => callGrammarAI("check")}
                  disabled={loadingAI || !userSentence.trim()}
                  className="rounded-2xl border-b-4 border-blue-700 bg-blue-500 px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:bg-gray-400"
                >
                  ✅ AI Check Grammar
                </button>
              </div>
            </div>

            {aiFeedback ? (
              <div className="mt-5 rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-purple-700">
                <div className="font-bold">AI Grammar Feedback:</div>

                <div className="mt-2 whitespace-pre-line text-sm leading-6">
                  {aiFeedback}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="border-gray-200 sm:border-t-2 sm:p-10">
        <div className="mx-auto flex max-w-5xl justify-end">
          <button
            onClick={onFinish}
            className="w-full rounded-2xl border-b-4 border-green-600 bg-green-500 p-3 font-bold uppercase text-white transition hover:brightness-105 sm:min-w-[150px] sm:max-w-fit"
          >
            Continue
          </button>
        </div>
      </section>

      <QuitMessage
        quitMessageShown={quitMessageShown}
        setQuitMessageShown={setQuitMessageShown}
      />
    </div>
  );
};

const LessonFastForwardStart = ({
  unitNumber,
  setIsStartingLesson,
}: {
  unitNumber: number;
  setIsStartingLesson: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <div className="flex min-h-screen flex-col px-5 py-8 text-center">
      <div className="flex grow flex-col items-center justify-center gap-5">
        <LessonFastForwardStartSvg />
        <h1 className="text-lg font-bold">
          Want to jump to Unit {unitNumber}?
        </h1>
        <p className="text-sm text-gray-400">
          {`Pass the test to jump ahead. We won't make it easy for you though.`}
        </p>
      </div>
      <div className="flex flex-col gap-5"></div>
      <section className="border-gray-200 sm:border-t-2 sm:p-10">
        <div className="mx-auto flex max-w-5xl flex-col-reverse items-center gap-5 sm:flex-row sm:justify-between">
          <Link
            href="/learn"
            className="font-bold uppercase text-blue-400 transition hover:brightness-110"
          >
            Maybe later
          </Link>
          <button
            className="w-full rounded-2xl border-b-4 border-blue-500 bg-blue-400 p-3 font-bold uppercase text-white transition hover:brightness-110 sm:min-w-[150px] sm:max-w-fit"
            onClick={() => setIsStartingLesson(false)}
          >
            {`Let's go`}
          </button>
        </div>
      </section>
    </div>
  );
};

const LessonFastForwardEndFail = ({
  unitNumber,
  reviewLessonShown,
  setReviewLessonShown,
  questionResults,
}: {
  unitNumber: number;
  reviewLessonShown: boolean;
  setReviewLessonShown: React.Dispatch<React.SetStateAction<boolean>>;
  questionResults: QuestionResult[];
}) => {
  return (
    <div className="flex min-h-screen flex-col px-5 py-8 text-center">
      <div className="flex grow flex-col items-center justify-center gap-5">
        <LessonFastForwardEndFailSvg />
        <h1 className="text-2xl font-bold">
          {`You didn't unlock Unit ${unitNumber}`}
        </h1>
        <p className="text-lg text-gray-500">
          {`Don't worry! Practice makes perfect.`}
        </p>
      </div>
      <section className="border-gray-200 sm:border-t-2 sm:p-10">
        <div className="mx-auto flex max-w-5xl sm:justify-between">
          <button
            className="hidden rounded-2xl border-2 border-b-4 border-gray-200 bg-white p-3 font-bold uppercase text-gray-400 transition hover:border-gray-300 hover:bg-gray-200 sm:block sm:min-w-[150px] sm:max-w-fit"
            onClick={() => setReviewLessonShown(true)}
          >
            Review lesson
          </button>
          <Link
            className="flex w-full items-center justify-center rounded-2xl border-b-4 border-green-600 bg-green-500 p-3 font-bold uppercase text-white transition hover:brightness-105 sm:min-w-[150px] sm:max-w-fit"
            href="/learn"
          >
            Continue
          </Link>
        </div>
      </section>
      <ReviewLesson
        reviewLessonShown={reviewLessonShown}
        setReviewLessonShown={setReviewLessonShown}
        questionResults={questionResults}
      />
    </div>
  );
};

const LessonFastForwardEndPass = ({
  unitNumber,
  reviewLessonShown,
  setReviewLessonShown,
  questionResults,
}: {
  unitNumber: number;
  reviewLessonShown: boolean;
  setReviewLessonShown: React.Dispatch<React.SetStateAction<boolean>>;
  questionResults: QuestionResult[];
}) => {
  const jumpToUnit = useBoundStore((x) => x.jumpToUnit);
  return (
    <div className="flex min-h-screen flex-col px-5 py-8 text-center">
      <div className="flex grow flex-col items-center justify-center gap-5">
        <LessonFastForwardEndPassSvg />
        <h1 className="text-2xl font-bold">You unlocked Unit {unitNumber}!</h1>
        <p className="text-lg text-gray-500">
          Way to go! You’re making great strides!
        </p>
      </div>
      <section className="border-gray-200 sm:border-t-2 sm:p-10">
        <div className="mx-auto flex max-w-5xl sm:justify-between">
          <button
            className="hidden rounded-2xl border-2 border-b-4 border-gray-200 bg-white p-3 font-bold uppercase text-gray-400 transition hover:border-gray-300 hover:bg-gray-200 sm:block sm:min-w-[150px] sm:max-w-fit"
            onClick={() => setReviewLessonShown(true)}
          >
            Review lesson
          </button>
          <Link
            className="flex w-full items-center justify-center rounded-2xl border-b-4 border-green-600 bg-green-500 p-3 font-bold uppercase text-white transition hover:brightness-105 sm:min-w-[150px] sm:max-w-fit"
            href="/learn"
            onClick={() => jumpToUnit(unitNumber)}
          >
            Continue
          </Link>
        </div>
      </section>
      <ReviewLesson
        reviewLessonShown={reviewLessonShown}
        setReviewLessonShown={setReviewLessonShown}
        questionResults={questionResults}
      />
    </div>
  );
};
