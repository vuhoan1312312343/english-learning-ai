import express, { Request, Response } from "express";
import OpenAI from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/hint", async (req: Request, res: Response) => {
  try {
    const { writingType, prompt, sampleAnswer } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: "Missing writing prompt.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a friendly English writing coach for Vietnamese learners. Answer in Vietnamese. Keep it short and practical.",
        },
        {
          role: "user",
          content: `
Writing type: ${writingType || "ESSAY"}
Prompt:
${prompt}

Sample answer:
${sampleAnswer || "No sample answer."}

Help the learner before writing:
1. Give a simple outline
2. Give useful words and phrases
3. Give 3 sentence starters
4. Give a short A1-A2 example
`,
        },
      ],
      temperature: 0.4,
    });

    res.json({
      success: true,
      feedback:
        completion.choices[0]?.message?.content ||
        "AI could not create a writing hint.",
    });
  } catch (error: any) {
    console.error("Writing AI Hint Error:", error?.message || error);

    res.status(500).json({
      success: false,
      message: error?.message || "Cannot call Writing AI.",
    });
  }
});

router.post("/check", async (req: Request, res: Response) => {
  try {
    const { writingType, prompt, answer, sampleAnswer } = req.body;

    if (!prompt || !answer) {
      return res.status(400).json({
        success: false,
        message: "Missing writing prompt or learner answer.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an English writing tutor for Vietnamese learners. Correct kindly and answer in Vietnamese.",
        },
        {
          role: "user",
          content: `
Writing type: ${writingType || "ESSAY"}
Prompt:
${prompt}

Learner answer:
${answer}

Sample answer:
${sampleAnswer || "No sample answer."}

Please respond in Vietnamese:
1. Say what is good
2. Correct grammar and vocabulary mistakes
3. Rewrite the answer naturally at a basic level
4. Give one short tip for the next writing
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
    console.error("Writing AI Check Error:", error?.message || error);

    res.status(500).json({
      success: false,
      message: error?.message || "Cannot call Writing AI.",
    });
  }
});

export default router;
