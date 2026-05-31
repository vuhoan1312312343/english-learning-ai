import express, { Request, Response } from "express";
import OpenAI from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/hint", async (req: Request, res: Response) => {
  try {
    const { question, headings, selectedHeading } = req.body;

    if (!question || !Array.isArray(headings) || headings.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing passage or heading options.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a reading coach for Vietnamese English learners. Do not simply give the answer. Teach a simple strategy in Vietnamese.",
        },
        {
          role: "user",
          content: `
Reading text:
${question}

Heading options:
${headings.map((heading: string, index: number) => `${index + 1}. ${heading}`).join("\n")}

Learner selected:
${selectedHeading || "No selection yet"}

Help the learner:
1. Find 2-3 keywords in the text
2. Explain the main idea in Vietnamese
3. Give a hint about which heading is closest, without just saying "choose number X"
4. Explain one common trap
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
    console.error("Matching Heading AI Hint Error:", error?.message || error);

    res.status(500).json({
      success: false,
      message: error?.message || "Cannot call Matching Heading AI.",
    });
  }
});

export default router;
