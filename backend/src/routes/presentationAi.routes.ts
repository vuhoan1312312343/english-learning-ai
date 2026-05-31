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
        message: "Missing presentation topic.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a friendly English presentation coach for Vietnamese learners. Answer in Vietnamese. Keep guidance short, basic, and easy to follow.",
        },
        {
          role: "user",
          content: `
Presentation topic:
${question}

Sample presentation:
${sampleAnswer || "No sample answer."}

Help the learner with:
1. A simple outline: opening, 2-3 main ideas, closing
2. Useful words and phrases for this topic
3. Sentence starters they can copy and adapt
4. A short example presentation at A1-A2 level
`,
        },
      ],
      temperature: 0.4,
    });

    res.json({
      success: true,
      feedback:
        completion.choices[0]?.message?.content ||
        "AI could not create a hint.",
    });
  } catch (error: any) {
    console.error("Presentation AI Hint Error:", error?.message || error);

    res.status(500).json({
      success: false,
      message: error?.message || "Cannot call Presentation AI.",
    });
  }
});

router.post("/check", async (req: Request, res: Response) => {
  try {
    const { question, answer, sampleAnswer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Missing topic or learner answer.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an English presentation coach for Vietnamese learners. Correct kindly and answer in Vietnamese.",
        },
        {
          role: "user",
          content: `
Presentation topic:
${question}

Learner presentation:
${answer}

Sample presentation:
${sampleAnswer || "No sample answer."}

Please respond in Vietnamese:
1. Say what is good in the presentation
2. Point out grammar or vocabulary mistakes
3. Rewrite the presentation naturally at a basic level
4. Give one speaking tip to make it clearer
`,
        },
      ],
      temperature: 0.3,
    });

    res.json({
      success: true,
      feedback:
        completion.choices[0]?.message?.content ||
        "AI could not create feedback.",
    });
  } catch (error: any) {
    console.error("Presentation AI Check Error:", error?.message || error);

    res.status(500).json({
      success: false,
      message: error?.message || "Cannot call Presentation AI.",
    });
  }
});

export default router;
