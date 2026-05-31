import express, { Request, Response } from "express";
import OpenAI from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/hint", async (req: Request, res: Response) => {
  try {
    const { question, sampleAnswer } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Bạn là AI hỗ trợ học tiếng Anh. Hãy gợi ý ý tưởng thảo luận bằng tiếng Việt, dễ hiểu.",
        },
        {
          role: "user",
          content: `
Chủ đề thảo luận:
${question}

Câu trả lời mẫu:
${sampleAnswer || ""}

Hãy gợi ý:
- Người học nên trả lời theo ý nào
- Một số từ vựng nên dùng
- Một mẫu câu ngắn
`,
        },
      ],
      temperature: 0.4,
    });

    res.json({
      success: true,
      feedback: completion.choices[0]?.message?.content || "AI chưa có gợi ý.",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Không thể gọi AI Discussion",
    });
  }
});

router.post("/check", async (req: Request, res: Response) => {
  try {
    const { question, answer, sampleAnswer } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Bạn là AI sửa bài discussion tiếng Anh cho sinh viên Việt Nam.",
        },
        {
          role: "user",
          content: `
Chủ đề:
${question}

Câu trả lời của người học:
${answer}

Câu trả lời mẫu:
${sampleAnswer || ""}

Hãy phản hồi bằng tiếng Việt:
1. Câu trả lời có đúng chủ đề không
2. Sửa lỗi ngữ pháp/từ vựng
3. Viết lại câu tự nhiên hơn
4. Giải thích ngắn gọn
`,
        },
      ],
      temperature: 0.3,
    });

    res.json({
      success: true,
      feedback: completion.choices[0]?.message?.content || "AI chưa có nhận xét.",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Không thể kiểm tra Discussion",
    });
  }
});

export default router;