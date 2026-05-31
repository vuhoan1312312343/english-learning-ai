import type { NextPage } from "next";
import { useEffect, useRef, useState } from "react";
import { BottomBar } from "~/components/BottomBar";
import { LeftBar } from "~/components/LeftBar";
import { RightBar } from "~/components/RightBar";
import { useAuth } from "~/hooks/useAuth";
import { api } from "~/utils/api";

type ChatMessage = {
  id: number;
  role: "user" | "bot";
  content: string;
};

const defaultMessages: ChatMessage[] = [
  {
    id: 1,
    role: "bot",
    content:
      "Xin chào. Mình là trợ lý AI của LingoUp. Bạn có thể hỏi mình về từ vựng, ngữ pháp, giao tiếp hoặc gửi câu tiếng Anh để mình sửa giúp.",
  },
];

const suggestedPrompts = [
  "Gợi ý lộ trình học từ vựng A1",
  "Tạo đoạn hội thoại tiếng Anh đơn giản",
  "Sửa câu này giúp tôi: I very like English",
  "Cho tôi 5 câu giao tiếp khi đi du lịch",
];

const MAX_HISTORY_ITEMS = 8;

const renderMessageContent = (content: string) => {
  return content.split("\n").map((line, index) => (
    <span key={`${line}-${index}`}>
      {line}
      {index < content.split("\n").length - 1 ? <br /> : null}
    </span>
  ));
};

const ChatbotPage: NextPage = () => {
  const { user } = useAuth();

  const [input, setInput] = useState("");
  const [messages, setMessages] =
    useState<ChatMessage[]>(defaultMessages);
  const [isSending, setIsSending] = useState(false);

  const bottomAnchorRef =
    useRef<HTMLDivElement | null>(null);

  const storageKey = `lingoup-chatbot-history:${
    user?.id ?? "guest"
  }`;

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedHistory =
        localStorage.getItem(storageKey);

      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      setMessages(defaultMessages);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem(
      storageKey,
      JSON.stringify(messages.slice(-30))
    );
  }, [messages, storageKey]);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isSending]);

  const handleSend = async (nextInput?: string) => {
    const value = (nextInput ?? input).trim();

    if (!value || isSending) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: value,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const response = await api.post("/api/chatbot", {
        message: value,
        history: messages
          .filter((message) => message.id !== 1)
          .slice(-MAX_HISTORY_ITEMS),
      });

      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "bot",
        content:
          response.data?.reply ||
          "Mình chưa tạo được phản hồi. Bạn thử hỏi lại ngắn hơn nhé.",
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "bot",
        content:
          "Mình đang gặp lỗi kết nối. Bạn kiểm tra backend hoặc API key rồi thử lại nhé.",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleUsePrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleClearHistory = () => {
    setMessages(defaultMessages);
  };

  return (
    <div className="min-h-screen bg-white">
      <LeftBar selectedTab="Chatbot" />

      <div className="flex justify-center gap-3 pt-14 sm:px-6 sm:pt-10 md:ml-24 md:gap-6 lg:ml-64 lg:gap-10 xl:px-8">
        <main className="w-full max-w-4xl px-4 pb-28 sm:px-5 lg:ml-4 lg:px-0 xl:ml-6">
          <section className="overflow-hidden rounded-[28px] border-2 border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <span className="rounded-full bg-[#ddf4ff] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#1493d1]">
                  LingoUp Assistant
                </span>
                <p className="mt-2 text-xs font-semibold text-gray-400">
                  Hỏi từ vựng, sửa câu, luyện hội thoại và gợi ý cách học.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClearHistory}
                className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-500 hover:bg-gray-50"
              >
                Xóa lịch sử
              </button>
            </div>

            <div className="flex h-[48vh] min-h-[320px] max-h-[560px] flex-col gap-4 overflow-y-auto bg-white px-4 py-5 sm:h-[52vh] sm:min-h-[420px] sm:px-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={[
                    "flex max-w-[88%] flex-col gap-1",
                    message.role === "user"
                      ? "self-end items-end"
                      : "self-start items-start",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "px-1 text-[11px] font-bold uppercase tracking-[0.18em]",
                      message.role === "user"
                        ? "text-[#1493d1]"
                        : "text-[#6e7787]",
                    ].join(" ")}
                  >
                    {message.role === "user"
                      ? "Bạn"
                      : "Trợ lý"}
                  </span>

                  <div
                    className={[
                      "rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm",
                      message.role === "user"
                        ? "bg-[#1cb0f6] text-white"
                        : "border border-gray-200 bg-[#f8fbff] text-gray-700",
                    ].join(" ")}
                  >
                    {renderMessageContent(message.content)}
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="self-start rounded-[24px] border border-gray-200 bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-gray-500 shadow-sm">
                  Trợ lý đang suy nghĩ...
                </div>
              )}

              <div ref={bottomAnchorRef} />
            </div>

            <div className="border-t border-gray-100 bg-white p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleUsePrompt(prompt)}
                    className="rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <textarea
                  value={input}
                  onChange={(e) =>
                    setInput(e.target.value.slice(0, 1200))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Nhập câu hỏi của bạn..."
                  rows={1}
                  disabled={isSending}
                  className="min-h-12 flex-1 resize-none rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm outline-none disabled:bg-gray-50"
                />

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isSending}
                  className="h-12 rounded-2xl border-b-4 border-blue-600 bg-[#1cb0f6] px-5 text-sm font-black uppercase tracking-wide text-white disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-400"
                >
                  {isSending ? "Đang gửi" : "Gửi"}
                </button>
              </div>
            </div>
          </section>
        </main>

        <RightBar hideGuestAuthCard />
      </div>

      <BottomBar selectedTab="Chatbot" />
    </div>
  );
};

export default ChatbotPage;
