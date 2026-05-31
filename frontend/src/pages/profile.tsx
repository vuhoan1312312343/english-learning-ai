import type { NextPage } from "next";
import { BottomBar } from "~/components/BottomBar";
import { LeftBar } from "~/components/LeftBar";
import {
  BronzeLeagueSvg,
  EditPencilSvg,
  EmptyFireSvg,
  FireSvg,
  LightningProgressSvg,
  EmptyMedalSvg,
  ProfileFriendsSvg,
  ProfileTimeJoinedSvg,
  SettingsGearSvg,
} from "~/components/Svgs";
import Link from "next/link";
import { Flag } from "~/components/Flag";
import { useBoundStore } from "~/hooks/useBoundStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "~/hooks/useAuth";
import { authAPI, userAPI } from "~/utils/api";
import { useAuthStore } from "~/stores/createAuthStore";
import { getLevelBadgeClassName, normalizeLevel } from "~/utils/level-badge";
import { buildAvatarUrl } from "~/utils/avatar";

type RelationshipUser = {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
};

type RelationshipUsersResponse = {
  users?: RelationshipUser[];
};

const Profile: NextPage = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const setUser = useAuthStore((x) => x.setUser);
  const loggedIn = useBoundStore((x) => x.loggedIn);

  const [followingUsers, setFollowingUsers] = useState<RelationshipUser[]>([]);
  const [followersUsers, setFollowersUsers] = useState<RelationshipUser[]>([]);
  const [relationLoading, setRelationLoading] = useState(false);
  const [relationError, setRelationError] = useState<string | null>(null);

  const userLoggedIn = loggedIn || isAuthenticated;
  const currentUserId = user?.id;

  useEffect(() => {
    if (!userLoggedIn) {
      void router.push("/");
    }
  }, [userLoggedIn, router]);

  useEffect(() => {
    if (!userLoggedIn || !currentUserId) return;

    void (async () => {
      try {
        setRelationLoading(true);
        setRelationError(null);
        const [followingRes, followersRes] = await Promise.all([
          userAPI.getFollowingList(currentUserId),
          userAPI.getFollowersList(currentUserId),
        ]);

        const followingData =
          followingRes.data as RelationshipUsersResponse;
        const followersData =
          followersRes.data as RelationshipUsersResponse;

        setFollowingUsers(followingData.users ?? []);
        setFollowersUsers(followersData.users ?? []);
      } catch (err: unknown) {
        const apiMessage =
          typeof err === "object" &&
          err !== null &&
          "response" in err &&
          typeof (err as { response?: { data?: { message?: unknown } } }).
            response?.data?.message === "string"
            ? ((err as { response?: { data?: { message?: string } } }).response
                ?.data?.message ?? null)
            : null;

        setRelationError(
          apiMessage ?? "Không tải được danh sách bạn bè",
        );
      } finally {
        setRelationLoading(false);
      }
    })();
  }, [currentUserId, userLoggedIn]);

  useEffect(() => {
    if (!isAuthenticated || !user || user.level) return;

    void (async () => {
      try {
        const response = await authAPI.getCurrentUser();
        if (response.data?.user) {
          setUser(response.data.user);
        }
      } catch {
        // Keep local fallback when refresh fails.
      }
    })();
  }, [isAuthenticated, setUser, user]);

  return (
    <div>
      <ProfileTopBar />
      <LeftBar selectedTab="Profile" />
      <div className="flex justify-center gap-3 pt-14 md:ml-24 lg:ml-64 lg:gap-12">
        <div className="flex w-full max-w-4xl flex-col gap-5 p-5">
          <ProfileTopSection
            followingCount={followingUsers.length}
            followersCount={followersUsers.length}
          />
          <ProfileStatsSection />
          <ProfileFriendsSection
            followingUsers={followingUsers}
            followersUsers={followersUsers}
            loading={relationLoading}
            error={relationError}
          />
        </div>
      </div>
      <div className="pt-[90px]"></div>
      <BottomBar selectedTab="Profile" />
    </div>
  );
};

export default Profile;

const ProfileTopBar = () => {
  return (
    <div className="fixed left-0 right-0 top-0 flex h-16 items-center justify-between border-b-2 border-gray-200 bg-white px-5 text-xl font-bold text-gray-300 md:hidden">
      <div className="invisible" aria-hidden={true}>
        <SettingsGearSvg />
      </div>
      <span className="text-gray-400">Profile</span>
      <Link href="/settings/account">
        <SettingsGearSvg />
        <span className="sr-only">Settings</span>
      </Link>
    </div>
  );
};

