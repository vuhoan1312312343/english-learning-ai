import type { NextPage } from "next";
import React from "react";
import { BottomBar } from "~/components/BottomBar";
import { LeftBar } from "~/components/LeftBar";
import {
  FirstPlaceSvg,
  LeaderboardBannerSvg,
  LockedLeaderboardSvg,
  SecondPlaceSvg,
  ThirdPlaceSvg,
} from "~/components/Svgs";
import { useBoundStore } from "~/hooks/useBoundStore";
import { useLeaderboardUsers } from "~/hooks/useLeaderboard";
import { buildAvatarUrl } from "~/utils/avatar";

const LeaderboardExplanationSection = () => {
  return (
    <article className="relative hidden h-fit w-96 shrink-0 gap-5 rounded-2xl border-2 border-gray-200 p-6 xl:flex">
      <div className="flex flex-col gap-5">
        <h2 className="font-bold uppercase text-gray-400">
          Bảng xếp hạng người dùng
        </h2>

        <p className="font-bold text-gray-700">
          Học bài. Tích lũy điểm kinh nghiệm. Cùng nhau tiến bộ.
        </p>

        <p className="text-gray-400">
          Điểm XP được tính từ quá trình học của từng tài khoản.
          Người học có nhiều XP hơn sẽ đứng cao hơn trong bảng xếp hạng.
        </p>
      </div>
    </article>
  );
};

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

const LeaderboardAvatar = ({
  name,
  avatar,
}: {
  name: string;
  avatar?: string | null;
}) => {
  const [imageFailed, setImageFailed] = React.useState(false);
  const avatarUrl = imageFailed ? null : buildAvatarUrl(avatar);

  if (avatarUrl) {
    return (
      <img
        className="h-12 w-12 rounded-full object-cover"
        src={avatarUrl}
        alt={name}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700">
      {getInitial(name)}
    </div>
  );
};

const LeaderboardProfile = ({
  place,
  name,
  avatar,
  xp,
  isCurrentUser,
}: {
  place: number;
  name: string;
  avatar?: string | null;
  xp: number;
  isCurrentUser: boolean;
}) => {
  return (
    <div
      className={[
        "flex items-center gap-5 rounded-2xl px-5 py-2 hover:bg-gray-100 md:mx-0",
        isCurrentUser ? "bg-gray-200" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-4">
        {place === 1 ? (
          <FirstPlaceSvg />
        ) : place === 2 ? (
          <SecondPlaceSvg />
        ) : place === 3 ? (
          <ThirdPlaceSvg />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center font-bold text-green-700">
            {place}
          </div>
        )}

        <LeaderboardAvatar name={name} avatar={avatar} />
      </div>

      <div className="grow overflow-hidden overflow-ellipsis font-bold">
        {name}
      </div>

      <div className="shrink-0 text-gray-500">{xp} XP</div>
    </div>
  );
};

const Leaderboard: NextPage = () => {
  const lessonsCompleted = useBoundStore((x) => x.lessonsCompleted);

  const lessonsToUnlockLeaderboard = 0;
  const lessonsRemainingToUnlockLeaderboard =
    lessonsToUnlockLeaderboard - lessonsCompleted;

  const leaderboardIsUnlocked = true;
  const leaderboardUsers = useLeaderboardUsers();

  return (
    <div>
      <LeftBar selectedTab="Leaderboards" />

      <div className="flex justify-center gap-3 pt-14 md:ml-24 md:p-6 md:pt-10 lg:ml-64 lg:gap-12">
        <div className="flex w-full max-w-xl flex-col items-center gap-5 pb-28 md:px-5">
          {!leaderboardIsUnlocked && (
            <>
              <LeaderboardBannerSvg />

              <h1 className="text-center text-2xl font-bold text-gray-700">
                Mở khóa bảng xếp hạng
              </h1>

              <p className="text-center font-bold text-gray-400">
                Hoàn thành thêm {lessonsRemainingToUnlockLeaderboard} bài học
                để bắt đầu xếp hạng.
              </p>

              <LockedLeaderboardSvg />
            </>
          )}

          {leaderboardIsUnlocked && (
            <>
              <div className="flex w-full items-center justify-between rounded-2xl border-2 border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-2xl font-black text-green-700">
                    XP
                  </div>

                  <div>
                    <h2 className="font-bold text-gray-700">
                      Bảng xếp hạng người dùng
                    </h2>

                    <p className="text-sm text-gray-400">
                      Xếp hạng theo tổng điểm XP của tài khoản
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2">
                {leaderboardUsers.map((user, index) => (
                  <LeaderboardProfile
                    key={user.id ?? `${user.name}-${index}`}
                    place={index + 1}
                    name={user.name}
                    avatar={user.avatar}
                    xp={user.xp}
                    isCurrentUser={user.isCurrentUser}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <LeaderboardExplanationSection />
      </div>

      <BottomBar selectedTab="Leaderboards" />
    </div>
  );
};

export default Leaderboard;
