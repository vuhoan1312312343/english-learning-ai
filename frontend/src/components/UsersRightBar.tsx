import React, { useEffect, useState } from "react";
import Link from "next/link";
import { userAPI } from "~/utils/api";
import { useAuth } from "~/hooks/useAuth";
import { useBoundStore } from "~/hooks/useBoundStore";
import { useAuthStore } from "~/stores/createAuthStore";
import { buildAvatarUrl } from "~/utils/avatar";

type SuggestedUser = {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
};

export const UsersRightBar = ({
  showGuestAuthCard = false,
  onSignupClick,
  onLoginClick,
}: {
  showGuestAuthCard?: boolean;
  onSignupClick?: () => void;
  onLoginClick?: () => void;
}) => {
  const { isAuthenticated, user } = useAuth();
  const loggedIn = useBoundStore((x) => x.loggedIn);
  const logOut = useBoundStore((x) => x.logOut);
  const authLogout = useAuthStore((state) => state.logout);
  const isLoggedIn = isAuthenticated || loggedIn;
  const userAvatarUrl = buildAvatarUrl(user?.avatar);

  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    void (async () => {
      try {
        const res = await userAPI.getSuggestions();
        setUsers(res.data?.users ?? []);
      } catch {
        // Keep the sidebar quiet if suggestions are temporarily unavailable.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleFollow = async (userId: string) => {
    if (!isLoggedIn) return;
    if (pending.has(userId)) return;
    setPending((p) => new Set(p).add(userId));
    const isFollowing = followed.has(userId);
    try {
      if (isFollowing) {
        await userAPI.unfollowUser(userId);
        setFollowed((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else {
        await userAPI.followUser(userId);
        setFollowed((prev) => new Set(prev).add(userId));
      }
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(userId);
        return next;
      });
    }
  };

  return (
    <aside className="sticky top-0 hidden w-80 flex-col gap-4 self-start pt-8 sm:flex">
      {isLoggedIn && user && (
        <article className="overflow-hidden rounded-[24px] border-2 border-gray-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-blue-50 to-green-50 p-6">
            <div className="mb-5 flex items-center gap-4">
              <Link href="/profile" className="shrink-0">
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt={user.name}
                    className="h-16 w-16 rounded-full border-4 border-white object-cover shadow-sm transition hover:opacity-80"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#58cc02] text-2xl font-black text-white shadow-sm transition hover:opacity-80">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>

              <div className="min-w-0">
                <Link href="/profile" className="truncate text-xl font-black text-gray-800">
                  {user.name}
                </Link>
                <p className="truncate text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-white/80 p-3">
                <p className="text-xs font-bold uppercase text-gray-400">Hồ sơ</p>
                <p className="text-lg font-black text-gray-800">{user.level}</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-3">
                <p className="text-xs font-bold uppercase text-gray-400">Cộng đồng</p>
                <p className="text-lg font-black text-gray-800">Active</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 p-5 font-bold uppercase">
            <Link
              href="/profile"
              className="rounded-2xl border-b-4 border-blue-500 bg-blue-400 py-3 text-center text-white transition hover:border-blue-400 hover:bg-blue-300"
            >
              Hồ sơ của tôi
            </Link>

            <button
              onClick={() => {
                authLogout();
                logOut();
                window.location.href = "/register";
              }}
              className="rounded-2xl border-2 border-gray-300 py-3 text-gray-600 transition hover:bg-gray-100"
            >
              Đăng xuất
            </button>
          </div>
        </article>
      )}

      {!isLoggedIn && showGuestAuthCard && (
        <article className="rounded-[24px] border-2 border-gray-200 bg-white p-6 font-bold shadow-sm">
          <h2 className="mb-5 text-xl text-gray-800">
            Hãy tạo hồ sơ để lưu lại tiến trình của bạn!
          </h2>
          <div className="flex flex-col gap-3">
            <button
              className="rounded-2xl border-b-4 border-green-600 bg-green-500 py-3 uppercase text-white transition hover:border-green-500 hover:bg-green-400"
              onClick={onSignupClick}
            >
              Tạo hồ sơ
            </button>
            <button
              className="rounded-2xl border-b-4 border-blue-500 bg-blue-400 py-3 uppercase text-white transition hover:border-blue-400 hover:bg-blue-300"
              onClick={onLoginClick}
            >
              Đăng nhập
            </button>
          </div>
        </article>
      )}

      <article className="rounded-[24px] border-2 border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-black uppercase tracking-wider text-gray-400">
          Gợi ý theo dõi
        </h2>

        {loading && (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border-2 border-gray-100 bg-white p-3">
                <div className="h-10 w-10 rounded-full bg-gray-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded bg-gray-100" />
                  <div className="h-2.5 w-16 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && users.length === 0 && (
          <p className="mt-4 rounded-2xl border-2 border-gray-100 bg-slate-50 p-4 text-sm text-gray-400">
            Không có gợi ý nào.
          </p>
        )}

        {!loading && users.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {users.map((u) => {
              const initial = (u.name || u.email || "?").charAt(0).toUpperCase();
              const isFollowing = followed.has(u._id);
              const isPending = pending.has(u._id);
              const avatarUrl = buildAvatarUrl(u.avatar);

              return (
                <div
                  key={u._id}
                  className="flex items-center gap-3 rounded-2xl border-2 border-gray-100 bg-white p-3"
                >
                  <Link href={`/users/${u._id}`} className="shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={u.name}
                        className="h-10 w-10 rounded-full border-2 border-gray-200 object-cover transition hover:opacity-80"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ddf4ff] text-sm font-bold text-blue-500 transition hover:opacity-80">
                        {initial}
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link href={`/users/${u._id}`}>
                      <p className="truncate text-sm font-bold text-gray-800">{u.name}</p>
                    </Link>
                    {u.email && (
                      <p className="truncate text-xs text-gray-400">{u.email}</p>
                    )}
                  </div>

                  <button
                    onClick={() => void handleFollow(u._id)}
                    disabled={isPending || !isLoggedIn}
                    className={[
                      "shrink-0 rounded-2xl border-b-4 px-4 py-2 text-xs font-bold uppercase transition",
                      !isLoggedIn
                        ? "border-gray-300 bg-gray-100 text-gray-400"
                        : isFollowing
                          ? "border-gray-300 bg-gray-100 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                          : "border-blue-400 bg-[#1cb0f6] text-white hover:brightness-110",
                      isPending ? "cursor-not-allowed opacity-60" : "",
                    ].join(" ")}
                  >
                    {!isLoggedIn ? "Cần login" : isFollowing ? "Đã theo dõi" : "Theo dõi"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </aside>
  );
};