const ProfileTopSection = ({
  followingCount,
  followersCount,
}: {
  followingCount: number;
  followersCount: number;
}) => {
  const { isAuthenticated, user } = useAuth();
  const name = useBoundStore((x) => x.name);
  const username = useBoundStore((x) => x.username);
  const joinedAt = useBoundStore((x) => x.joinedAt).format("MMMM YYYY");
  const language = useBoundStore((x) => x.language);

  // Use authenticated user data if available
  const displayName = isAuthenticated && user ? user.name : name;
  const displayUsername =
    isAuthenticated && user ? user.email.split("@")[0] : username;
  const displayAvatar = isAuthenticated && user ? user.avatar : null;
  const displayAvatarUrl = buildAvatarUrl(displayAvatar);
  const displayLevel = isAuthenticated && user ? (user.level ?? "A1") : "A1";
  const profileLink = user?.id ? `/users/${user.id}` : "/profile";

  return (
    <section className="flex flex-row-reverse border-b-2 border-gray-200 pb-8 md:flex-row md:gap-8">
      <Link href={profileLink} className="shrink-0">
        {displayAvatarUrl ? (
          <img
            src={displayAvatarUrl}
            alt={displayName}
            className="h-20 w-20 rounded-full border-2 border-gray-300 transition hover:opacity-80 md:h-44 md:w-44"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-gray-400 text-3xl font-bold text-gray-400 transition hover:opacity-80 md:h-44 md:w-44 md:text-7xl">
            {(displayUsername ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
      </Link>
      <div className="flex grow flex-col justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div>
            <Link href={profileLink} className="text-2xl font-bold">
              {displayName}
            </Link>
            <div className="text-sm text-gray-400">{displayUsername}</div>
            <div
              className={[
                "mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-bold",
                getLevelBadgeClassName(displayLevel),
              ].join(" ")}
            >
              {normalizeLevel(displayLevel)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ProfileTimeJoinedSvg />
            <span className="text-gray-500">{`Joined ${joinedAt}`}</span>
          </div>
          <div className="flex items-center gap-3">
            <ProfileFriendsSvg />
            <span className="text-gray-500">
              {`${followingCount} Following / ${followersCount} Followers`}
            </span>
          </div>
        </div>

        <Flag language={language} width={40} />
      </div>
      <Link
        href="/settings/account"
        className="hidden items-center gap-2 self-start rounded-2xl border-b-4 border-blue-500 bg-blue-400 px-5 py-3 font-bold uppercase text-white transition hover:brightness-110 md:flex"
      >
        <EditPencilSvg />
        Edit profile
      </Link>
    </section>
  );
};

const ProfileStatsSection = () => {
  const streak = useBoundStore((x) => x.streak);
  const totalXp = 125;
  const league = "Bronze";
  const top3Finishes = 0;

  return (
    <section>
      <h2 className="mb-5 text-2xl font-bold">Statistics</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex gap-2 rounded-2xl border-2 border-gray-200 p-2 md:gap-3 md:px-6 md:py-4">
          {streak === 0 ? <EmptyFireSvg /> : <FireSvg />}
          <div className="flex flex-col">
            <span
              className={[
                "text-xl font-bold",
                streak === 0 ? "text-gray-400" : "",
              ].join(" ")}
            >
              {streak}
            </span>
            <span className="text-sm text-gray-400 md:text-base">
              Day streak
            </span>
          </div>
        </div>
        <div className="flex gap-2 rounded-2xl border-2 border-gray-200 p-2 md:gap-3 md:px-6 md:py-4">
          <LightningProgressSvg size={35} />
          <div className="flex flex-col">
            <span className="text-xl font-bold">{totalXp}</span>
            <span className="text-sm text-gray-400 md:text-base">Total XP</span>
          </div>
        </div>
        <div className="flex gap-2 rounded-2xl border-2 border-gray-200 p-2 md:gap-3 md:px-6 md:py-4">
          <BronzeLeagueSvg width={25} height={35} />
          <div className="flex flex-col">
            <span className="text-xl font-bold">{league}</span>
            <span className="text-sm text-gray-400 md:text-base">
              Current league
            </span>
          </div>
        </div>
        <div className="flex gap-2 rounded-2xl border-2 border-gray-200 p-2 md:gap-3 md:px-6 md:py-4">
          {top3Finishes === 0 ? <EmptyMedalSvg /> : <EmptyMedalSvg />}
          <div className="flex flex-col">
            <span
              className={[
                "text-xl font-bold",
                top3Finishes === 0 ? "text-gray-400" : "",
              ].join(" ")}
            >
              {top3Finishes}
            </span>
            <span className="text-sm text-gray-400 md:text-base">
              Top 3 finishes
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

const ProfileFriendsSection = ({
  followingUsers,
  followersUsers,
  loading,
  error,
}: {
  followingUsers: RelationshipUser[];
  followersUsers: RelationshipUser[];
  loading: boolean;
  error: string | null;
}) => {
  const [state, setState] = useState<"FOLLOWING" | "FOLLOWERS">("FOLLOWING");

  const activeList =
    state === "FOLLOWING" ? followingUsers : followersUsers;

  const emptyText =
    state === "FOLLOWING" ? "Chưa theo dõi ai" : "Chưa có người theo dõi";

  return (
    <section>
      <h2 className="mb-5 text-2xl font-bold">Friends</h2>
      <div className="rounded-2xl border-2 border-gray-200">
        <div className="grid grid-cols-2">
          <button
            className={[
              "flex items-center justify-center border-b-2 py-3 font-bold uppercase hover:border-blue-400 hover:text-blue-400",
              state === "FOLLOWING"
                ? "border-blue-400 text-blue-400"
                : "border-gray-200 text-gray-400",
            ].join(" ")}
            onClick={() => setState("FOLLOWING")}
          >
            Following
          </button>
          <button
            className={[
              "flex items-center justify-center border-b-2 py-3 font-bold uppercase hover:border-blue-400 hover:text-blue-400",
              state === "FOLLOWERS"
                ? "border-blue-400 text-blue-400"
                : "border-gray-200 text-gray-400",
            ].join(" ")}
            onClick={() => setState("FOLLOWERS")}
          >
            Followers
          </button>
        </div>
        <div className="p-4">
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-gray-100"
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          )}

          {!loading && !error && activeList.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-6 text-center text-sm text-gray-400">
              {emptyText}
            </div>
          )}

          {!loading && !error && activeList.length > 0 && (
            <div className="space-y-2">
              {activeList.map((u) => {
                const initial = (u.name || u.email || "?")
                  .charAt(0)
                  .toUpperCase();
                return (
                  <Link
                    key={u._id}
                    href={`/users/${u._id}`}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 p-2 transition hover:bg-gray-50"
                  >
                    {u.avatar ? (
                      <img
                        src={u.avatar}
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
    </section>
  );
};
