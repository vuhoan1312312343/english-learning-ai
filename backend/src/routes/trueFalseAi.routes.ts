import express from "express";
import OpenAI from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/explain", async (req, res) => {
  try {
    const { question, correctAnswer, userAnswer } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Missing question",
      });
    }

    const prompt = `
Bạn là AI giáo viên tiếng Anh.

Câu hỏi:
"${question}"

Đáp án đúng:
${correctAnswer ? "True" : "False"}

Người dùng chọn:
${userAnswer ? "True" : "False"}

Hãy:
1. Nói đáp án đúng
2. Giải thích ngắn gọn bằng tiếng Việt
3. Nếu câu sai thì sửa lại câu đúng
4. Dễ hiểu cho trình độ A1-A2
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const explanation =
      completion.choices[0]?.message?.content ||
      "Không có giải thích.";

    res.json({
      success: true,
      explanation,
    });
  } catch (error) {
    console.error("TRUE FALSE AI ERROR:", error);

    res.status(500).json({
      success: false,
      message: "AI Error",
    });
  }
});

export default router;