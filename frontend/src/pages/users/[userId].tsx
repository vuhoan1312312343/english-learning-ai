import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type ChangeEvent } from "react";
import dayjs from "dayjs";
import { LeftBar } from "~/components/LeftBar";
import { BottomBar } from "~/components/BottomBar";
import { ProfileFriendsSvg, ProfileTimeJoinedSvg } from "~/components/Svgs";
import { useAuth } from "~/hooks/useAuth";
import { postAPI, userAPI } from "~/utils/api";
import { getLevelBadgeClassName, normalizeLevel } from "~/utils/level-badge";
import { buildAvatarUrl } from "~/utils/avatar";

type UserProfile = {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  followingCount: number;
  followersCount: number;
  isFollowedByMe: boolean;
  createdAt: string;
};

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
  type: string;
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

type RelationshipUser = {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
};

const getImageGridClassName = (imageCount: number) => {
  if (imageCount <= 1) return "grid-cols-1";
  return "grid-cols-1 sm:grid-cols-2";
};

const HeartIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden={true}>
    <path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 14 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const CommentIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden={true}>
    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const ImageAddIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden={true}>
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M3 15l5-5 4 4 3-3 6 5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
  </svg>
);

const UserProfilePage: NextPage = () => {
  const router = useRouter();
  const { userId } = router.query;
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relationOpen, setRelationOpen] = useState(false);
  const [relationType, setRelationType] = useState<"following" | "followers">("followers");
  const [relationLoading, setRelationLoading] = useState(false);
  const [relationError, setRelationError] = useState<string | null>(null);
  const [relationUsers, setRelationUsers] = useState<RelationshipUser[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editLocation, setEditLocation] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "followers" | "private">("public");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const currentUserId = user?.id;

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("doc that bai"));
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    if (!userId || typeof userId !== "string") return;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const [profileRes, postsRes] = await Promise.all([
          userAPI.getProfile(userId),
          userAPI.getUserPosts(userId),
        ]);
        const fetchedProfile: UserProfile = profileRes.data?.user ?? null;
        setProfile(fetchedProfile);
        setIsFollowing(fetchedProfile?.isFollowedByMe ?? false);
        setPosts(postsRes.data?.posts ?? []);
      } catch (err: any) {
        setError(
          (err?.response?.data?.message as string | undefined) ??
            "Unable to load this page",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const handleFollow = async () => {
    if (!profile || followPending) return;
    setFollowPending(true);
    try {
      if (isFollowing) {
        await userAPI.unfollowUser(profile._id);
        setIsFollowing(false);
        setProfile((p) =>
          p ? { ...p, followersCount: p.followersCount - 1 } : p,
        );
      } else {
        await userAPI.followUser(profile._id);
        setIsFollowing(true);
        setProfile((p) =>
          p ? { ...p, followersCount: p.followersCount + 1 } : p,
        );
      }
    } catch {
      // ignore
    } finally {
      setFollowPending(false);
    }
  };

  const openRelationshipModal = async (type: "following" | "followers") => {
    if (!profile) return;

    setRelationOpen(true);
    setRelationType(type);
    setRelationLoading(true);
    setRelationError(null);

    try {
      const response =
        type === "following"
          ? await userAPI.getFollowingList(profile._id)
          : await userAPI.getFollowersList(profile._id);
      setRelationUsers(response.data?.users ?? []);
    } catch (err: any) {
      setRelationUsers([]);
      setRelationError(
        (err?.response?.data?.message as string | undefined) ??
          "Unable to load the list",
      );
    } finally {
      setRelationLoading(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    const prevPosts = posts;
    setPosts((current) =>
      current.map((post) => {
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
      const liked = Boolean(response.data?.liked);
      const likesCount = Number(response.data?.likesCount ?? 0);
      setPosts((current) =>
        current.map((post) =>
          post._id === postId
            ? { ...post, isLikedByMe: liked, likesCount }
            : post,
        ),
      );
    } catch {
      setPosts(prevPosts);
    }
  };

  const handleSubmitComment = async (postId: string) => {
    const value = (commentInputs[postId] ?? "").trim();
    if (!value) return;

    try {
      setCommentLoading((prev) => ({ ...prev, [postId]: true }));
      const response = await postAPI.addComment(postId, value);
      const comment = response.data?.comment;
      const commentsCount = Number(response.data?.commentsCount ?? 0);

      setPosts((current) =>
        current.map((post) => {
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
      // ignore
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const startEditingPost = (post: FeedPost) => {
    setEditingPostId(post._id);
    setEditContent(post.content ?? "");
    setEditImages(Array.isArray(post.images) ? post.images : []);
    setEditLocation(post.location ?? "");
    setEditVisibility((post.visibility as "public" | "followers" | "private") ?? "public");
    setEditError(null);
  };

  const cancelEditingPost = () => {
    setEditingPostId(null);
    setEditContent("");
    setEditImages([]);
    setEditLocation("");
    setEditVisibility("public");
    setEditError(null);
  };

  const handlePickEditImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    try {
      setEditError(null);
      const remain = Math.max(4 - editImages.length, 0);
      if (remain === 0) return;

      const next = await Promise.all(
        selectedFiles.slice(0, remain).map((file) => fileToDataUrl(file)),
      );
      setEditImages((prev) => [...prev, ...next].slice(0, 4));
    } catch {
      setEditError("Image upload failed");
    } finally {
      event.target.value = "";
    }
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
      setEditError("Failed to update post");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this post?");
    if (!confirmed) return;

    try {
      await postAPI.deletePost(postId);
      setPosts((prev) => prev.filter((post) => post._id !== postId));
      if (editingPostId === postId) {
        cancelEditingPost();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <LeftBar selectedTab="Profile" />
      <div className="flex justify-center gap-3 pt-14 md:ml-24 md:pt-0 lg:ml-64 lg:gap-12">
        <main className="flex w-full max-w-2xl flex-col gap-5 p-5 pb-28">
          {loading && (
            <div className="animate-pulse space-y-4">
              <div className="h-48 rounded-2xl bg-gray-100" />
              <div className="h-32 rounded-2xl bg-gray-100" />
              <div className="h-32 rounded-2xl bg-gray-100" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-8 text-center text-sm text-red-500">
              {error}
            </div>
          )}

          {!loading && !error && profile && (
            <>
              {/* Profile header */}
              <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
                  {buildAvatarUrl(profile.avatar) ? (
                    <img
                      src={buildAvatarUrl(profile.avatar) ?? ''}
                      alt={profile.name}
                      className="h-24 w-24 shrink-0 rounded-full border-4 border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-dashed border-gray-300 text-3xl font-bold text-gray-400">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex flex-1 flex-col gap-3 text-center sm:text-left">
                    <div>
                      <div className="flex items-center justify-center gap-2 sm:justify-start">
                        <h1 className="text-2xl font-bold">{profile.name}</h1>
                        <span
                          className={[
                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-bold",
                            getLevelBadgeClassName(profile.level),
                          ].join(" ")}
                        >
                          {normalizeLevel(profile.level)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        {profile.email.split("@")[0]}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 sm:justify-start">
                      <ProfileTimeJoinedSvg />
                      <span className="text-sm text-gray-500">
                        Joined {dayjs(profile.createdAt).format("MMMM YYYY")}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-2 sm:justify-start">
                      <ProfileFriendsSvg />
                      <div className="text-sm text-gray-500">
                        <button
                          type="button"
                          onClick={() => void openRelationshipModal("following")}
                          className="font-semibold text-gray-600 transition hover:text-blue-500 hover:underline"
                        >
                          {profile.followingCount} Following
                        </button>
                        <span className="mx-1">/</span>
                        <button
                          type="button"
                          onClick={() => void openRelationshipModal("followers")}
                          className="font-semibold text-gray-600 transition hover:text-blue-500 hover:underline"
                        >
                          {profile.followersCount} Followers
                        </button>
                      </div>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      {currentUserId && currentUserId !== profile._id && (
                        <Link
                          href={`/messages?userId=${profile._id}`}
                          className="self-center rounded-2xl border-2 border-gray-200 bg-white px-5 py-2 text-sm font-bold uppercase text-gray-600 transition hover:bg-gray-50 sm:self-start"
                        >
                          Message
                        </Link>
                      )}

                      <button
                        onClick={() => void handleFollow()}
                        disabled={followPending}
                        className={[
                          "self-center rounded-2xl border-b-4 px-6 py-2 text-sm font-bold uppercase transition sm:self-start",
                          isFollowing
                            ? "border-gray-300 bg-gray-100 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                            : "border-blue-400 bg-[#1cb0f6] text-white hover:brightness-110",
                          followPending ? "cursor-not-allowed opacity-60" : "",
                        ].join(" ")}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Posts section */}
              <h2 className="text-lg font-bold text-gray-700">Posts</h2>

              {posts.length === 0 && (
                <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
                  No public posts yet.
                </div>
              )}

              {posts.map((post) => {
                const authorName = post.userId?.name ?? profile.name;
                const authorLevel = post.userId?.level ?? "A1";
                const authorAvatar = buildAvatarUrl(post.userId?.avatar ?? profile.avatar);
                const authorInitial = authorName.charAt(0).toUpperCase();
                const authorId = post.userId?._id;
                const isOwnPost = Boolean(currentUserId && authorId && currentUserId === authorId);
                const isEditing = editingPostId === post._id;

                return (
                  <article
                    key={post._id}
                    className="rounded-2xl border-2 border-gray-200 bg-white p-4"
                  >
                    {isEditing && (
                      <input
                        id={`edit-image-input-${post._id}`}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          void handlePickEditImages(e);
                        }}
                        className="hidden"
                      />
                    )}

                    <div className="mb-3 flex items-center gap-3">
                      {authorId ? (
                        <Link href={`/users/${authorId}`} className="shrink-0">
                          {authorAvatar ? (
                            <img
                              src={authorAvatar}
                              alt={authorName}
                              className="h-10 w-10 rounded-full border-2 border-gray-200 object-cover transition hover:opacity-80"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-sm font-bold text-gray-400 transition hover:opacity-80">
                              {authorInitial}
                            </div>
                          )}
                        </Link>
                      ) : authorAvatar ? (
                        <img
                          src={authorAvatar}
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
                          {dayjs(post.createdAt).format("DD/MM/YYYY HH:mm")}
                        </div>
                      </div>
                      {isOwnPost && (
                        <div className="ml-auto flex items-center gap-2">
                          {!isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditingPost(post)}
                                className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-bold text-gray-500 hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeletePost(post._id)}
                                className="rounded-lg border border-red-200 px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-sky-50/70 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Edit post</p>
                          <span className="text-[11px] text-gray-400">Up to 4 images</span>
                        </div>

                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          placeholder="Update your post..."
                          className="min-h-[110px] w-full rounded-xl border border-blue-200 bg-white p-3 text-sm outline-none transition focus:border-blue-400"
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
                          <label
                            htmlFor={`edit-image-input-${post._id}`}
                            className={[
                              "inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-600 transition",
                              editImages.length >= 4 ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-blue-50",
                            ].join(" ")}
                          >
                            <ImageAddIcon />
                            Add photo
                          </label>
                          <span className="rounded-full bg-white px-2 py-1 text-[11px] text-gray-500">
                            {editImages.length}/4 ảnh
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <input
                            value={editLocation}
                            onChange={(e) => setEditLocation(e.target.value)}
                            placeholder="Location"
                            className="h-10 rounded-xl border border-blue-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400"
                          />
                          <select
                            value={editVisibility}
                            onChange={(e) =>
                              setEditVisibility(e.target.value as "public" | "followers" | "private")
                            }
                            className="h-10 rounded-xl border border-blue-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400"
                          >
                            <option value="public">Public</option>
                            <option value="followers">Followers</option>
                            <option value="private">Private</option>
                          </select>
                        </div>

                        {editError && (
                          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                            {editError}
                          </p>
                        )}

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEditingPost}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-500 transition hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveEditedPost()}
                            disabled={editSaving || !editContent.trim()}
                            className="rounded-xl border-b-4 border-blue-500 bg-[#1cb0f6] px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                          >
                            {editSaving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm text-gray-800">{post.content}</p>
                    )}

                    {post.images?.length > 0 && (
                      <div className={`mt-3 grid gap-2 ${getImageGridClassName(post.images.length)}`}>
                        {post.images.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt=""
                            className="w-full rounded-xl border border-gray-200"
                          />
                        ))}
                      </div>
                    )}

                    {post.location && (
                      <div className="mt-2 text-xs text-gray-400">
                        📍 {post.location}
                      </div>
                    )}

                    <div className="mt-3 flex gap-5 border-t border-gray-100 pt-3 text-xs text-gray-400">
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
                        <HeartIcon /> {post.likesCount}
                      </button>
                      <span className="flex items-center gap-1">
                        <CommentIcon /> {post.commentsCount}
                      </span>
                    </div>

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
                        placeholder="Write a comment..."
                        className="h-9 flex-1 rounded-xl border border-gray-200 px-3 text-xs outline-none focus:border-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSubmitComment(post._id)}
                        disabled={commentLoading[post._id] || !(commentInputs[post._id] ?? "").trim()}
                        className="rounded-xl border-b-4 border-blue-500 bg-[#1cb0f6] px-3 py-1 text-xs font-bold uppercase text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Send
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
                          const commentAvatar = buildAvatarUrl(comment.userId?.avatar);
                          const commentAuthorId = comment.userId?._id;
                          const commentInitial = commentAuthorName.charAt(0).toUpperCase();
                          const commentTime = dayjs(comment.createdAt).format("DD/MM/YYYY HH:mm");

                          return (
                            <div
                              key={comment._id}
                              className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2"
                            >
                                {commentAuthorId ? (
                                  <Link href={`/users/${commentAuthorId}`} className="shrink-0">
                                    {commentAvatar ? (
                                      <img
                                        src={commentAvatar}
                                        alt={commentAuthorName}
                                        className="h-7 w-7 rounded-full border border-gray-200 object-cover transition hover:opacity-80"
                                      />
                                    ) : (
                                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ddf4ff] text-[10px] font-bold text-blue-500 transition hover:opacity-80">
                                        {commentInitial}
                                      </div>
                                    )}
                                  </Link>
                                ) : commentAvatar ? (
                                  <img
                                    src={commentAvatar}
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
                              ? "Hide comments"
                              : `View all comments (${post.comments.length})`}
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </>
          )}
        </main>
      </div>

      {relationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">
                {relationType === "following" ? "Following" : "Followers"}
              </h3>
              <button
                type="button"
                onClick={() => setRelationOpen(false)}
                className="rounded-lg px-2 py-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                Close
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-3">
              {relationLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              )}

              {!relationLoading && relationError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">
                  {relationError}
                </div>
              )}

              {!relationLoading && !relationError && relationUsers.length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-6 text-center text-sm text-gray-400">
                  No users found.
                </div>
              )}

              {!relationLoading && !relationError && relationUsers.length > 0 && (
                <div className="space-y-2">
                  {relationUsers.map((u) => {
                    const initial = (u.name || u.email || "?").charAt(0).toUpperCase();
                    return (
                      <Link
                        key={u._id}
                        href={`/users/${u._id}`}
                        onClick={() => setRelationOpen(false)}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 p-2 transition hover:bg-gray-50"
                      >
                        {buildAvatarUrl(u.avatar) ? (
                          <img
                            src={buildAvatarUrl(u.avatar) ?? ''}
                            alt={u.name}
                            className="h-10 w-10 shrink-0 rounded-full border border-gray-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ddf4ff] text-sm font-bold text-blue-500">
                            {initial}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate font-bold text-gray-800">{u.name}</p>
                          <span
                            className={[
                              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
                              getLevelBadgeClassName(u.level),
                            ].join(" ")}
                          >
                            {normalizeLevel(u.level)}
                          </span>
                          {u.email && (
                            <p className="truncate text-xs text-gray-400">{u.email}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomBar selectedTab="Profile" />
    </div>
  );
};

export default UserProfilePage;
