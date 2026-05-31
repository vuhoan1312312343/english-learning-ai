import express, { Request, Response } from "express";
import OpenAI from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 20000,
});

const normalizeText = (value: unknown, max = 1200) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const normalizeOptions = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => normalizeText(item, 80)).filter(Boolean).slice(0, 5)
    : [];

const fallbackHint = (question: string, options: string[]) => {
  const optionText = options.length ? `\nCác lựa chọn: ${options.join(", ")}` : "";
  return [
    `Hãy đọc kỹ câu: "${question}".`,
    "Bước 1: Nhìn chủ ngữ và dấu hiệu thời gian.",
    "Bước 2: Xác định chỗ trống cần danh từ, động từ, tính từ hay dạng chia của động từ.",
    `Bước 3: Loại đáp án không hợp ngữ pháp trước, rồi mới xét nghĩa.${optionText}`,
  ].join("\n");
};

const fallbackExplanation = (
  question: string,
  userAnswer: string,
  correctAnswer: string,
  explanation?: string,
) => {
  const base =
    userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
      ? `Bạn chọn đúng: "${correctAnswer}".`
      : `Đáp án đúng là "${correctAnswer}", không phải "${userAnswer || "chưa chọn"}".`;

  return [
    base,
    explanation
      ? `Vì sao: ${explanation}`
      : `Trong câu "${question}", hãy kiểm tra chủ ngữ, thì của câu và từ đứng trước/sau chỗ trống để chọn đúng dạng từ.`,
    "Ví dụ tương tự: She drinks tea every day. Chủ ngữ 'she' ở hiện tại đơn nên động từ thường thêm -s/-es.",
  ].join("\n");
};

const extractJsonObject = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI did not return JSON");
    return JSON.parse(match[0]);
  }
};

router.get("/test", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Fill Blank AI route đang hoạt động",
  });
});

router.post("/hint", async (req: Request, res: Response) => {
  try {
    const question = normalizeText(req.body?.question);
    const mode = normalizeText(req.body?.mode, 20) || "hint";
    const level = normalizeText(req.body?.level, 10) || "A1";
    const userAnswer = normalizeText(req.body?.userAnswer, 80);
    const correctAnswer = normalizeText(req.body?.correctAnswer, 80);
    const explanation = normalizeText(req.body?.explanation);
    const options = normalizeOptions(req.body?.options);

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Thiếu câu hỏi để AI gợi ý.",
      });
    }

    const isCorrectionMode = mode === "correction";

    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        success: true,
        fallback: true,
        hint: isCorrectionMode
          ? fallbackExplanation(question, userAnswer, correctAnswer, explanation)
          : fallbackHint(question, options),
      });
    }

    const optionText = options.length ? options.join(", ") : "Không có lựa chọn";
    const userPrompt = isCorrectionMode
      ? `
Câu hỏi: ${question}
Các lựa chọn: ${optionText}
Cấp độ: ${level}
Người học chọn: ${userAnswer || "(chưa có)"}
Đáp án đúng: ${correctAnswer || "(không có)"}
Giải thích từ admin: ${explanation || "(không có)"}

Hãy giải thích bằng tiếng Việt cho người học:
1. Kết luận rõ câu trả lời đúng hay sai.
2. Giải thích dấu hiệu ngữ pháp/từ vựng trong câu.
3. Nếu sai, nói rõ vì sao đáp án người học chọn chưa đúng.
4. Cho 1 câu ví dụ tiếng Anh tương tự và dịch nghĩa.
Trả lời rõ ràng, thân thiện, 90-140 từ.
`.trim()
      : `
Câu hỏi: ${question}
Các lựa chọn: ${optionText}
Cấp độ: ${level}

Hãy gợi ý bằng tiếng Việt nhưng KHÔNG nói thẳng đáp án.
Nội dung cần có:
1. Người học nên nhìn dấu hiệu nào trong câu.
2. Chỗ trống cần dạng từ hoặc từ loại nào.
3. Cách loại ít nhất một đáp án sai.
4. Một mẹo nhớ nhanh.
Trả lời ngắn gọn, dễ hiểu, 70-110 từ.
`.trim();

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_FILL_BLANK_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 360,
      messages: [
        {
          role: "system",
          content:
            "Bạn là trợ lý AI dạy tiếng Anh cho người Việt. Hãy giải thích đúng trình độ, tập trung vào dấu hiệu ngữ pháp, nghĩa câu và cách loại đáp án sai.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const hint = completion.choices[0]?.message?.content?.trim();

    res.json({
      success: true,
      hint:
        hint ||
        (isCorrectionMode
          ? fallbackExplanation(question, userAnswer, correctAnswer, explanation)
          : fallbackHint(question, options)),
    });
  } catch (error: any) {
    console.error("FillBlank AI error:", error?.message || error);

    const question = normalizeText(req.body?.question) || "câu này";
    const options = normalizeOptions(req.body?.options);
    res.status(200).json({
      success: true,
      fallback: true,
      hint: fallbackHint(question, options),
    });
  }
});

router.post("/generate", async (req: Request, res: Response) => {
  try {
    const prompt = normalizeText(req.body?.prompt);
    const level = normalizeText(req.body?.level, 10) || "A1";

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: "Hãy nhập một từ, chủ đề hoặc câu hỏi nháp để AI tạo bài.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({
        success: false,
        message: "Thiếu OPENAI_API_KEY nên chưa thể dùng AI tạo câu hỏi.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_FILL_BLANK_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 450,
      messages: [
        {
          role: "system",
          content:
            "Bạn tạo bài Fill in the Blank cho người Việt học tiếng Anh. Chỉ trả về JSON hợp lệ, không markdown.",
        },
        {
          role: "user",
          content: `
Tạo 1 câu hỏi Fill in the Blank cấp độ ${level} từ chủ đề/câu nháp sau:
${prompt}

Yêu cầu:
- question: câu tiếng Anh có đúng một chỗ trống bằng "___".
- options: đúng 3 lựa chọn ngắn.
- correctAnswer: phải trùng chính xác một lựa chọn trong options.
- explanation: giải thích bằng tiếng Việt vì sao đáp án đúng, thật rõ cho người học.

Trả về JSON dạng:
{
  "question": "She ___ coffee every morning.",
  "options": ["drink", "drinks", "drinking"],
  "correctAnswer": "drinks",
  "explanation": "Chủ ngữ 'She' là ngôi thứ ba số ít. Ở hiện tại đơn, động từ thường thêm -s nên chọn 'drinks'."
}
`.trim(),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "";
    const parsed = extractJsonObject(raw);

    const question = normalizeText(parsed.question);
    const options = normalizeOptions(parsed.options).slice(0, 3);
    const correctAnswer = normalizeText(parsed.correctAnswer, 80);
    const explanation = normalizeText(parsed.explanation);

    if (!question.includes("___") || options.length !== 3 || !options.includes(correctAnswer)) {
      return res.status(422).json({
        success: false,
        message: "AI tạo dữ liệu chưa hợp lệ. Hãy thử lại với chủ đề rõ hơn.",
      });
    }

    res.json({
      success: true,
      question,
      options,
      correctAnswer,
      explanation,
      level,
    });
  } catch (error: any) {
    console.error("FillBlank generate error:", error?.message || error);
    res.status(500).json({
      success: false,
      message: "Không thể tạo câu hỏi bằng AI lúc này.",
    });
  }
});

export default router;
