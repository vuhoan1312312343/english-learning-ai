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
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a friendly English tutor for Vietnamese learners. Answer in Vietnamese. Keep guidance short, basic, and practical.",
        },
        {
          role: "user",
          content: `
Describe picture task:
${question || "Describe the picture in 2-3 simple English sentences."}

Sample description:
${sampleAnswer || "No sample answer."}

Please give:
1. What the learner should look at first
2. 8-10 useful English words or phrases
3. 3 simple sentence patterns
4. A short example answer
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
    console.error("Describe Picture AI Hint Error:", error?.message || error);

    res.status(500).json({
      success: false,
      message: error?.message || "Cannot call Describe Picture AI.",
    });
  }
});

router.post("/check", async (req: Request, res: Response) => {
  try {
    const { question, answer, sampleAnswer } = req.body;

    if (!answer || typeof answer !== "string" || !answer.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please write your picture description first.",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an English writing tutor for Vietnamese learners. Correct picture descriptions gently. Answer in Vietnamese.",
        },
        {
          role: "user",
          content: `
Describe picture task:
${question || "Describe the picture in English."}

Learner answer:
${answer}

Sample description:
${sampleAnswer || "No sample answer."}

Please respond in Vietnamese:
1. Say if the answer is understandable
2. Correct grammar and vocabulary mistakes
3. Rewrite the answer naturally at a basic level
4. Give one short tip for the next attempt
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
    console.error("Describe Picture AI Check Error:", error?.message || error);

    res.status(500).json({
      success: false,
      message: error?.message || "Cannot call Describe Picture AI.",
    });
  }
});

export default router;
