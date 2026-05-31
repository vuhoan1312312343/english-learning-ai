import { type NextPage } from "next";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLoginScreen, LoginScreen } from "~/components/LoginScreen";
import { LeftBar } from "~/components/LeftBar";
import { BottomBar } from "~/components/BottomBar";
import { UsersRightBar } from "~/components/UsersRightBar";
import { useBoundStore } from "~/hooks/useBoundStore";
import { useAuth } from "~/hooks/useAuth";
import { postAPI } from "~/utils/api";
import { getLevelBadgeClassName, normalizeLevel } from "~/utils/level-badge";
import { buildAvatarUrl } from "~/utils/avatar";

const ImageAddIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden={true}>
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M3 15l5-5 4 4 3-3 6 5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
  </svg>
);

const VisibilityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden={true}>
    <path d="M2 12C3.73 8.11 7.52 5.5 12 5.5C16.48 5.5 20.27 8.11 22 12C20.27 15.89 16.48 18.5 12 18.5C7.52 18.5 3.73 15.89 2 12Z" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const LocationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden={true}>
    <path d="M12 21S5 14.5 5 9.5a7 7 0 0 1 14 0C19 14.5 12 21 12 21z" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="9.5" r="2.5" fill="currentColor" />
  </svg>
);

const HeartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden={true}>
    <path d="M12 21C11.5 21 3.5 16.5 3.5 10a5.5 5.5 0 0 1 8.5-4.6A5.5 5.5 0 0 1 20.5 10c0 6.5-8 11-8.5 11z" />
  </svg>
);

const CommentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden={true}>
    <path d="M4 4h16v13H7l-3 3V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const quickPostIdeas = [
  "Hôm nay tôi học được 3 từ mới: ...",
  "Ai giúp tôi sửa câu này được không?",
  "Mục tiêu tiếng Anh tuần này của tôi là ...",
];

const learningActions = [
  {
    title: "Học tiếp",
    description: "Vào bài học đang mở và tích lũy XP.",
    href: "/learn",
    className: "bg-[#58cc02] border-[#46a302] text-white",
  },
  {
    title: "Hỏi AI",
    description: "Nhờ trợ lý sửa câu hoặc gợi ý cách học.",
    href: "/chatbot",
    className: "bg-[#1cb0f6] border-blue-500 text-white",
  },
  {
    title: "Xếp hạng",
    description: "Xem vị trí của bạn trong cộng đồng.",
    href: "/leaderboard",
    className: "bg-amber-400 border-amber-500 text-white",
  },
];

type PostAuthor = {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
};

type FeedPost = {
  _id: string;
  userId: PostAuthor;
  content: string;
  type: "text" | "image" | "mixed" | "question";
  visibility: "public" | "followers" | "private";
  images: string[];
  likesCount: number;
  commentsCount: number;
  isLikedByMe?: boolean;
  comments?: {
    _id: string;
    content: string;
    createdAt: string;
    userId?: PostAuthor;
  }[];
  isPinned: boolean;
  location?: string;
  createdAt: string;
};

const getImageGridClassName = (imageCount: number) => {
  if (imageCount <= 1) return "grid-cols-1";
  return "grid-cols-1 sm:grid-cols-2";
};

