import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";

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

const emptyOptions = ["", "", ""];

export default function FillBlankAdminPage() {
  const [questions, setQuestions] = useState<FillBlankQuestion[]>([]);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(emptyOptions);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [level, setLevel] = useState("A1");
  const [explanation, setExplanation] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const optionList = useMemo(
    () => options.map((item) => item.trim()).filter(Boolean),
    [options],
  );

  const loadQuestions = async () => {
    const res = await fetch(`${API_URL}/api/fill-blank`);
    const data = await res.json();
    if (data.success) setQuestions(data.questions);
  };

  useEffect(() => {
    void loadQuestions();
  }, []);

  const resetForm = () => {
    setQuestion("");
    setOptions(emptyOptions);
    setCorrectAnswer("");
    setLevel("A1");
    setExplanation("");
    setAiPrompt("");
  };

  const showMessage = (text: string, type: "success" | "error" = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const validateForm = () => {
    if (!question.trim().includes("___")) {
      return 'Câu hỏi phải có một chỗ trống bằng ký hiệu "___. Ví dụ: She ___ coffee every morning."';
    }

    if (optionList.length !== 3) return "Cần nhập đúng 3 lựa chọn.";
    if (new Set(optionList.map((item) => item.toLowerCase())).size !== 3) {
      return "Các lựa chọn không được trùng nhau.";
    }
    if (!optionList.includes(correctAnswer.trim())) {
      return "Đáp án đúng phải trùng chính xác một trong 3 lựa chọn.";
    }

    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      showMessage(validationError, "error");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/fill-blank`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
          options: optionList,
          correctAnswer: correctAnswer.trim(),
          level,
          explanation: explanation.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showMessage("Thêm câu hỏi thành công!");
        resetForm();
        await loadQuestions();
      } else {
        showMessage(data.message || "Có lỗi xảy ra", "error");
      }
    } catch {
      showMessage("Không thể kết nối backend.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      showMessage("Hãy nhập một từ, chủ đề hoặc câu hỏi nháp trước khi dùng AI.", "error");
      return;
    }

    try {
      setGenerating(true);
      const res = await fetch(`${API_URL}/api/fill-blank-ai/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          level,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        showMessage(data.message || "AI chưa tạo được câu hỏi.", "error");
        return;
      }

      setQuestion(data.question || "");
      setOptions(Array.isArray(data.options) ? data.options.slice(0, 3) : emptyOptions);
      setCorrectAnswer(data.correctAnswer || "");
      setExplanation(data.explanation || "");
      showMessage("AI đã tạo câu hỏi. Bạn kiểm tra lại rồi bấm thêm câu hỏi nhé.");
    } catch {
      showMessage("Không thể kết nối AI tạo câu hỏi.", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa câu hỏi này?")) return;

    await fetch(`${API_URL}/api/fill-blank/${id}`, {
      method: "DELETE",
    });
    await loadQuestions();
  };

  return (
    <AdminShell
      title="Fill In Blank"
      subtitle="Quản lý bài tập điền từ vào chỗ trống"
    >
      <section className="card admin-section">
        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <h2 className="mb-2 text-xl font-black text-blue-700">
            AI tạo câu hỏi Fill Blank
          </h2>
          <p className="mb-3 text-sm text-blue-700">
            Nhập một từ, chủ đề hoặc câu hỏi nháp. AI sẽ tự tạo câu, 3 lựa chọn, đáp án đúng và giải thích.
          </p>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <input
              className="input"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ví dụ: present simple, drink coffee, She ___ coffee every morning"
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleGenerateWithAI}
              disabled={generating}
            >
              {generating ? "AI đang tạo..." : "Tạo bằng AI"}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="label">Câu hỏi</label>
          <input
            className="input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder='Ví dụ: She ___ coffee every morning.'
          />

          <label className="label">Các lựa chọn</label>
          <div className="grid gap-3 lg:grid-cols-3">
            {options.map((option, index) => (
              <input
                key={index}
                className="input"
                value={option}
                onChange={(e) => {
                  const next = [...options];
                  next[index] = e.target.value;
                  setOptions(next);
                }}
                placeholder={`Lựa chọn ${index + 1}`}
              />
            ))}
          </div>

          <label className="label">Đáp án đúng</label>
          <select
            className="input"
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
          >
            <option value="">Chọn đáp án đúng</option>
            {optionList.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <label className="label">Cấp độ</label>
          <select
            className="input"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
            <option value="C2">C2</option>
          </select>

          <label className="label">Giải thích</label>
          <textarea
            className="input min-h-[120px]"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Giải thích vì sao đáp án đúng. AI sẽ dùng phần này để giải thích rõ hơn cho người học."
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Đang thêm..." : "Thêm câu hỏi"}
          </button>

          {message ? (
            <p className={`font-bold ${messageType === "success" ? "text-green-600" : "text-red-600"}`}>
              {message}
            </p>
          ) : null}
        </form>
      </section>

      <section className="card admin-section">
        <h2 className="panel-title">Danh sách câu hỏi</h2>

        <div className="mt-4 flex flex-col gap-3">
          {questions.map((item) => (
            <div key={item._id} className="rounded-2xl border p-4">
              <div className="font-bold">{item.question}</div>
              <div className="mt-2 text-sm text-gray-500">
                Lựa chọn: {item.options.join(", ")}
              </div>
              <div className="mt-1 text-sm text-green-600">
                Đáp án đúng: {item.correctAnswer}
              </div>
              <div className="mt-1 text-sm text-blue-500">
                Cấp độ: {item.level}
              </div>
              {item.explanation ? (
                <div className="mt-1 text-sm text-gray-600">
                  Giải thích: {item.explanation}
                </div>
              ) : null}
              <button
                onClick={() => handleDelete(item._id)}
                className="mt-3 rounded-xl bg-red-500 px-4 py-2 font-bold text-white"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
