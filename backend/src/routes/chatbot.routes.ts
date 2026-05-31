import express, { Request, Response } from "express";
import OpenAI from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 20000,
});

type ClientChatMessage = {
  role?: unknown;
  content?: unknown;
};

const MAX_MESSAGE_LENGTH = 1200;
const MAX_HISTORY_ITEMS = 8;

const SYSTEM_PROMPT = `
Bạn là trợ lý AI học tiếng Anh của LingoUp dành cho người Việt.

Nhiệm vụ chính:
- Giải thích từ vựng, ngữ pháp, giao tiếp, phát âm và luyện viết tiếng Anh.
- Nếu người học viết câu tiếng Anh sai, hãy sửa câu đúng và giải thích lỗi thật ngắn.
- Nếu người học hỏi cách học, hãy đưa lộ trình đơn giản, dễ làm.
- Nếu người học yêu cầu ví dụ, hãy cho ví dụ tiếng Anh kèm nghĩa tiếng Việt.

Quy tắc trả lời:
- Luôn trả lời bằng tiếng Việt, trừ phần ví dụ/câu mẫu tiếng Anh.
- Trả lời ngắn gọn, thân thiện, dễ hiểu cho học sinh.
- Ưu tiên cấu trúc rõ ràng: "Câu đúng", "Vì sao", "Ví dụ".
- Không bịa thông tin về tài khoản, điểm số hoặc dữ liệu hệ thống.
`.trim();

const fallbackReply = (message: string) => {
  const lower = message.toLowerCase();

  if (lower.includes("grammar") || lower.includes("ngữ pháp")) {
    return "Mình có thể giúp bạn sửa ngữ pháp. Hãy gửi một câu tiếng Anh, mình sẽ sửa câu đúng và giải thích lỗi ngắn gọn nhé.";
  }

  if (lower.includes("vocabulary") || lower.includes("từ vựng")) {
    return "Bạn có thể gửi một từ hoặc chủ đề. Mình sẽ giải thích nghĩa, cách dùng và cho ví dụ tiếng Anh đơn giản.";
  }

  if (lower.includes("viết") || lower.includes("writing")) {
    return "Hãy gửi đoạn bạn viết. Mình sẽ sửa lỗi, gợi ý câu tự nhiên hơn và cho bạn một phiên bản mẫu.";
  }

  return "Mình đang gặp sự cố kết nối AI tạm thời. Bạn hãy gửi câu hỏi tiếng Anh, từ vựng hoặc đoạn viết cần sửa, mình sẽ hỗ trợ theo cách ngắn gọn và dễ hiểu nhất.";
};

const normalizeMessage = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_MESSAGE_LENGTH);
};

const normalizeHistory = (history: unknown) => {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item: ClientChatMessage) => item?.role === "user" || item?.role === "bot")
    .slice(-MAX_HISTORY_ITEMS)
    .map((item: ClientChatMessage) => ({
      role: item.role === "user" ? "user" as const : "assistant" as const,
      content: normalizeMessage(item.content),
    }))
    .filter((item) => item.content.length > 0);
};

router.post("/", async (req: Request, res: Response) => {
  const message = normalizeMessage(req.body?.message);
  const history = normalizeHistory(req.body?.history);

  if (!message) {
    return res.status(400).json({
      success: false,
      reply: "Bạn hãy nhập câu hỏi trước nhé.",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.json({
      success: true,
      fallback: true,
      reply: fallbackReply(message),
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHATBOT_MODEL || "gpt-4.1-mini",
      temperature: 0.4,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...history,
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    res.json({
      success: true,
      reply: reply || fallbackReply(message),
    });
  } catch (error: any) {
    console.error("Chatbot error:", error?.message || error);

    res.status(200).json({
      success: true,
      fallback: true,
      reply: fallbackReply(message),
    });
  }
});

export default router;
