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
        message: "Please enter a topic or summary idea first.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You create Summary Completion exercises for Vietnamese English learners. Return valid JSON only.",
        },
        {
          role: "user",
          content: `
Create one Summary Builder exercise for level ${level || "A1"}.

Admin input:
${prompt}

Requirements:
- Create one short summary sentence or two short sentences.
- Put one blank as exactly: ____
- Create exactly 4 word choices.
- One word must correctly complete the blank.
- Wrong words should be plausible but clearly wrong for beginners.
- Add a short Vietnamese explanation.

Return JSON exactly like this:
{
  "summaryText": "Tom has a dog. His dog is ____.",
  "choices": ["friendly", "school", "blue", "rice"],
  "correctAnswer": 0,
  "explanation": "Câu cần một tính từ mô tả con chó."
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
      !parsed.summaryText ||
      !Array.isArray(parsed.choices) ||
      parsed.choices.length !== 4 ||
      typeof parsed.correctAnswer !== "number" ||
      parsed.correctAnswer < 0 ||
      parsed.correctAnswer > 3
    ) {
      return res.status(500).json({
        success: false,
        message: "AI returned invalid summary completion data.",
      });
    }

    res.json({
      success: true,
      data: {
        summaryText: String(parsed.summaryText),
        choices: parsed.choices.map((choice: unknown) => String(choice)),
        correctAnswer: parsed.correctAnswer,
        explanation: parsed.explanation ? String(parsed.explanation) : "",
      },
    });
  } catch (error: any) {
    console.error("Admin Summary Completion AI Generate Error:", error?.message || error);

    res.status(500).json({
      success: false,
      message: error?.message || "Cannot generate summary completion with AI.",
    });
  }
});

export default router;