const Home: NextPage = () => {
  const { loginScreenState, setLoginScreenState } = useLoginScreen();
  const { isAuthenticated, user } = useAuth();
  const loggedIn = useBoundStore((x) => x.loggedIn);
  const xpToday = useBoundStore((x) => x.xpToday());
  const goalXp = useBoundStore((x) => x.goalXp);
  const streak = useBoundStore((x) => x.streak);
  const lessonsCompleted = useBoundStore((x) => x.lessonsCompleted);

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editLocation, setEditLocation] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "followers" | "private">("public");
  const [editSaving, setEditSaving] = useState(false);

  const [content, setContent] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"public" | "followers" | "private">("public");
  const [location, setLocation] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  const isLoggedIn = isAuthenticated || loggedIn;

  const currentDisplayName = useMemo(() => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split("@")[0] ?? "User";
    return "User";
  }, [user]);

  const loadPosts = async () => {
    try {
      setLoadingPosts(true);
      setFeedError(null);
      const response = await postAPI.getPosts();
      setPosts(response.data?.posts ?? []);
    } catch (error: any) {
      setFeedError(error?.response?.data?.message ?? "Không tải được bảng tin");
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  }, [isLoggedIn]);

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("doc that bai"));
      reader.readAsDataURL(file);
    });

  const handlePickImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    try {
      setFeedError(null);
      const next = await Promise.all(
        selectedFiles.slice(0, 4).map((f) => fileToDataUrl(f)),
      );
      setImages((prev) => [...prev, ...next].slice(0, 4));
    } catch {
      setFeedError("Image upload failed");
    } finally {
      event.target.value = "";
    }
  };

  const handlePickEditImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    try {
      setFeedError(null);
      const remain = Math.max(4 - editImages.length, 0);
      if (remain === 0) return;
      const next = await Promise.all(
        selectedFiles.slice(0, remain).map((f) => fileToDataUrl(f)),
      );
      setEditImages((prev) => [...prev, ...next].slice(0, 4));
    } catch {
      setFeedError("Image upload failed");
    } finally {
      event.target.value = "";
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setCreateLoading(true);
      setFeedError(null);
      const type = images.length > 0 ? "mixed" : "text";
      await postAPI.createPost({
        content: content.trim(),
        type,
        visibility,
        images,
        location: location.trim() || undefined,
      });
      setContent("");
      setImages([]);
      setLocation("");
      setVisibility("public");
      setComposerOpen(false);
      await loadPosts();
    } catch (error: any) {
      setFeedError(error?.response?.data?.message ?? "Đăng bài thất bại");
    } finally {
      setCreateLoading(false);
    }
  };

  const currentAvatar = user?.avatar ?? null;
  const currentAvatarUrl = buildAvatarUrl(currentAvatar);
  const currentUserId = user?.id;

  const startEditingPost = (post: FeedPost) => {
    setEditingPostId(post._id);
    setEditContent(post.content ?? "");
    setEditImages(Array.isArray(post.images) ? post.images : []);
    setEditLocation(post.location ?? "");
    setEditVisibility(post.visibility ?? "public");
  };

  const cancelEditingPost = () => {
    setEditingPostId(null);
    setEditContent("");
    setEditImages([]);
    setEditLocation("");
    setEditVisibility("public");
  };

  const saveEditedPost = async () => {
    if (!editingPostId || !editContent.trim()) return;

    try {
      setEditSaving(true);
      const response = await postAPI.updatePost(editingPostId, {
        content: editContent.trim(),
        visibility: editVisibility,
        images: editImages,
        location: editLocation.trim() || undefined,
      });

      const updatedPost = response.data?.post as FeedPost | null;
      if (updatedPost) {
        setPosts((prev) =>
          prev.map((post) => (post._id === editingPostId ? updatedPost : post)),
        );
      }
      cancelEditingPost();
    } catch {
      setFeedError("Cập nhật bài viết thất bại");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    const confirmed = window.confirm("Bạn có chắc muốn xoá bài viết này?");
    
    if (!confirmed) return;

    try {
      await postAPI.deletePost(postId);
      setPosts((prev) => prev.filter((post) => post._id !== postId));
      if (editingPostId === postId) {
        cancelEditingPost();
      }
    } catch {
      setFeedError("Xóa bài viết thất bại");
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!isLoggedIn) {
      setLoginScreenState("LOGIN");
      return;
    }

    const previousPosts = posts;
    setPosts((prev) =>
      prev.map((post) => {
        if (post._id !== postId) return post;
        const liked = Boolean(post.isLikedByMe);
        return {
          ...post,
          isLikedByMe: !liked,
          likesCount: liked
            ? Math.max((post.likesCount ?? 1) - 1, 0)
            : (post.likesCount ?? 0) + 1,
        };
      }),
    );

    try {
      const response = await postAPI.toggleLike(postId);
      const nextLiked = Boolean(response.data?.liked);
      const nextLikesCount = Number(response.data?.likesCount ?? 0);
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                isLikedByMe: nextLiked,
                likesCount: nextLikesCount,
              }
            : post,
        ),
      );
    } catch {
      setPosts(previousPosts);
    }
  };

  const handleSubmitComment = async (postId: string) => {
    const contentValue = (commentInputs[postId] ?? "").trim();
    if (!contentValue) return;
    if (!isLoggedIn) {
      setLoginScreenState("LOGIN");
      return;
    }

    try {
      setCommentLoading((prev) => ({ ...prev, [postId]: true }));
      const response = await postAPI.addComment(postId, contentValue);
      const comment = response.data?.comment;
      const commentsCount = Number(response.data?.commentsCount ?? 0);

      setPosts((prev) =>
        prev.map((post) => {
          if (post._id !== postId) return post;
          const existingComments = Array.isArray(post.comments) ? post.comments : [];
          return {
            ...post,
            commentsCount,
            comments: comment ? [...existingComments, comment] : existingComments,
          };
        }),
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    } catch {
      setFeedError("Gửi bình luận thất bại");
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <LeftBar selectedTab="Home" />
      <div className="flex justify-center gap-3 pt-14 md:ml-24 md:pt-0 lg:ml-64 lg:gap-12">
        <main className="flex w-full max-w-2xl flex-col gap-5 p-5 pb-28">
          <section className="overflow-hidden rounded-[28px] border-2 border-blue-100 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-[#1cb0f6] via-[#2f80ed] to-[#58cc02] px-5 py-6 text-white sm:px-6">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-50">
                LingoUp Community
              </p>
              <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
                Chào {currentDisplayName}, hôm nay mình học gì?
              </h1>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-blue-50">
                Học một bài ngắn, hỏi AI khi bí ý, rồi chia sẻ điều bạn vừa học với mọi người.
              </p>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-gray-400">XP hôm nay</p>
                <p className="mt-2 text-2xl font-black text-gray-800">{xpToday}/{goalXp}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-gray-400">Chuỗi ngày</p>
                <p className="mt-2 text-2xl font-black text-gray-800">{streak} ngày</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-gray-400">Bài đã học</p>
                <p className="mt-2 text-2xl font-black text-gray-800">{lessonsCompleted}</p>
              </div>
            </div>

            <div className="grid gap-3 border-t border-gray-100 p-4 sm:grid-cols-3">
              {learningActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className={`rounded-2xl border-b-4 px-4 py-3 transition hover:-translate-y-0.5 ${action.className}`}
                >
                  <p className="font-black">{action.title}</p>
                  <p className="mt-1 text-xs font-semibold opacity-90">
                    {action.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {isLoggedIn && (
            <section className="rounded-[24px] border-2 border-gray-200 bg-white p-4 shadow-sm">
            <form className="flex flex-col gap-3" onSubmit={handleCreatePost}>
              <div className="flex items-start gap-3">
                {currentUserId ? (
                  <Link href={`/users/${currentUserId}`} className="shrink-0">
                    {currentAvatarUrl ? (
                      <img
                        src={currentAvatarUrl}
                        alt={currentDisplayName}
                        className="h-10 w-10 rounded-full border-2 border-gray-200 object-cover transition hover:opacity-80"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-sm font-bold text-gray-500 transition hover:opacity-80">
                        {currentDisplayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                ) : currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt={currentDisplayName}
                    className="h-10 w-10 shrink-0 rounded-full border-2 border-gray-200 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-sm font-bold text-gray-500">
                    {currentDisplayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  {!composerOpen ? (
                    <button
                      type="button"
                      onClick={() => setComposerOpen(true)}
                      className="h-11 w-full rounded-full border-2 border-gray-200 bg-gray-50 px-4 text-left text-sm text-gray-400 transition hover:border-[#84d8ff] hover:bg-white"
                    >
                      Chia sẻ điều bạn vừa học, {currentDisplayName}...
                    </button>
                  ) : (
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Viết bài chia sẻ, câu hỏi hoặc mục tiêu học tiếng Anh của bạn..."
                      className="min-h-[120px] w-full rounded-xl border-2 border-gray-200 p-3 text-sm outline-none transition focus:border-blue-400"
                      maxLength={2000}
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {composerOpen && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePickImages}
                    className="hidden"
                  />

                  {images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {images.map((img, i) => (
                        <div key={i} className="relative">
                          <img
                            src={img}
                            alt="preview"
                            className="w-full rounded-xl border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-600 transition hover:bg-[#ddf4ff] hover:text-blue-500"
                    >
                      <ImageAddIcon />
                      Ảnh
                    </button>

                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-600 transition hover:bg-[#ddf4ff] hover:text-blue-500">
                      <VisibilityIcon />
                      <select
                        value={visibility}
                        onChange={(e) =>
                          setVisibility(e.target.value as "public" | "followers" | "private")
                        }
                        className="bg-transparent outline-none"
                      >
                        <option value="public">Công khai</option>
                        <option value="followers">Người theo dõi</option>
                        <option value="private">Riêng tư</option>
                      </select>
                    </label>

                    <label className="inline-flex flex-1 items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-600 transition hover:bg-[#ddf4ff] hover:text-blue-500">
                      <LocationIcon />
                      <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Vị trí"
                        className="w-full bg-transparent outline-none"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {quickPostIdeas.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => setContent(idea)}
                        className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-500 transition hover:bg-blue-100"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (createLoading) return;
                        setComposerOpen(false);
                        setContent("");
                        setImages([]);
                        setLocation("");
                        setVisibility("public");
                      }}
                      className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-bold uppercase text-gray-500 transition hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={createLoading || !content.trim()}
                      className="rounded-xl border-b-4 border-green-700 bg-green-500 px-5 py-2 text-sm font-bold uppercase text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {createLoading ? "Đang đăng..." : "Đăng bài"}
                    </button>
                  </div>
                </>
              )}
            </form>
            </section>
          )}

          {!isLoggedIn && (
            <section className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
              Đăng nhập để chia sẻ bài học, bình luận và theo dõi bạn học khác.
            </section>
          )}

          {feedError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {feedError}
            </div>
          )}

          <section className="flex flex-col gap-4">
            {loadingPosts && (
              <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 text-sm text-gray-500">
                Đang tải bảng tin...
              </div>
            )}

            {!loadingPosts && posts.length === 0 && (
              <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
                Chưa có bài đăng nào. Hãy là người đầu tiên chia sẻ điều bạn học được hôm nay.
              </div>
            )}

            {posts.map((post) => {
              const authorName = post.userId?.name ?? "User";
              const authorLevel = post.userId?.level ?? "A1";
              const authorInitial = authorName.charAt(0).toUpperCase();
              const authorId = post.userId?._id;
              const authorAvatarUrl = buildAvatarUrl(post.userId?.avatar);
              const isOwnPost = Boolean(currentUserId && authorId && currentUserId === authorId);
              const isEditing = editingPostId === post._id;

              return (
                <article
                  key={post._id}
                  className="rounded-[24px] border-2 border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-100 hover:shadow-md"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {authorId ? (
                        <Link href={`/users/${authorId}`} className="shrink-0">
                          {authorAvatarUrl ? (
                            <img
                              src={authorAvatarUrl}
                              alt={authorName}
                              className="h-10 w-10 rounded-full border-2 border-gray-200 object-cover transition hover:opacity-80"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-sm font-bold text-gray-400 transition hover:opacity-80">
                              {authorInitial}
                            </div>
                          )}
                        </Link>
                      ) : authorAvatarUrl ? (
                        <img
                          src={authorAvatarUrl}
                          alt={authorName}
                          className="h-10 w-10 rounded-full border-2 border-gray-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-sm font-bold text-gray-400">
                          {authorInitial}
                        </div>
                      )}
                      <div>
                        {authorId ? (
                          <Link
                            href={`/users/${authorId}`}
                            className="font-bold text-gray-800"
                          >
                            {authorName}
                          </Link>
                        ) : (
                          <span className="font-bold text-gray-800">{authorName}</span>
                        )}
                        <span
                          className={[
                            "ml-2 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                            getLevelBadgeClassName(authorLevel),
                          ].join(" ")}
                        >
                          {normalizeLevel(authorLevel)}
                        </span>
                        <div className="text-xs text-gray-400">
                          {new Date(post.createdAt).toLocaleString("vi-VN")}
                          {post.location ? ` • ${post.location}` : ""}
                        </div>
                      </div>
                    </div>
                    {post.isPinned && (
                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                        Ghim
                      </span>
                    )}
                    {isOwnPost && (
                      <div className="flex items-center gap-2">
                        {!isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditingPost(post)}
                              className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-bold text-gray-500 hover:bg-gray-50"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeletePost(post._id)}
                              className="rounded-lg border border-red-200 px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50"
                            >
                              Xóa
                            </button>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mb-3 space-y-3 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-sky-50/70 p-4">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Cập nhật bài viết của bạn..."
                        className="min-h-[110px] w-full rounded-xl border border-blue-200 bg-white p-3 text-sm outline-none transition focus:border-blue-400"
                      />

                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          void handlePickEditImages(e);
                        }}
                        className="hidden"
                      />

                      {editImages.length > 0 && (
                        <div className={`grid gap-2 ${getImageGridClassName(editImages.length)}`}>
                          {editImages.map((img, i) => (
                            <div key={`${post._id}-edit-${i}`} className="group relative">
                              <img
                                src={img}
                                alt="edit-preview"
                                className="w-full rounded-xl border border-blue-100"
                              />
                              <button
                                type="button"
                                onClick={() => setEditImages((prev) => prev.filter((_, idx) => idx !== i))}
                                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-xs font-bold text-white opacity-90 transition group-hover:opacity-100"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          disabled={editImages.length >= 4}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ImageAddIcon />
                          Thêm ảnh
                        </button>

                        <span className="rounded-full bg-white px-2 py-1 text-[11px] text-gray-500">
                          {editImages.length}/4 ảnh
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          placeholder="Vị trí"
                          className="h-10 rounded-xl border border-blue-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400"
                        />
                        <select
                          value={editVisibility}
                          onChange={(e) =>
                            setEditVisibility(e.target.value as "public" | "followers" | "private")
                          }
                          className="h-10 rounded-xl border border-blue-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400"
                        >
                          <option value="public">Công khai</option>
                          <option value="followers">Người theo dõi</option>
                          <option value="private">Riêng tư</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditingPost}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-500 transition hover:bg-gray-50"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveEditedPost()}
                          disabled={editSaving || !editContent.trim()}
                          className="rounded-xl border-b-4 border-blue-500 bg-[#1cb0f6] px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                        >
                          {editSaving ? "Đang lưu..." : "Lưu"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mb-3 whitespace-pre-line text-sm text-gray-700">{post.content}</p>
                  )}

                  {post.images?.length > 0 && (
                    <div className={`mb-3 grid gap-2 ${getImageGridClassName(post.images.length)}`}>
                      {post.images.map((imageUrl) => (
                        <img
                          key={`${post._id}-${imageUrl}`}
                          src={imageUrl}
                          alt="post"
                          className="w-full rounded-xl border border-gray-200"
                        />
                      ))}
                    </div>
                  )}

                  <footer className="flex items-center gap-4 text-xs text-gray-500">
                    <button
                      type="button"
                      onClick={() => void handleToggleLike(post._id)}
                      className={[
                        "inline-flex items-center gap-1 rounded-full px-2 py-1 transition",
                        post.isLikedByMe
                          ? "bg-pink-50 text-pink-500"
                          : "hover:bg-gray-100",
                      ].join(" ")}
                    >
                      <HeartIcon />
                      {post.likesCount}
                    </button>
                    <span className="inline-flex items-center gap-1">
                      <CommentIcon />
                      {post.commentsCount}
                    </span>
                    <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 uppercase">
                      {post.visibility === "public"
                        ? "Công khai"
                        : post.visibility === "followers"
                          ? "Theo dõi"
                          : "Riêng tư"}
                    </span>
                  </footer>

                  <div className="mt-3 flex gap-2">
                    <input
                      value={commentInputs[post._id] ?? ""}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({
                          ...prev,
                          [post._id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleSubmitComment(post._id);
                        }
                      }}
                      placeholder="Viết bình luận..."
                      className="h-9 flex-1 rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSubmitComment(post._id)}
                      disabled={commentLoading[post._id] || !(commentInputs[post._id] ?? "").trim()}
                      className="rounded-xl border-b-4 border-blue-500 bg-[#1cb0f6] px-3 py-1 text-xs font-bold uppercase text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Gửi
                    </button>
                  </div>

                  {Array.isArray(post.comments) && post.comments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {(expandedComments[post._id]
                        ? post.comments
                        : post.comments.slice(-2)
                      ).map((comment) => {
                        const commentAuthorName = comment.userId?.name ?? "User";
                        const commentAuthorLevel = comment.userId?.level ?? "A1";
                        const commentAvatarUrl = buildAvatarUrl(comment.userId?.avatar);
                        const commentAuthorId = comment.userId?._id;
                        const commentInitial = commentAuthorName.charAt(0).toUpperCase();
                        const commentTime = new Date(comment.createdAt).toLocaleString("vi-VN");

                        return (
                          <div
                            key={comment._id}
                            className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2"
                          >
                            {commentAuthorId ? (
                              <Link href={`/users/${commentAuthorId}`} className="shrink-0">
                                {commentAvatarUrl ? (
                                  <img
                                    src={commentAvatarUrl}
                                    alt={commentAuthorName}
                                    className="h-7 w-7 rounded-full border border-gray-200 object-cover transition hover:opacity-80"
                                  />
                                ) : (
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ddf4ff] text-[10px] font-bold text-blue-500 transition hover:opacity-80">
                                    {commentInitial}
                                  </div>
                                )}
                              </Link>
                            ) : commentAvatarUrl ? (
                              <img
                                src={commentAvatarUrl}
                                alt={commentAuthorName}
                                className="h-7 w-7 shrink-0 rounded-full border border-gray-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ddf4ff] text-[10px] font-bold text-blue-500">
                                {commentInitial}
                              </div>
                            )}

                            <div className="min-w-0 text-xs text-gray-700">
                              <div className="flex items-center gap-2">
                                {commentAuthorId ? (
                                  <Link
                                    href={`/users/${commentAuthorId}`}
                                    className="truncate font-bold text-gray-800"
                                  >
                                    {commentAuthorName}
                                  </Link>
                                ) : (
                                  <span className="truncate font-bold text-gray-800">
                                    {commentAuthorName}
                                  </span>
                                )}
                                <span
                                  className={[
                                    "rounded-full border px-1.5 py-0.5 text-[10px] font-bold",
                                    getLevelBadgeClassName(commentAuthorLevel),
                                  ].join(" ")}
                                >
                                  {normalizeLevel(commentAuthorLevel)}
                                </span>
                                <span className="text-[10px] text-gray-400">{commentTime}</span>
                              </div>
                              <p className="whitespace-pre-wrap">{comment.content}</p>
                            </div>
                          </div>
                        );
                      })}

                      {post.comments.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedComments((prev) => ({
                              ...prev,
                              [post._id]: !prev[post._id],
                            }))
                          }
                          className="px-1 text-xs font-bold text-blue-500 hover:underline"
                        >
                          {expandedComments[post._id]
                            ? "Ẩn bình luận"
                            : `Xem tất cả bình luận (${post.comments.length})`}
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>

        </main>
        <UsersRightBar
          showGuestAuthCard
          onSignupClick={() => setLoginScreenState("SIGNUP")}
          onLoginClick={() => setLoginScreenState("LOGIN")}
        />
      </div>

      <LoginScreen
        loginScreenState={loginScreenState}
        setLoginScreenState={setLoginScreenState}
      />
      <BottomBar selectedTab="Home" />
    </div>
  );
};

export default Home;
