import express, { Request, Response } from "express";
import OpenAI from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* =========================
   AI GIẢI THÍCH NGỮ PHÁP
========================= */
router.post("/explain", async (req: Request, res: Response) => {
  try {
    const { grammarTitle, example } = req.body;

    if (!grammarTitle) {
      return res.status(400).json({
        success: false,
        message: "Thiếu cấu trúc ngữ pháp",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Bạn là AI giáo viên tiếng Anh cho sinh viên Việt Nam. Hãy giải thích ngữ pháp dễ hiểu bằng tiếng Việt.",
        },
        {
          role: "user",
          content: `
Cấu trúc ngữ pháp:
${grammarTitle}

Ví dụ:
${example || "Không có"}

Hãy giải thích:
1. Ý nghĩa của cấu trúc
2. Khi nào dùng
3. Công thức câu
4. Ví dụ đơn giản
5. Lưu ý lỗi thường gặp
`,
        },
      ],
      temperature: 0.4,
    });

    res.json({
      success: true,
      feedback:
        completion.choices[0]?.message?.content ||
        "AI chưa thể giải thích.",
    });
  } catch (error: any) {
    console.error(
      "Grammar Explain Error:",
      error?.message || error
    );

    res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Không thể gọi AI giải thích ngữ pháp",
    });
  }
});

/* =========================
   AI KIỂM TRA CÂU NGỮ PHÁP
========================= */
router.post("/check", async (req: Request, res: Response) => {
  try {
    const { grammarTitle, userSentence, example } = req.body;

    if (!grammarTitle || !userSentence) {
      return res.status(400).json({
        success: false,
        message: "Thiếu dữ liệu kiểm tra",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Bạn là AI sửa lỗi ngữ pháp tiếng Anh cho sinh viên Việt Nam.",
        },
        {
          role: "user",
          content: `
Cấu trúc ngữ pháp:
${grammarTitle}

Ví dụ:
${example || "Không có"}

Câu của người học:
${userSentence}

Hãy phản hồi bằng tiếng Việt:
1. Câu đúng hay sai
2. Chỉ ra lỗi ngữ pháp nếu có
3. Viết lại câu đúng
4. Giải thích dễ hiểu
`,
        },
      ],
      temperature: 0.3,
    });

    res.json({
      success: true,
      feedback:
        completion.choices[0]?.message?.content ||
        "AI chưa có phản hồi.",
    });
  } catch (error: any) {
    console.error(
      "Grammar Check Error:",
      error?.message || error
    );

    res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Không thể kiểm tra ngữ pháp",
    });
  }
});

export default router;