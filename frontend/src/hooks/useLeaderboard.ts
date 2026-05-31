import { useEffect, useState } from "react";
import { useBoundStore } from "~/hooks/useBoundStore";
import { useAuthStore } from "~/stores/createAuthStore";
import { userAPI } from "~/utils/api";

export type LeaderboardUser = {
  id?: string;
  name: string;
  avatar?: string | null;
  level?: string;
  xp: number;
  isCurrentUser: boolean;
};

const fallbackCurrentUser = (name: string, xp: number): LeaderboardUser => ({
  name: name || "Nguoi hoc",
  xp,
  isCurrentUser: true,
});

export const useLeaderboardUsers = () => {
  const xpThisWeek = useBoundStore((x) => x.xpThisWeek());
  const localName = useBoundStore((x) => x.name);
  const authUser = useAuthStore((x) => x.user);
  const token = useAuthStore((x) => x.token);
  const [users, setUsers] = useState<LeaderboardUser[]>([
    fallbackCurrentUser(authUser?.name || localName, xpThisWeek),
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadLeaderboard = async () => {
      try {
        const response = await userAPI.getLeaderboard();
        const apiUsers = Array.isArray(response.data?.users)
          ? response.data.users
          : [];

        if (!cancelled && apiUsers.length > 0) {
          setUsers(apiUsers);
          return;
        }
      } catch {
        // Keep a local fallback so the page stays usable if the API is offline.
      }

      if (!cancelled) {
        setUsers([
          fallbackCurrentUser(authUser?.name || localName, xpThisWeek),
        ]);
      }
    };

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [authUser?.name, localName, token, xpThisWeek]);

  return users;
};

export const useLeaderboardRank = () => {
  const leaderboardUsers = useLeaderboardUsers();

  const index = leaderboardUsers.findIndex(
    (user) => user.isCurrentUser
  );

  return index === -1 ? null : index + 1;
};
