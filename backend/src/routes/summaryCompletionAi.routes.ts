import express, { Request, Response } from "express";
import OpenAI from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/hint", async (req: Request, res: Response) => {
  try {
    const { summaryText, choices, selectedWords } = req.body;

    if (!summaryText || !Array.isArray(choices) || choices.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing summary text or word choices.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a reading and vocabulary coach for Vietnamese English learners. Do not simply give the answer. Teach a short strategy in Vietnamese.",
        },
        {
          role: "user",
          content: `
Summary completion text:
${summaryText}

Word choices:
${choices.map((choice: string, index: number) => `${index + 1}. ${choice}`).join("\n")}

Learner selected:
${Array.isArray(selectedWords) && selectedWords.length > 0 ? selectedWords.join(" ") : "No words selected yet"}

Help the learner:
1. Explain the main meaning of the summary in Vietnamese
2. Find the clue before and after the blank
3. Explain what kind of word is needed
4. Give a hint, but do not directly say the final answer
`,
        },
      ],
      temperature: 0.35,
    });

    res.json({
      success: true,
      feedback:
        completion.choices[0]?.message?.content ||
        "AI could not create a hint.",
    });
  } catch (error: any) {
    console.error("Summary Completion AI Hint Error:", error?.message || error);

    res.status(500).json({
      success: false,
      message: error?.message || "Cannot call Summary Completion AI.",
    });
  }
});

export default router;
