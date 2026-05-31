import express, { Request, Response } from "express";
import OpenAI from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { topic, level } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: "Thiếu chủ đề Reading",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Bạn là AI tạo bài đọc tiếng Anh cho website học tiếng Anh. Chỉ trả về JSON hợp lệ, không giải thích thêm.",
        },
        {
          role: "user",
          content: `
Tạo một bài Reading MCQ cho người học tiếng Anh trình độ ${level || "A1"}.

Chủ đề:
${topic}

Yêu cầu:
- Đoạn reading ngắn, dễ hiểu
- 1 câu hỏi trắc nghiệm
- 3 đáp án
- Chỉ có 1 đáp án đúng
- Phù hợp trình độ ${level || "A1"}
- Không tạo ảnh

Trả về đúng JSON theo cấu trúc:
{
  "readingText": "...",
  "question": "...",
  "answers": ["...", "...", "..."],
  "correctAnswer": 0
}
`,
        },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(rawContent);

    if (
      !parsed.readingText ||
      !parsed.question ||
      !Array.isArray(parsed.answers) ||
      parsed.answers.length !== 3 ||
      typeof parsed.correctAnswer !== "number"
    ) {
      return res.status(500).json({
        success: false,
        message: "AI trả về dữ liệu không đúng định dạng",
      });
    }

    res.json({
      success: true,
      data: {
        readingText: parsed.readingText,
        question: parsed.question,
        answers: parsed.answers,
        correctAnswer: parsed.correctAnswer,
      },
    });
  } catch (error: any) {
    console.error("Admin Reading AI Generate Error:", error?.message || error);

    res.status(500).json({
      success: false,
      message: error?.message || "Không thể tạo bài Reading bằng AI",
    });
  }
});

export default router;