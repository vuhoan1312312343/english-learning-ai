import { useEffect, useState } from "react";
import { BottomBar } from "~/components/BottomBar";
import { LeftBar } from "~/components/LeftBar";

type FillBlankQuestion = {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  level: string;
  explanation?: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function FillBlankPage() {
  const [questions, setQuestions] = useState<FillBlankQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [aiHint, setAiHint] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiExplanationLoading, setAiExplanationLoading] = useState(false);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const res = await fetch(`${API_URL}/api/fill-blank?level=A1`);
        const data = await res.json();
        if (data.success) setQuestions(data.questions);
      } catch (error) {
        console.error("Load Fill Blank Error:", error);
      }
    };

    void loadQuestions();
  }, []);

  const isCorrect =
    selectedAnswer.trim().toLowerCase() ===
    currentQuestion?.correctAnswer.trim().toLowerCase();

  const askAI = async (mode: "hint" | "correction") => {
    if (!currentQuestion) return "";

    const res = await fetch(`${API_URL}/api/fill-blank-ai/hint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: currentQuestion.question,
        options: currentQuestion.options,
        level: currentQuestion.level,
        userAnswer: selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation || "",
        mode,
      }),
    });

    const data = await res.json();
    return data.hint || data.message || "AI chưa thể hỗ trợ câu này.";
  };

  const handleAskAI = async () => {
    setAiLoading(true);
    setAiHint("");

    try {
      setAiHint(await askAI("hint"));
    } catch {
      setAiHint("Không thể kết nối backend AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAskAIExplanation = async () => {
    setAiExplanationLoading(true);
    setAiExplanation("");

    try {
      setAiExplanation(await askAI("correction"));
    } catch {
      setAiExplanation("Không thể kết nối AI giải thích.");
    } finally {
      setAiExplanationLoading(false);
    }
  };

  const handleCheck = () => {
    if (!selectedAnswer) return;

    setChecked(true);
    if (isCorrect) setScore((prev) => prev + 1);
    void handleAskAIExplanation();
  };

  const handleNext = () => {
    setSelectedAnswer("");
    setChecked(false);
    setAiHint("");
    setAiLoading(false);
    setAiExplanation("");
    setAiExplanationLoading(false);

    setCurrentIndex((prev) => {
      if (prev + 1 >= questions.length) return prev;
      return prev + 1;
    });
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-white">
        <LeftBar selectedTab={null} />
        <BottomBar selectedTab={null} />

        <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 md:pl-28 lg:pl-72">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">
              Chưa có bài Fill In Blank
            </h1>
            <p className="mt-3 text-gray-500">
              Hãy thêm câu hỏi trong trang Admin trước.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <LeftBar selectedTab={null} />
      <BottomBar selectedTab={null} />

      <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-10 md:pl-28 lg:pl-72">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-800">
            Fill In The Blank
          </h1>

          <p className="mt-2 text-gray-500">
            Chọn từ đúng để hoàn thành câu tiếng Anh.
          </p>

          <p className="mt-2 font-bold text-green-600">
            Score: {score}/{questions.length}
          </p>
        </div>

        <section className="rounded-3xl border-2 border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-500">
              Level {currentQuestion.level}
            </span>

            <span className="text-sm font-bold text-gray-400">
              {currentIndex + 1}/{questions.length}
            </span>
          </div>

          <h2 className="mb-6 text-3xl font-bold text-gray-800">
            {currentQuestion.question}
          </h2>

          <button
            onClick={handleAskAI}
            disabled={aiLoading || checked}
            className={[
              "mb-5 rounded-2xl px-5 py-3 font-bold text-white",
              aiLoading || checked
                ? "bg-gray-400"
                : "border-b-4 border-purple-700 bg-purple-500 hover:bg-purple-600",
            ].join(" ")}
          >
            {aiLoading ? "AI đang suy nghĩ..." : "🤖 Hỏi AI gợi ý"}
          </button>

          {aiHint ? (
            <div className="mb-6 rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-purple-700">
              <div className="mb-2 font-bold">Gợi ý từ AI:</div>
              <p className="whitespace-pre-line text-sm leading-6">
                {aiHint}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedAnswer === option;

              return (
                <button
                  key={option}
                  disabled={checked}
                  onClick={() => setSelectedAnswer(option)}
                  className={[
                    "rounded-2xl border-2 border-b-4 p-5 text-xl font-bold transition",
                    isSelected
                      ? "border-blue-400 bg-blue-100 text-blue-500"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100",
                  ].join(" ")}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {checked ? (
            <div
              className={[
                "mt-8 rounded-2xl p-5 font-bold",
                isCorrect
                  ? "bg-green-100 text-green-600"
                  : "bg-red-100 text-red-500",
              ].join(" ")}
            >
              {isCorrect ? (
                <p>✅ Chính xác!</p>
              ) : (
                <p>
                  ❌ Sai rồi. Đáp án đúng là:{" "}
                  {currentQuestion.correctAnswer}
                </p>
              )}

              {currentQuestion.explanation ? (
                <p className="mt-2 font-normal">
                  {currentQuestion.explanation}
                </p>
              ) : null}

              <div className="mt-4 rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-purple-700">
                <div className="mb-2 font-bold">AI giải thích:</div>

                {aiExplanationLoading ? (
                  <p className="text-sm font-normal leading-6">
                    AI đang phân tích câu trả lời của bạn...
                  </p>
                ) : (
                  <p className="whitespace-pre-line text-sm font-normal leading-6">
                    {aiExplanation}
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex justify-end">
            {!checked ? (
              <button
                onClick={handleCheck}
                disabled={!selectedAnswer}
                className={[
                  "rounded-2xl px-8 py-4 font-bold uppercase text-white",
                  selectedAnswer
                    ? "border-b-4 border-green-600 bg-green-500"
                    : "bg-gray-300",
                ].join(" ")}
              >
                Check
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="rounded-2xl border-b-4 border-blue-600 bg-blue-500 px-8 py-4 font-bold uppercase text-white"
              >
                Continue
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
