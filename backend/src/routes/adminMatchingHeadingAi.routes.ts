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
        message: "Please enter a topic or reading text first.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You create Matching Headings reading exercises for Vietnamese English learners. Return valid JSON only.",
        },
        {
          role: "user",
          content: `
Create one Heading Match exercise for level ${level || "A1"}.

Admin input:
${prompt}

Requirements:
- Create a short reading text if the input is only a topic.
- Create exactly 3 heading options.
- One heading must best match the main idea.
- Wrong headings should be plausible but clearly not the main idea.
- Add a short Vietnamese explanation.

Return JSON exactly like this:
{
  "readingText": "Tom has a dog. He plays with it every day. The dog is his best friend.",
  "headings": ["Tom's favorite pet", "A day at school", "Food for dogs"],
  "correctAnswer": 0,
  "explanation": "Đoạn văn nói chủ yếu về chú chó của Tom."
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
      !Array.isArray(parsed.headings) ||
      parsed.headings.length !== 3 ||
      typeof parsed.correctAnswer !== "number" ||
      parsed.correctAnswer < 0 ||
      parsed.correctAnswer > 2
    ) {
      return res.status(500).json({
        success: false,
        message: "AI returned invalid heading match data.",
      });
    }

    res.json({
      success: true,
      data: {
        readingText: String(parsed.readingText),
        headings: parsed.headings.map((heading: unknown) => String(heading)),
        correctAnswer: parsed.correctAnswer,
        explanation: parsed.explanation ? String(parsed.explanation) : "",
      },
    });
  } catch (error: any) {
    console.error("Admin Matching Heading AI Generate Error:", error?.message || error);

    res.status(500).json({
      success: false,
      message: error?.message || "Cannot generate heading match with AI.",
    });
  }
});

export default router;
