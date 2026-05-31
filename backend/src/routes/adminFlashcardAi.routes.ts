import express, { Request, Response } from "express";
import OpenAI from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { prompt, level } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter a word, topic, or question first.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You create simple English vocabulary flashcard questions for Vietnamese learners. Return valid JSON only.",
        },
        {
          role: "user",
          content: `
Create one simple multiple-choice flashcard question for level ${level || "A1"}.

Input from admin:
${prompt}

Requirements:
- Make the question short and clear.
- Create exactly 3 answer options.
- One option must be correct.
- Wrong options should be plausible but clearly wrong for beginners.
- Add one short Vietnamese explanation.
- Add one short English example sentence using the correct answer.

Return JSON exactly like this:
{
  "question": "What color is the sky?",
  "answers": ["Blue", "Green", "Red"],
  "correctAnswer": 0,
  "explanation": "Bầu trời thường có màu xanh.",
  "example": "The sky is blue."
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
      !parsed.question ||
      !Array.isArray(parsed.answers) ||
      parsed.answers.length !== 3 ||
      typeof parsed.correctAnswer !== "number" ||
      parsed.correctAnswer < 0 ||
      parsed.correctAnswer > 2
    ) {
      return res.status(500).json({
        success: false,
        message: "AI returned invalid flashcard data.",
      });
    }

    res.json({
      success: true,
      data: {
        question: String(parsed.question),
        answers: parsed.answers.map((answer: unknown) => String(answer)),
        correctAnswer: parsed.correctAnswer,
        explanation: parsed.explanation ? String(parsed.explanation) : "",
        example: parsed.example ? String(parsed.example) : "",
      },
    });
  } catch (error: any) {
    console.error("Admin Flashcard AI Generate Error:", error?.message || error);

    res.status(500).json({
      success: false,
      message: error?.message || "Cannot generate flashcard with AI.",
    });
  }
});

export default router;
