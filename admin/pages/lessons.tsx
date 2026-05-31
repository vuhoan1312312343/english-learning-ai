import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import AdminShell from "../components/AdminShell";
import {
  QUESTION_TYPE_OPTIONS_BY_SECTION,
  isSelectType,
  parseSectionFromLessonTitle,
} from "../lib/admin-config";
import { adminApi } from "../lib/api";
import {
  LessonItem,
  QuestionItem,
  QuestionType,
  UnitItem,
} from "../lib/admin-types";

type OptionDraft = {
  name: string;
  icon: string;
};

export default function LessonsPage() {
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);

  const [selectedUnitNumber, setSelectedUnitNumber] = useState<number | null>(
    null,
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const [newQuestionType, setNewQuestionType] =
    useState<QuestionType>("SELECT_1_OF_3");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionImage, setNewQuestionImage] = useState("");
  const [newQuestionAnswerTiles, setNewQuestionAnswerTiles] = useState("");
  const [newQuestionCorrect, setNewQuestionCorrect] = useState("");
  const [newOptionDrafts, setNewOptionDrafts] = useState<OptionDraft[]>([
    { name: "", icon: "" },
    { name: "", icon: "" },
    { name: "", icon: "" },
  ]);

  const [message, setMessage] = useState<string | null>(null);

  
  
  

  const [error, setError] = useState<string | null>(null);
  const [questionViewMode, setQuestionViewMode] = useState<
    "create" | "detail" | "edit"
  >("create");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null,
  );
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canLessonScrollLeft, setCanLessonScrollLeft] = useState(false);
  const [canLessonScrollRight, setCanLessonScrollRight] = useState(false);
  const [isGeneratingFlashcard, setIsGeneratingFlashcard] = useState(false);
  const [isGeneratingHeadingMatch, setIsGeneratingHeadingMatch] = useState(false);
  const [isGeneratingSummaryCompletion, setIsGeneratingSummaryCompletion] = useState(false);

  const tileOnlyTypes: QuestionType[] = [
    "DESCRIBE_PICTURE",
    "DISCUSSION",
    "PRESENTATION",
    "ESSAY",
    "REPORT",
    "NARRATIVE",
    "GRAMMAR_INTRO",
  ];

  const isTileOnlyType = (type: QuestionType) => tileOnlyTypes.includes(type);

  const isSampleAnswerQuestionType = (type: QuestionType) =>
    type === "INTERVIEW" ||
    type === "DISCUSSION" ||
    type === "PRESENTATION" ||
    type === "DESCRIBE_PICTURE" ||
    type === "ESSAY" ||
    type === "REPORT" ||
    type === "NARRATIVE";

  const formatSampleAnswer = (answerTiles?: string[]) =>
    (answerTiles ?? []).join("\n").trim();

  const questionTypeLabels: Partial<Record<QuestionType, string>> = {
    INTERVIEW: "INTERVIEW (Bài học phỏng vấn)",
    DESCRIBE_PICTURE: "DESCRIBE_PICTURE (Mô tả tranh ảnh)",
    DISCUSSION: "DISCUSSION (Bài học thảo luận)",
    PRESENTATION: "PRESENTATION (Thuyết trình)",
    FLASHCARD: "FLASHCARD (Học ảnh / Thẻ ghi nhớ)",
    GRAMMAR_INTRO: "GRAMMAR_INTRO (Bài học ngữ pháp)",
    READING_MCQ: "READING_MCQ (Đọc hiểu trắc nghiệm)",
    TRUE_FALSE: "TRUE_FALSE (Đúng / Sai)",
    MATCHING_HEADING: "HEADING_MATCH (Ghép tiêu đề)",
    SUMMARY_COMPLETION: "SUMMARY_BUILDER (Hoàn thành tóm tắt)",
    ESSAY: "ESSAY (Bài luận)",
    REPORT: "REPORT (Báo cáo)",
    NARRATIVE: "NARRATIVE (Kể chuyện)",
  };

  const getQuestionTypeLabel = (type: QuestionType) =>
    questionTypeLabels[type] ?? type;

  const unitsStripRef = useRef<HTMLDivElement | null>(null);
  const lessonsStripRef = useRef<HTMLDivElement | null>(null);

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => lesson._id === selectedLessonId) ?? null,
    [lessons, selectedLessonId],
  );

  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => a.unitNumber - b.unitNumber),
    [units],
  );

  const sortedLessons = useMemo(
    () => [...lessons].sort((a, b) => a.lessonNumber - b.lessonNumber),
    [lessons],
  );

  const selectedQuestion = useMemo(
    () =>
      questions.find((question) => question._id === selectedQuestionId) ?? null,
    [questions, selectedQuestionId],
  );

  const selectedLessonSection = useMemo(
    () =>
      selectedLesson ? parseSectionFromLessonTitle(selectedLesson.title) : null,
    [selectedLesson],
  );

  const getLessonCircleText = (lesson: LessonItem) => {
    const section = parseSectionFromLessonTitle(lesson.title);
    if (section && section !== "unit-review") {
      return section
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    const parts = lesson.title.split("-");
    const fallback = parts[parts.length - 1]?.trim();
    return fallback || `Lesson ${lesson.lessonNumber}`;
  };

  const loadUnits = async () => {
    const response = await adminApi.get("/api/admin/units");
    setUnits(response.data.units ?? []);
  };

  const loadLessons = async (unitNumber: number) => {
    const response = await adminApi.get(
      `/api/admin/units/${unitNumber}/lessons`,
    );
    const nextLessons = (response.data.lessons ?? []) as LessonItem[];
    setLessons(nextLessons);
    if (!nextLessons.find((lesson) => lesson._id === selectedLessonId)) {
      setSelectedLessonId(nextLessons[0]?._id ?? null);
    }
  };

  const loadQuestions = async (lessonId: string) => {
    const response = await adminApi.get(
      `/api/admin/lessons/${lessonId}/questions`,
    );
    setQuestions(response.data.questions ?? []);
  };

  const isImageUrl = (value: string | undefined | null) => {
    if (!value) return false;
    const next = value.trim();
    return (
      /^data:image\//i.test(next) ||
      /^https?:\/\/.+\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(next)
    );
  };

  const updateUnitScrollState = () => {
    const el = unitsStripRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const threshold = 4;
    setCanScrollLeft(el.scrollLeft > threshold);
    setCanScrollRight(
      el.scrollLeft + el.clientWidth < el.scrollWidth - threshold,
    );
  };

  const scrollUnits = (direction: "left" | "right") => {
    const el = unitsStripRef.current;
    if (!el) return;

    el.scrollBy({
      left: direction === "left" ? -240 : 240,
      behavior: "smooth",
    });

    window.setTimeout(updateUnitScrollState, 180);
  };

  const updateLessonScrollState = () => {
    const el = lessonsStripRef.current;
    if (!el) {
      setCanLessonScrollLeft(false);
      setCanLessonScrollRight(false);
      return;
    }

    const threshold = 4;
    setCanLessonScrollLeft(el.scrollLeft > threshold);
    setCanLessonScrollRight(
      el.scrollLeft + el.clientWidth < el.scrollWidth - threshold,
    );
  };

  const scrollLessons = (direction: "left" | "right") => {
    const el = lessonsStripRef.current;
    if (!el) return;

    el.scrollBy({
      left: direction === "left" ? -240 : 240,
      behavior: "smooth",
    });

    window.setTimeout(updateLessonScrollState, 180);
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Cannot read file"));
      };
      reader.onerror = () => reject(new Error("Cannot read file"));
      reader.readAsDataURL(file);
    });

  const compressImageToDataUrl = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      return readFileAsDataUrl(file);
    }

    const sourceDataUrl = await readFileAsDataUrl(file);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Invalid image"));
      img.src = sourceDataUrl;
    });

    const maxSide = 720;
    const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      return sourceDataUrl;
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.78);
  };

  const handleOptionImageUpload = async (index: number, file?: File) => {
    if (!file) return;

    try {
      const dataUrl = await compressImageToDataUrl(file);
      if (!dataUrl) return;
      if (dataUrl.length > 1_900_000) {
        setError("Anh qua lon. Hay chon anh nho hon (duoi 2MB sau nen).");
        return;
      }

      setError(null);
      setNewOptionDrafts((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], icon: dataUrl };
        return next;
      });
    } catch {
      setError("Khong the tai anh len. Thu lai voi anh khac.");
    }
  };

  const handleQuestionImageUpload = async (file?: File) => {
    if (!file) return;

    try {
      const dataUrl = await compressImageToDataUrl(file);
      if (!dataUrl) return;
      if (dataUrl.length > 1_900_000) {
        setError("Anh qua lon. Hay chon anh nho hon (duoi 2MB sau nen).");
        return;
      }

      setError(null);
      setNewQuestionImage(dataUrl);
    } catch {
      setError("Khong the tai anh cau hoi len. Thu lai voi anh khac.");
    }
  };

  useEffect(() => {
    void loadUnits();
  }, []);

  useEffect(() => {
    if (!selectedUnitNumber) {
      setLessons([]);
      setSelectedLessonId(null);
      return;
    }
    void loadLessons(selectedUnitNumber);
  }, [selectedUnitNumber]);

  useEffect(() => {
    if (!selectedLessonId) {
      setQuestions([]);
      setSelectedQuestionId(null);
      setQuestionViewMode("create");
      return;
    }
    void loadQuestions(selectedLessonId);
  }, [selectedLessonId]);

  useEffect(() => {
    if (!questions.length) {
      setSelectedQuestionId(null);
      return;
    }

    const exists = selectedQuestionId
      ? questions.some((question) => question._id === selectedQuestionId)
      : false;
    if (!exists) {
      setSelectedQuestionId(questions[0]._id);
    }
  }, [questions, selectedQuestionId]);

  useEffect(() => {
    if (!selectedLessonSection || selectedLessonSection === "unit-review") {
      return;
    }

    const options = QUESTION_TYPE_OPTIONS_BY_SECTION[selectedLessonSection];
    if (!options.includes(newQuestionType)) {
      setNewQuestionType(options[0]);
    }
  }, [selectedLessonSection, newQuestionType]);

  useEffect(() => {
    updateUnitScrollState();

    const onResize = () => updateUnitScrollState();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [sortedUnits.length]);

  useEffect(() => {
    updateLessonScrollState();

    const onResize = () => updateLessonScrollState();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [sortedLessons.length]);

  const getAnswerTilesForPayload = () => {
    if (isSampleAnswerQuestionType(newQuestionType)) {
      return [newQuestionAnswerTiles.trim()].filter(Boolean);
    }

    if (isTileOnlyType(newQuestionType)) {
      return [newQuestionAnswerTiles.trim()].filter(Boolean);
    }

    return newQuestionAnswerTiles
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  };

  const generateFlashcardWithAI = async () => {
    setError(null);
    setMessage(null);

    const prompt = [
      newQuestionText.trim(),
      newOptionDrafts.map((option) => option.name.trim()).filter(Boolean).join(", "),
    ]
      .filter(Boolean)
      .join("\nOptions: ");

    if (!prompt) {
      setError("Hãy nhập một từ, chủ đề hoặc câu hỏi nháp trước khi dùng AI.");
      return;
    }

    try {
      setIsGeneratingFlashcard(true);

      const response = await adminApi.post("/api/admin/flashcard-ai/generate", {
        prompt,
        level: "A1",
      });

      const data = response.data?.data;

      if (
        !data?.question ||
        !Array.isArray(data.answers) ||
        data.answers.length !== 3 ||
        typeof data.correctAnswer !== "number"
      ) {
        setError("AI returned invalid flashcard data.");
        return;
      }

      setNewQuestionText(data.question);
      setNewOptionDrafts(
        data.answers.map((answer: string) => ({
          name: answer,
          icon: "",
        })),
      );
      setNewQuestionCorrect(String(data.correctAnswer));

      const notes = [data.explanation, data.example].filter(Boolean).join(" ");
      setMessage(notes ? `AI generated flashcard. ${notes}` : "AI generated flashcard.");
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(message || "AI could not generate the flashcard.");
    } finally {
      setIsGeneratingFlashcard(false);
    }
  };

  const generateHeadingMatchWithAI = async () => {
    setError(null);
    setMessage(null);

    const prompt = [
      newQuestionText.trim(),
      newOptionDrafts.map((option) => option.name.trim()).filter(Boolean).join(", "),
    ]
      .filter(Boolean)
      .join("\nHeadings: ");

    if (!prompt) {
      setError("Hãy nhập chủ đề, đoạn đọc hoặc tiêu đề nháp trước khi dùng AI.");
      return;
    }

    try {
      setIsGeneratingHeadingMatch(true);

      const response = await adminApi.post("/api/admin/matching-heading-ai/generate", {
        prompt,
        level: "A1",
      });

      const data = response.data?.data;

      if (
        !data?.readingText ||
        !Array.isArray(data.headings) ||
        data.headings.length !== 3 ||
        typeof data.correctAnswer !== "number"
      ) {
        setError("AI returned invalid heading match data.");
        return;
      }

      setNewQuestionText(data.readingText);
      setNewOptionDrafts(
        data.headings.map((heading: string) => ({
          name: heading,
          icon: "",
        })),
      );
      setNewQuestionCorrect(String(data.correctAnswer));
      setMessage(
        data.explanation
          ? `AI generated Heading Match. ${data.explanation}`
          : "AI generated Heading Match.",
      );
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(message || "AI could not generate the heading match exercise.");
    } finally {
      setIsGeneratingHeadingMatch(false);
    }
  };

  const generateSummaryCompletionWithAI = async () => {
    setError(null);
    setMessage(null);

    const prompt = [
      newQuestionText.trim(),
      newQuestionAnswerTiles.trim(),
    ]
      .filter(Boolean)
      .join("\nChoices: ");

    if (!prompt) {
      setError("Hãy nhập chủ đề, câu tóm tắt nháp hoặc các lựa chọn từ trước khi dùng AI.");
      return;
    }

    try {
      setIsGeneratingSummaryCompletion(true);

      const response = await adminApi.post("/api/admin/summary-completion-ai/generate", {
        prompt,
        level: "A1",
      });

      const data = response.data?.data;

      if (
        !data?.summaryText ||
        !Array.isArray(data.choices) ||
        data.choices.length !== 4 ||
        typeof data.correctAnswer !== "number"
      ) {
        setError("AI returned invalid summary completion data.");
        return;
      }

      setNewQuestionText(data.summaryText);
      setNewQuestionAnswerTiles(data.choices.join(","));
      setNewQuestionCorrect(String(data.correctAnswer));
      setMessage(
        data.explanation
          ? `AI generated Summary Builder. ${data.explanation}`
          : "AI generated Summary Builder.",
      );
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(message || "AI could not generate the summary completion exercise.");
    } finally {
      setIsGeneratingSummaryCompletion(false);
    }
  };

  const createQuestion = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedLessonId) return;

    setError(null);
    setMessage(null);

    if (!selectedLessonSection || selectedLessonSection === "unit-review") {
      setError("Khong the them cau hoi truc tiep cho Unit review.");
      return;
    }

    const questionTextPayload = newQuestionText.trim();
    const questionImagePayload = newQuestionImage.trim();

    try {
      const commonPayload = {
        type: newQuestionType,
        question: questionTextPayload || " ",
        questionInVietnamese: questionTextPayload || " ",
        questionImage: questionImagePayload || undefined,
        difficulty: "easy",
      };

      if (isSelectType(newQuestionType)) {
        const correctIndex = Number(newQuestionCorrect);
        const optionCount = newQuestionType === "TRUE_FALSE" ? 2 : 3;

        if (
          !Number.isFinite(correctIndex) ||
          correctIndex < 0 ||
          correctIndex > optionCount - 1
        ) {
          setError("Hay tick chon dap an dung ben duoi moi dap an.");
          return;
        }

        const options = newOptionDrafts.slice(0, optionCount).map((option) => ({
          name: option.name.trim() || " ",
          icon: option.icon.trim() || undefined,
        }));

        await adminApi.post(
          `/api/admin/lessons/${selectedLessonId}/questions`,
          {
            ...commonPayload,
            answers: options,
            correctAnswer: correctIndex,
          },
        );
      } else {
        const tiles = getAnswerTilesForPayload();
        const correct =
          isSampleAnswerQuestionType(newQuestionType) ||
          isTileOnlyType(newQuestionType)
            ? []
            : newQuestionCorrect
                .split(",")
                .map((x) => Number(x.trim()))
                .filter((x) => Number.isFinite(x));

        await adminApi.post(
          `/api/admin/lessons/${selectedLessonId}/questions`,
          {
            ...commonPayload,
            answerTiles: tiles,
            correctAnswer: correct,
          },
        );
      }

      setNewQuestionText("");
      setNewQuestionImage("");
      setNewQuestionAnswerTiles("");
      setNewOptionDrafts([
        { name: "", icon: "" },
        { name: "", icon: "" },
        { name: "", icon: "" },
      ]);
      setNewQuestionCorrect("");
      await loadQuestions(selectedLessonId);
      setMessage("Them cau hoi thanh cong.");
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(message || "Them cau hoi that bai.");
    }
  };

  const fillFormFromQuestion = (question: QuestionItem) => {
    setNewQuestionType(question.type);

    const questionValue = (question.question ?? "").trim();
    const canonicalQuestionImage = (
      question.questionImage ||
      question.image ||
      question.mediaUrl ||
      ""
    ).trim();
    const fallbackLegacyImage = isImageUrl(questionValue) ? questionValue : "";

    setNewQuestionImage(canonicalQuestionImage || fallbackLegacyImage);
    setNewQuestionText(isImageUrl(questionValue) ? "" : questionValue);

    if (isSelectType(question.type)) {
      const optionCount = question.type === "TRUE_FALSE" ? 2 : 3;
      const nextOptions = Array.from({ length: 3 }, (_, index) => {
        const source = question.answers?.[index];

        if (question.type === "TRUE_FALSE" && index === 0 && !source) {
          return { name: "True", icon: "" };
        }

        if (question.type === "TRUE_FALSE" && index === 1 && !source) {
          return { name: "False", icon: "" };
        }

        if (index >= optionCount) {
          return { name: "", icon: "" };
        }

        return {
          name: source?.name?.trim() === "" ? "" : (source?.name ?? ""),
          icon: source?.icon ?? "",
        };
      });
      setNewOptionDrafts(nextOptions);

      const nextCorrect = Array.isArray(question.correctAnswer)
        ? question.correctAnswer[0]
        : question.correctAnswer;
      setNewQuestionCorrect(
        nextCorrect !== undefined ? String(nextCorrect) : "",
      );
    } else {
      setNewQuestionAnswerTiles(
        isSampleAnswerQuestionType(question.type)
          ? formatSampleAnswer(question.answerTiles)
          : isTileOnlyType(question.type)
            ? (question.answerTiles ?? []).join(" ")
            : (question.answerTiles ?? []).join(","),
      );
      setNewQuestionCorrect(
        Array.isArray(question.correctAnswer)
          ? question.correctAnswer.join(",")
          : question.correctAnswer !== undefined
            ? String(question.correctAnswer)
            : "",
      );
    }
  };

  const updateQuestion = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedQuestionId) return;

    setError(null);
    setMessage(null);

    const questionTextPayload = newQuestionText.trim();
    const questionImagePayload = newQuestionImage.trim();

    try {
      const commonPayload = {
        type: newQuestionType,
        question: questionTextPayload || " ",
        questionInVietnamese: questionTextPayload || " ",
        questionImage: questionImagePayload || undefined,
      };

      if (isSelectType(newQuestionType)) {
        const correctIndex = Number(newQuestionCorrect);
        const optionCount = newQuestionType === "TRUE_FALSE" ? 2 : 3;

        if (
          !Number.isFinite(correctIndex) ||
          correctIndex < 0 ||
          correctIndex > optionCount - 1
        ) {
          setError("Hay tick chon dap an dung ben duoi moi dap an.");
          return;
        }

        const options = newOptionDrafts.slice(0, optionCount).map((option) => ({
          name: option.name.trim() || " ",
          icon: option.icon.trim() || undefined,
        }));

        await adminApi.patch(`/api/admin/questions/${selectedQuestionId}`, {
          ...commonPayload,
          answers: options,
          correctAnswer: correctIndex,
        });
      } else {
        const tiles = getAnswerTilesForPayload();
        const correct =
          isSampleAnswerQuestionType(newQuestionType) ||
          isTileOnlyType(newQuestionType)
            ? []
            : newQuestionCorrect
                .split(",")
                .map((x) => Number(x.trim()))
                .filter((x) => Number.isFinite(x));

        await adminApi.patch(`/api/admin/questions/${selectedQuestionId}`, {
          ...commonPayload,
          answerTiles: tiles,
          correctAnswer: correct,
        });
      }

      if (selectedLessonId) {
        await loadQuestions(selectedLessonId);
      }
      setQuestionViewMode("detail");
      setMessage("Da sua cau hoi.");
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(message || "Sua cau hoi that bai.");
    }
  };

  const deleteQuestion = async (questionId: string) => {
    setError(null);
    setMessage(null);
    try {
      await adminApi.delete(`/api/admin/questions/${questionId}`);
      if (selectedLessonId) {
        await loadQuestions(selectedLessonId);
      }
      setQuestionViewMode("detail");
      setMessage("Da xoa cau hoi.");
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(message || "Xoa cau hoi that bai.");
    }
  };

  return (
    <AdminShell title="Lessons va Questions" subtitle="">
      <section className="card admin-section">
        <div className="admin-lesson-units-strip-wrap">
          <button
            type="button"
            className="admin-lesson-units-scroll-btn"
            onClick={() => scrollUnits("left")}
            disabled={!canScrollLeft}
            aria-label="Keo sang trai"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M14.5 6.5L9 12L14.5 17.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div
            ref={unitsStripRef}
            className="admin-lesson-units-strip"
            role="listbox"
            aria-label="Danh sach unit"
            onScroll={updateUnitScrollState}
          >
            {sortedUnits.map((unit) => (
              <button
                key={unit._id}
                type="button"
                className={`admin-lesson-unit-circle ${selectedUnitNumber === unit.unitNumber ? "is-selected" : ""}`}
                onClick={() =>
                  setSelectedUnitNumber((prev) =>
                    prev === unit.unitNumber ? null : unit.unitNumber,
                  )
                }
              >
                <span className="admin-lesson-unit-circle-label">Unit</span>
                <strong>{unit.unitNumber}</strong>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="admin-lesson-units-scroll-btn"
            onClick={() => scrollUnits("right")}
            disabled={!canScrollRight}
            aria-label="Keo sang phai"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M9.5 6.5L15 12L9.5 17.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0" }} />

        <div className="admin-lesson-units-strip-wrap">
          <button
            type="button"
            className="admin-lesson-units-scroll-btn"
            onClick={() => scrollLessons("left")}
            disabled={!canLessonScrollLeft}
            aria-label="Keo lesson sang trai"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M14.5 6.5L9 12L14.5 17.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div
            ref={lessonsStripRef}
            className="admin-lesson-units-strip"
            role="listbox"
            aria-label="Danh sach lesson"
            onScroll={updateLessonScrollState}
          >
            {sortedLessons.map((lesson) => (
              <button
                key={lesson._id}
                type="button"
                className={`admin-lesson-rect-item ${selectedLessonId === lesson._id ? "is-selected" : ""}`}
                onClick={() => setSelectedLessonId(lesson._id)}
                title={`${lesson.lessonNumber}. ${lesson.title}`}
              >
                <span className="admin-lesson-circle-text">
                  {getLessonCircleText(lesson)}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="admin-lesson-units-scroll-btn"
            onClick={() => scrollLessons("right")}
            disabled={!canLessonScrollRight}
            aria-label="Keo lesson sang phai"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M9.5 6.5L15 12L9.5 17.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </section>

      <section className="card admin-section">
        {selectedLessonId && (
          <div className="admin-questions-layout">
            <aside className="admin-questions-sidebar">
              <button
                className="btn btn-primary admin-questions-add-btn"
                type="button"
                onClick={() => {
                  setQuestionViewMode("create");
                  setSelectedQuestionId(null);
                  setNewQuestionType("SELECT_1_OF_3");
                  setNewQuestionText("");
                  setNewQuestionImage("");
                  setNewQuestionCorrect("");
                  setNewQuestionAnswerTiles("");
                  setNewOptionDrafts([
                    { name: "", icon: "" },
                    { name: "", icon: "" },
                    { name: "", icon: "" },
                  ]);
                }}
              >
                Add
              </button>

              <div className="admin-questions-list">
                {questions.map((question) => (
                  <button
                    key={question._id}
                    type="button"
                    className={`admin-question-list-item ${questionViewMode === "detail" && selectedQuestionId === question._id ? "is-active" : ""}`}
                    onClick={() => {
                      setQuestionViewMode("detail");
                      setSelectedQuestionId(question._id);
                    }}
                  >
                    <span>{getQuestionTypeLabel(question.type)}</span>
                  </button>
                ))}
              </div>
            </aside>

            <div className="admin-questions-content">
              {questionViewMode === "create" || questionViewMode === "edit" ? (
                <form
                  onSubmit={
                    questionViewMode === "edit"
                      ? updateQuestion
                      : createQuestion
                  }
                  className="card admin-question-create-card"
                >
                  {error ? (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: 12,
                        borderRadius: 12,
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#b91c1c",
                        fontWeight: 700,
                      }}
                    >
                      {error}
                    </div>
                  ) : null}

                  {message ? (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: 12,
                        borderRadius: 12,
                        background: "#ecfdf5",
                        border: "1px solid #bbf7d0",
                        color: "#15803d",
                        fontWeight: 700,
                      }}
                    >
                      {message}
                    </div>
                  ) : null}

                  
                  {(() => {
                    const shouldShowQuestionImageField =
                      isSelectType(newQuestionType) ||
                      newQuestionType === "DESCRIBE_PICTURE" ||
                      newQuestionImage.trim() !== "";

                    const showCorrectAnswerInput =
                      !isTileOnlyType(newQuestionType) &&
                      newQuestionType !== "INTERVIEW" &&
                      newQuestionType !== "DISCUSSION";

                    const shouldUseSampleAnswer =
                      isSampleAnswerQuestionType(newQuestionType);

                    const answerLabel = shouldUseSampleAnswer
                      ? newQuestionType === "PRESENTATION"
                        ? "Bài thuyết trình mẫu"
                        : newQuestionType === "DESCRIBE_PICTURE"
                          ? "Mô tả tranh ảnh mẫu"
                          : newQuestionType === "ESSAY" ||
                              newQuestionType === "REPORT" ||
                              newQuestionType === "NARRATIVE"
                            ? "Bài mẫu / hướng dẫn viết"
                          : "Câu trả lời mẫu"
                      : newQuestionType === "GRAMMAR_INTRO"
                        ? "Ví dụ ngữ pháp mẫu"
                        : "Các mảnh đáp án (phân tách bằng dấu phẩy)";

                    const answerPlaceholder = shouldUseSampleAnswer
                      ? newQuestionType === "PRESENTATION"
                        ? "Ví dụ: Today I would like to talk about my family. My family has four people..."
                        : newQuestionType === "DESCRIBE_PICTURE"
                          ? "Ví dụ: I can see a boy playing football in the park. The weather is sunny."
                        : newQuestionType === "ESSAY" ||
                            newQuestionType === "REPORT" ||
                            newQuestionType === "NARRATIVE"
                          ? "Ví dụ: I like learning English because it helps me talk to more people."
                        : newQuestionType === "DISCUSSION"
                          ? "Ví dụ: I prefer studying online because it is flexible."
                          : "Ví dụ: I usually have breakfast and go to school."
                      : newQuestionType === "GRAMMAR_INTRO"
                        ? "Ví dụ: I am a student."
                        : "";

                    const shouldUseLongAnswerInput =
                      shouldUseSampleAnswer || newQuestionType === "GRAMMAR_INTRO";

                    return (
                      <>
                        <div
                          className={`admin-question-head-layout ${shouldShowQuestionImageField ? "" : "is-single"}`}
                        >
                          <div className="admin-question-left-fields">
                            <label className="admin-question-type-field">
                              Loại bài học
                              <select
                                className="input"
                                value={newQuestionType}
                                onChange={(e) => {
                                  const nextType = e.target
                                    .value as QuestionType;
                                  setNewQuestionType(nextType);
                                  setNewQuestionCorrect("");
                                  setNewQuestionAnswerTiles(
                                    isSampleAnswerQuestionType(nextType)
                                      ? ""
                                      : newQuestionAnswerTiles,
                                  );

                                  if (nextType === "TRUE_FALSE") {
                                    setNewOptionDrafts([
                                      { name: "True", icon: "" },
                                      { name: "False", icon: "" },
                                      { name: "", icon: "" },
                                    ]);
                                  }
                                }}
                              >
                                {selectedLessonSection &&
                                selectedLessonSection !== "unit-review" ? (
                                  QUESTION_TYPE_OPTIONS_BY_SECTION[
                                    selectedLessonSection
                                  ].map((type) => (
                                    <option key={type} value={type}>
                                      {getQuestionTypeLabel(type)}
                                    </option>
                                  ))
                                ) : (
                                  <option value="">Khong ap dung</option>
                                )}
                              </select>
                            </label>

                            <label className="admin-question-text-field">
                              {newQuestionType === "PRESENTATION"
                                ? "Chủ đề thuyết trình"
                                : newQuestionType === "DESCRIBE_PICTURE"
                                  ? "Yêu cầu / nhiệm vụ mô tả tranh"
                                  : newQuestionType === "ESSAY" ||
                                      newQuestionType === "REPORT" ||
                                      newQuestionType === "NARRATIVE"
                                    ? "Đề bài viết"
                                  : newQuestionType === "MATCHING_HEADING"
                                    ? "Đoạn đọc / đoạn văn"
                                    : newQuestionType === "SUMMARY_COMPLETION"
                                      ? "Đoạn tóm tắt có chỗ trống"
                                  : newQuestionType === "GRAMMAR_INTRO"
                                    ? "Cấu trúc ngữ pháp"
                                    : "Câu hỏi"}
                              <input
                                className="input"
                                value={newQuestionText}
                                onChange={(e) =>
                                  setNewQuestionText(e.target.value)
                                }
                                placeholder={
                                  newQuestionType === "PRESENTATION"
                                    ? "Ví dụ: Talk about your family."
                                    : newQuestionType === "DESCRIBE_PICTURE"
                                      ? "Ví dụ: Describe the picture in 2-3 sentences."
                                      : newQuestionType === "ESSAY" ||
                                          newQuestionType === "REPORT" ||
                                          newQuestionType === "NARRATIVE"
                                        ? "Ví dụ: Write about your favorite hobby."
                                      : newQuestionType === "MATCHING_HEADING"
                                        ? "Ví dụ: Tom has a dog. He plays with it every day."
                                        : newQuestionType === "SUMMARY_COMPLETION"
                                          ? "Ví dụ: Tom has a dog. His dog is ____."
                                      : newQuestionType === "GRAMMAR_INTRO"
                                      ? "Ví dụ: Subject + am/is/are + noun/adjective"
                                      : ""
                                }
                              />
                            </label>
                          </div>

                          {shouldShowQuestionImageField ? (
                            <label
                              className="admin-question-image-upload admin-question-image-upload-head"
                              title="Tai anh cau hoi"
                            >
                              <input
                                className="admin-option-file-input"
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  handleQuestionImageUpload(e.target.files?.[0])
                                }
                              />
                              {newQuestionImage ? (
                                <img
                                  className="admin-question-upload-preview"
                                  src={newQuestionImage}
                                  alt="Question upload"
                                />
                              ) : (
                                <div
                                  className="admin-question-upload-placeholder"
                                  aria-hidden="true"
                                />
                              )}
                              <span
                                className="admin-option-upload-overlay"
                                aria-hidden="true"
                              >
                                <svg viewBox="0 0 24 24">
                                  <path
                                    d="M12 5V15M12 5L8.5 8.5M12 5L15.5 8.5M6 17.5H18"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            </label>
                          ) : null}
                        </div>

                        {isSelectType(newQuestionType) ? (
                          <div className="admin-option-builder">
                            {newQuestionType === "FLASHCARD" ? (
                              <div className="admin-ai-tool-row">
                                <button
                                  className="btn btn-secondary"
                                  type="button"
                                  onClick={generateFlashcardWithAI}
                                  disabled={isGeneratingFlashcard}
                                >
                                  {isGeneratingFlashcard
                                    ? "AI đang tạo..."
                                    : "AI tạo Flashcard"}
                                </button>
                                <span>
                                  Nhập một từ, chủ đề hoặc câu hỏi nháp. AI sẽ tự điền 3 đáp án và chọn đáp án đúng.
                                </span>
                              </div>
                            ) : null}

                            {newQuestionType === "MATCHING_HEADING" ? (
                              <div className="admin-ai-tool-row">
                                <button
                                  className="btn btn-secondary"
                                  type="button"
                                  onClick={generateHeadingMatchWithAI}
                                  disabled={isGeneratingHeadingMatch}
                                >
                                  {isGeneratingHeadingMatch
                                    ? "AI đang tạo..."
                                    : "AI tạo bài ghép tiêu đề"}
                                </button>
                                <span>
                                  Nhập chủ đề hoặc đoạn đọc. AI sẽ tạo đoạn văn, 3 tiêu đề và chọn đáp án đúng.
                                </span>
                              </div>
                            ) : null}

                            <div className="admin-option-builder-grid">
                              {newOptionDrafts
                                .slice(0, newQuestionType === "TRUE_FALSE" ? 2 : 3)
                                .map((option, index) => (
                                <div
                                  key={`option-${index}`}
                                  className="admin-option-builder-item"
                                >
                                  <label
                                    className="admin-option-image-upload"
                                    title={`Tai anh ${index + 1}`}
                                  >
                                    <input
                                      className="admin-option-file-input"
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) =>
                                        handleOptionImageUpload(
                                          index,
                                          e.target.files?.[0],
                                        )
                                      }
                                    />
                                    {option.icon ? (
                                      <img
                                        className="admin-option-image-preview"
                                        src={option.icon}
                                        alt={`Anh dap an ${index + 1}`}
                                      />
                                    ) : (
                                      <div
                                        className="admin-option-image-circle"
                                        aria-hidden="true"
                                      />
                                    )}
                                    <span
                                      className="admin-option-upload-overlay"
                                      aria-hidden="true"
                                    >
                                      <svg viewBox="0 0 24 24">
                                        <path
                                          d="M12 5V15M12 5L8.5 8.5M12 5L15.5 8.5M6 17.5H18"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </span>
                                  </label>
                                  <input
                                    className="input admin-option-answer-input"
                                    placeholder=""
                                    value={option.name}
                                    onChange={(e) => {
                                      const next = [...newOptionDrafts];
                                      next[index] = {
                                        ...next[index],
                                        name: e.target.value,
                                      };
                                      setNewOptionDrafts(next);
                                    }}
                                  />
                                  <label className="admin-option-correct-check">
                                    <input
                                      type="checkbox"
                                      checked={
                                        newQuestionCorrect === String(index)
                                      }
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setNewQuestionCorrect(String(index));
                                        } else {
                                          setNewQuestionCorrect("");
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="admin-nonselect-fields">
                            {newQuestionType === "SUMMARY_COMPLETION" ? (
                              <div className="admin-ai-tool-row">
                                <button
                                  className="btn btn-secondary"
                                  type="button"
                                  onClick={generateSummaryCompletionWithAI}
                                  disabled={isGeneratingSummaryCompletion}
                                >
                                  {isGeneratingSummaryCompletion
                                    ? "AI đang tạo..."
                                    : "AI tạo bài tóm tắt"}
                                </button>
                                <span>
                                  Nhập chủ đề hoặc bản tóm tắt nháp. AI sẽ tạo câu có chỗ trống, các lựa chọn và từ đúng.
                                </span>
                              </div>
                            ) : null}

                            {showCorrectAnswerInput ? (
                              <label className="admin-field-label">
                                {newQuestionType === "SUMMARY_COMPLETION"
                                  ? "Vị trí từ đúng / các vị trí đúng"
                                  : "Vị trí đáp án đúng / các vị trí đúng"}
                                <input
                                  className="input"
                                  value={newQuestionCorrect}
                                  onChange={(e) =>
                                    setNewQuestionCorrect(e.target.value)
                                  }
                                  placeholder={"0,1,2"}
                                />
                              </label>
                            ) : null}

                            <label className="admin-field-label">
                              {newQuestionType === "SUMMARY_COMPLETION"
                                ? "Các lựa chọn từ (phân tách bằng dấu phẩy)"
                                : answerLabel}
                              {shouldUseLongAnswerInput ? (
                                <textarea
                                  className="input"
                                  rows={
                                    newQuestionType === "PRESENTATION"
                                      ? 8
                                      : newQuestionType === "GRAMMAR_INTRO"
                                        ? 3
                                        : 5
                                  }
                                  value={newQuestionAnswerTiles}
                                  onChange={(e) =>
                                    setNewQuestionAnswerTiles(e.target.value)
                                  }
                                  placeholder={answerPlaceholder}
                                />
                              ) : (
                                <input
                                  className="input"
                                  value={newQuestionAnswerTiles}
                                  onChange={(e) =>
                                    setNewQuestionAnswerTiles(e.target.value)
                                  }
                                  placeholder={answerPlaceholder}
                                />
                              )}
                            </label>

                            {shouldUseSampleAnswer || newQuestionType === "GRAMMAR_INTRO" ? (
                              <div
                                style={{
                                  background: newQuestionType === "GRAMMAR_INTRO" ? "#eff6ff" : "#f3f4f6",
                                  padding: "12px",
                                  borderRadius: "12px",
                                  fontSize: "14px",
                                  color: newQuestionType === "GRAMMAR_INTRO" ? "#1d4ed8" : "#555",
                                }}
                              >
                                {newQuestionType === "PRESENTATION"
                                  ? "AI sẽ dùng bài mẫu này để gợi ý dàn ý, từ vựng, sửa lỗi và nhận xét bài thuyết trình của người học."
                                  : newQuestionType === "DESCRIBE_PICTURE"
                                    ? "AI sẽ dùng hình ảnh, yêu cầu và mô tả mẫu để gợi ý từ vựng, sửa lỗi và nhận xét phần mô tả của người học."
                                  : newQuestionType === "ESSAY" ||
                                      newQuestionType === "REPORT" ||
                                      newQuestionType === "NARRATIVE"
                                    ? "AI sẽ dùng bài mẫu này để gợi ý dàn ý, cụm từ hữu ích và sửa lỗi bài viết của người học."
                                  : newQuestionType === "GRAMMAR_INTRO"
                                    ? "AI Grammar Coach sẽ giải thích cấu trúc bằng tiếng Việt, cho người học tự nhập câu, sửa lỗi ngữ pháp và giải thích lỗi sai."
                                    : "AI sẽ dùng câu trả lời mẫu này để gợi ý cách viết, sửa lỗi ngữ pháp và đánh giá câu trả lời của người học."}
                              </div>
                            ) : null}
                          </div>
                        )}

                        <div
                          className="row"
                          style={{ marginTop: 8, justifyContent: "center" }}
                        >
                          <button className="btn btn-primary" type="submit">
                            {questionViewMode === "edit" ? "Lưu" : "Thêm"}
                          </button>
                          {questionViewMode === "edit" ? (
                            <button
                              className="btn btn-secondary"
                              type="button"
                              onClick={() => setQuestionViewMode("detail")}
                            >
                              Hủy
                            </button>
                          ) : null}
                        </div>
                      </>
                    );
                  })()}
                </form>
              ) : selectedQuestion ? (
                <div className="card admin-question-detail-card">
                  <div className="split" style={{ marginBottom: 10 }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{getQuestionTypeLabel(selectedQuestion.type)}</h3>
                    </div>
                    <div className="row">
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          fillFormFromQuestion(selectedQuestion);
                          setSelectedQuestionId(selectedQuestion._id);
                          setQuestionViewMode("edit");
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() =>
                          void deleteQuestion(selectedQuestion._id)
                        }
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  <div className="stack">
                    {(() => {
                      const questionText = (
                        selectedQuestion.question ?? ""
                      ).trim();
                      const questionImage = (
                        selectedQuestion.questionImage ||
                        selectedQuestion.image ||
                        selectedQuestion.mediaUrl ||
                        (isImageUrl(questionText) ? questionText : "")
                      ).trim();
                      const shouldRenderText =
                        questionText !== "" && !isImageUrl(questionText);

                      return (
                        <>
                          <div>
                            <div className="muted">
                              {selectedQuestion.type === "GRAMMAR_INTRO"
                                ? "Cấu trúc ngữ pháp"
                                : selectedQuestion.type === "PRESENTATION"
                                  ? "Chủ đề"
                                  : selectedQuestion.type === "DESCRIBE_PICTURE"
                                    ? "Yêu cầu"
                                    : "Câu hỏi"}
                            </div>
                            {shouldRenderText ? (
                              <p className="admin-question-text">
                                {questionText}
                              </p>
                            ) : (
                              <p className="admin-question-text">( )</p>
                            )}
                          </div>

                          {questionImage && isImageUrl(questionImage) ? (
                            <div>
                              <img
                                className="admin-question-image"
                                src={questionImage}
                                alt="Question visual"
                              />
                            </div>
                          ) : null}
                        </>
                      );
                    })()}

                    {selectedQuestion.answers?.length ? (
                      <div>
                        <div className="muted">Đáp án</div>
                        <div className="admin-question-answers-grid">
                          {selectedQuestion.answers.map((answer, index) => {
                            const isCorrect = Array.isArray(
                              selectedQuestion.correctAnswer,
                            )
                              ? selectedQuestion.correctAnswer
                                  .map((value) => Number(value))
                                  .includes(index)
                              : Number(selectedQuestion.correctAnswer) ===
                                index;

                            return (
                              <div
                                key={`${answer.name}-${index}`}
                                className={`admin-question-answer-item ${isCorrect ? "is-correct" : ""}`}
                              >
                                <strong>{index + 1}.</strong>
                                {answer.icon && isImageUrl(answer.icon) ? (
                                  <img
                                    className="admin-question-answer-image"
                                    src={answer.icon}
                                    alt={`Answer ${index + 1}`}
                                  />
                                ) : null}
                                {isImageUrl(answer.name) ? (
                                  <img
                                    className="admin-question-answer-image"
                                    src={answer.name}
                                    alt={`Answer value ${index + 1}`}
                                  />
                                ) : (
                                  <span>{answer.name}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {selectedQuestion.answerTiles?.length ? (
                      <div>
                        <div className="muted">
                          {isSampleAnswerQuestionType(selectedQuestion.type)
                            ? selectedQuestion.type === "PRESENTATION"
                              ? "Bai thuyet trinh mau"
                              : "Cau tra loi mau"
                            : selectedQuestion.type === "GRAMMAR_INTRO"
                              ? "Ví dụ ngữ pháp"
                              : "Các mảnh đáp án"}
                        </div>
                        {isSampleAnswerQuestionType(selectedQuestion.type) ||
                        selectedQuestion.type === "GRAMMAR_INTRO" ? (
                          <div className="admin-question-sample-answer">
                            {formatSampleAnswer(selectedQuestion.answerTiles)}
                          </div>
                        ) : (
                          <div className="admin-question-tiles-row">
                            {selectedQuestion.answerTiles.map((tile) => (
                              <span key={tile} className="chip">
                                {tile}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {selectedQuestion.correctAnswer !== undefined ? (
                      <div></div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="card admin-question-detail-card"></div>
              )}
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
