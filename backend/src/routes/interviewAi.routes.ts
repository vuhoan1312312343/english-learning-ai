import express, { Request, Response } from "express";
import OpenAI from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/hint", async (req: Request, res: Response) => {
  try {
    const { question, sampleAnswer } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Thiếu câu hỏi Interview",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Bạn là trợ lý AI học tiếng Anh cho sinh viên Việt Nam. Hãy gợi ý cách trả lời, không viết hộ toàn bộ đáp án.",
        },
        {
          role: "user",
          content: `
Câu hỏi Interview:
${question}

Câu trả lời mẫu:
${sampleAnswer || "Không có"}

Hãy gợi ý bằng tiếng Việt:
- Người học nên trả lời theo ý nào
- Nên dùng cấu trúc câu nào
- Cho 1 ví dụ ngắn nhưng không quá dài
`,
        },
      ],
      temperature: 0.4,
    });

    res.json({
      success: true,
      feedback:
        completion.choices[0]?.message?.content || "AI chưa tạo được gợi ý.",
    });
  } catch (error: any) {
    console.error("Interview AI Hint Error:", error?.message || error);

    res.status(500).json({
      success: false,
      message: error?.message || "Không thể gọi AI gợi ý Interview",
    });
  }
});

router.post("/check", async (req: Request, res: Response) => {
  try {
    const { question, answer, sampleAnswer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Thiếu câu hỏi hoặc câu trả lời của người học",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Bạn là trợ lý AI sửa lỗi tiếng Anh. Hãy nhận xét thân thiện, dễ hiểu, phù hợp người Việt học tiếng Anh.",
        },
        {
          role: "user",
          content: `
Câu hỏi Interview:
${question}

Câu trả lời của người học:
${answer}

Câu trả lời mẫu:
${sampleAnswer || "Không có"}

Hãy phản hồi bằng tiếng Việt theo cấu trúc:
1. Nhận xét câu trả lời đúng ý chưa
2. Chỉ ra lỗi ngữ pháp/từ vựng nếu có
3. Viết lại câu trả lời tự nhiên hơn
4. Giải thích ngắn gọn vì sao sửa như vậy
`,
        },
      ],
      temperature: 0.3,
    });

    res.json({
      success: true,
      feedback:
        completion.choices[0]?.message?.content || "AI chưa tạo được nhận xét.",
    });
  } catch (error: any) {
    console.error("Interview AI Check Error:", error?.message || error);

    res.status(500).json({
      success: false,
      message: error?.message || "Không thể gọi AI kiểm tra Interview",
    });
  }
});

export default router;