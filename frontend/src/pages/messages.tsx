import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomBar } from "~/components/BottomBar";
import { LeftBar } from "~/components/LeftBar";
import { useAuth } from "~/hooks/useAuth";
import { messageAPI } from "~/utils/api";

const POLL_INTERVAL_MS = 3000;

type ChatUser = {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
};

type Conversation = {
  _id: string;
  participants: ChatUser[];
  otherParticipant?: ChatUser | null;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type Message = {
  _id: string;
  conversationId: string;
  content: string;
  clientMessageId?: string;
  senderId?: ChatUser | null;
  createdAt: string;
  updatedAt: string;
};

type ConversationsResponse = {
  data?: {
    conversations?: Conversation[];
  };
};

type MessagesResponse = {
  data?: {
    conversation?: Conversation;
    messages?: Message[];
  };
};

type OpenConversationResponse = {
  data?: {
    conversation?: Conversation;
  };
};

const dedupeConversations = (items: Conversation[]) => {
  const seen = new Set<string>();
  return items.filter((conversation) => {
    const key = conversation.otherParticipant?._id ?? conversation._id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const dedupeMessages = (items: Message[]) => {
  const seen = new Set<string>();
  return items.filter((message) => {
    const key = message.clientMessageId ?? message._id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const MessagesPage: NextPage = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const sendingRef = useRef(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [openingConversation, setOpeningConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMobileConversation, setShowMobileConversation] = useState(false);

  const currentUserId = user?.id ?? "";
  const targetUserId = typeof router.query.userId === "string" ? router.query.userId : null;

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation._id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const selectedPartner = selectedConversation?.otherParticipant ?? null;
  const showConversationListOnMobile = !showMobileConversation;

  const loadConversations = async (preferredConversationId?: string) => {
    try {
      setLoadingConversations(true);
      setError(null);
      const response = (await messageAPI.getConversations()) as ConversationsResponse;
      const nextConversations = dedupeConversations(response.data?.conversations ?? []);
      setConversations(nextConversations);
      setSelectedConversationId((currentSelectedId) => {
        const nextSelectedId = preferredConversationId ?? currentSelectedId;
        const exists = nextConversations.some((conversation) => conversation._id === nextSelectedId);
        if (exists) return nextSelectedId ?? null;
        return nextConversations[0]?._id ?? null;
      });
    } catch {
      setError("Unable to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      setError(null);
      const response = (await messageAPI.getMessages(conversationId)) as MessagesResponse;
      setMessages(dedupeMessages(response.data?.messages ?? []));
      const conversation = response.data?.conversation;
      if (conversation) {
        setConversations((current) => {
          const exists = current.some((item) => item._id === conversation._id);
          const next = !exists
            ? [conversation, ...current]
            : current.map((item) => (item._id === conversation._id ? conversation : item));
          return dedupeConversations(next);
        });
      }
    } catch {
      setError("Unable to load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadConversations();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !targetUserId || targetUserId === currentUserId) return;
    void (async () => {
      try {
        setOpeningConversation(true);
        setError(null);
        const response = (await messageAPI.openConversation(targetUserId)) as OpenConversationResponse;
        const conversation = response.data?.conversation;
        if (!conversation?._id) return;

        setSelectedConversationId(conversation._id);
        setShowMobileConversation(true);
        await loadConversations(conversation._id);
        await loadMessages(conversation._id);
      } catch {
        setError("Unable to open conversation");
      } finally {
        setOpeningConversation(false);
      }
    })();
  }, [isAuthenticated, targetUserId, currentUserId]);

  useEffect(() => {
    if (!isAuthenticated || !selectedConversationId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedConversationId);
  }, [isAuthenticated, selectedConversationId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const intervalId = window.setInterval(() => {
      void loadConversations(selectedConversationId ?? undefined);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [isAuthenticated, selectedConversationId]);

  useEffect(() => {
    if (!isAuthenticated || !selectedConversationId) return;
    const intervalId = window.setInterval(() => {
      void loadMessages(selectedConversationId);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [isAuthenticated, selectedConversationId]);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!selectedConversationId || !content || sendingRef.current) return;

    const clientMessageId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      sendingRef.current = true;
      setSending(true);
      setError(null);
      await messageAPI.sendMessage(selectedConversationId, content, clientMessageId);
      setInput("");
      await Promise.all([
        loadMessages(selectedConversationId),
        loadConversations(selectedConversationId),
      ]);
    } catch {
      setError("Failed to send message");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <LeftBar selectedTab={null} />
        <main className="min-h-screen px-4 pb-28 pt-12 md:ml-24 md:px-6 md:pt-16 lg:ml-64 lg:px-8 lg:pt-20">
          <div className="mx-auto flex max-w-3xl items-center justify-center">
          <div className="w-full rounded-3xl border-2 border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
            <p className="mt-3 text-sm text-gray-500">Sign in to use direct messages.</p>
            <Link
              href="/register"
              className="mt-6 inline-flex rounded-2xl border-b-4 border-blue-500 bg-[#1cb0f6] px-5 py-3 text-sm font-bold uppercase text-white transition hover:brightness-110"
            >
              Sign In / Register
            </Link>
          </div>
          </div>
        </main>
        <BottomBar selectedTab={null} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <LeftBar selectedTab={null} />
      <main className="min-w-0 px-4 pb-28 pt-12 md:ml-24 md:px-6 md:pt-16 lg:ml-64 lg:px-8 lg:pt-20">
        <div className="mx-auto min-w-0 w-full max-w-6xl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <section className="grid min-w-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            className={[
              "min-w-0 rounded-3xl border-2 border-gray-200 bg-white p-3 shadow-sm",
              showConversationListOnMobile ? "block" : "hidden lg:block",
            ].join(" ")}
          >
            <div className="mb-3 flex items-center justify-between px-2 pt-1">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Conversations</h2>
              {loadingConversations || openingConversation ? (
                <span className="text-xs text-gray-400">Loading...</span>
              ) : null}
            </div>

            <div className="flex max-h-[calc(100vh-16rem)] min-h-[18rem] flex-col gap-2 overflow-y-auto pr-1 lg:max-h-[70vh]">
              {conversations.length === 0 && !loadingConversations && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
                  No conversations yet.
                </div>
              )}

              {conversations.map((conversation) => {
                const otherUser = conversation.otherParticipant;
                const initial = (otherUser?.name ?? otherUser?.email ?? "?").charAt(0).toUpperCase();
                const isSelected = conversation._id === selectedConversationId;

                return (
                  <button
                    key={conversation._id}
                    type="button"
                    onClick={() => {
                      setSelectedConversationId(conversation._id);
                      setShowMobileConversation(true);
                    }}
                    className={[
                      "flex items-start gap-3 rounded-2xl border p-3 text-left transition",
                      isSelected
                        ? "border-[#84d8ff] bg-[#ddf4ff]"
                        : "border-gray-100 bg-white hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {otherUser?.avatar ? (
                      <img
                        src={otherUser.avatar}
                        alt={otherUser.name}
                        className="h-12 w-12 shrink-0 rounded-full border border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ddf4ff] text-sm font-bold text-blue-500">
                        {initial}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-gray-800">{otherUser?.name ?? "User"}</p>
                        <span className="shrink-0 text-[10px] text-gray-400">
                          {conversation.lastMessage?.createdAt
                            ? new Date(conversation.lastMessage.createdAt).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                      <p className="truncate text-xs text-gray-500">
                        {conversation.lastMessage?.content ?? "No messages yet"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section
            className={[
              "min-w-0 flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border-2 border-gray-200 bg-white shadow-sm",
              showConversationListOnMobile ? "hidden lg:flex" : "flex",
            ].join(" ")}
          >
            {selectedConversation ? (
              <>
                <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
                  <button
                    type="button"
                    onClick={() => setShowMobileConversation(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-500 transition hover:bg-gray-50 md:hidden"
                    aria-label="Back to conversations"
                  >
                    ←
                  </button>

                  {selectedPartner?.avatar ? (
                    <img
                      src={selectedPartner.avatar}
                      alt={selectedPartner.name}
                      className="h-12 w-12 rounded-full border border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ddf4ff] text-sm font-bold text-blue-500">
                      {(selectedPartner?.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-gray-800">{selectedPartner?.name ?? "User"}</p>
                    <p className="truncate text-xs text-gray-400">{selectedPartner?.email ?? "Direct conversation"}</p>
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-3 overflow-y-auto bg-white px-3 py-4 sm:px-4">
                  {loadingMessages && messages.length === 0 && (
                    <div className="text-sm text-gray-400">Loading messages...</div>
                  )}

                  {!loadingMessages && messages.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
                      No messages yet. Start the conversation.
                    </div>
                  )}

                  {messages.map((message) => {
                    const isMine = message.senderId?._id === currentUserId;
                    return (
                      <div
                        key={message._id}
                        className={[
                          "flex",
                          isMine ? "justify-end" : "justify-start",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "max-w-[88%] rounded-3xl px-4 py-3 text-sm shadow-sm sm:max-w-[78%]",
                            isMine
                              ? "bg-[#1cb0f6] text-white"
                              : "border border-gray-200 bg-white text-gray-700",
                          ].join(" ")}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className={[
                            "mt-1 text-[10px]",
                            isMine ? "text-blue-100" : "text-gray-400",
                          ].join(" ")}>
                            {new Date(message.createdAt).toLocaleString("en-US")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomAnchorRef} />
                </div>

                <div className="border-t border-gray-100 p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                      placeholder="Type a message..."
                      className="h-12 flex-1 rounded-2xl border-2 border-gray-200 px-4 text-sm outline-none transition focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={sending || !input.trim()}
                      className="h-12 rounded-2xl border-b-4 border-blue-500 bg-[#1cb0f6] px-5 text-sm font-bold uppercase text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-gray-400">
                Select a conversation to start messaging.
              </div>
            )}
          </section>
        </section>
        </div>
      </main>
      <BottomBar selectedTab={null} />
    </div>
  );
};

export default MessagesPage;