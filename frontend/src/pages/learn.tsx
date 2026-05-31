import { type NextPage } from "next";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  LockedBookSvg,
  ActiveBookSvg,
  CheckmarkSvg,
  LockedDumbbellSvg,
  ActiveDumbbellSvg,
  FastForwardSvg,
  GoldenBookSvg,
  GoldenDumbbellSvg,
  GoldenTreasureSvg,
  GoldenTrophySvg,
  GuidebookSvg,
  LessonCompletionSvg0,
  LockSvg,
  LockedTreasureSvg,
  ActiveTreasureSvg,
  LockedTrophySvg,
  ActiveTrophySvg,
  UpArrowSvg,
  PracticeExerciseSvg,
} from "~/components/Svgs";
import { TopBar } from "~/components/TopBar";
import { BottomBar } from "~/components/BottomBar";
import { RightBar } from "~/components/RightBar";
import { LeftBar } from "~/components/LeftBar";
import { useRouter } from "next/router";
import { LoginScreen, useLoginScreen } from "~/components/LoginScreen";
import { useBoundStore } from "~/hooks/useBoundStore";
import { lessonAPI } from "~/utils/api";
import { useAuthStore } from "~/stores/createAuthStore";
import type { Tile, TileType, Unit } from "~/utils/units";

type BackendLesson = {
  _id: string;
  unitNumber: number;
  lessonNumber: number;
  title: string;
  description?: string;
  type: TileType;
};

type BackendUnit = {
  unitNumber: number;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  description: string;
  backgroundColor: `bg-${string}`;
  textColor: `text-${string}`;
  borderColor: `border-${string}`;
  tiles: Array<{
    type: TileType;
    description?: string;
    order: number;
  }>;
};

type LessonsByUnit = Record<number, BackendLesson[]>;
type ProgressByLessonId = Record<string, { completed: boolean; score: number }>;

const fallbackTileDescription = (tileType: TileType): string => {
  switch (tileType) {
    case "star":
      return "Lesson";
    case "book":
      return "Reading";
    case "dumbbell":
      return "Practice";
    case "fast-forward":
      return "Fast track";
    case "trophy":
      return "Review";
    case "treasure":
      return "Treasure";
  }
};

const toUiUnit = (backendUnit: BackendUnit): Unit => {
  const tiles: Tile[] = backendUnit.tiles
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((tile) => {
      if (tile.type === "treasure") {
        return {
          type: "treasure",
          description: tile.description ?? "Vocabulary",
        };
      }

      return {
        type: tile.type,
        description: tile.description ?? fallbackTileDescription(tile.type),
      };
    });

  return {
    unitNumber: backendUnit.unitNumber,
    description: backendUnit.description,
    backgroundColor: backendUnit.backgroundColor,
    textColor: backendUnit.textColor,
    borderColor: backendUnit.borderColor,
    tiles,
  };
};

const normalizeLessonKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getTileLesson = (
  tile: Tile,
  unitLessons: BackendLesson[],
  tileIndex: number,
) => {
  if (!("description" in tile) || !tile.description) {
    return unitLessons[tileIndex] ?? null;
  }

  const tileKey = normalizeLessonKey(tile.description);
  return (
    unitLessons.find((lesson) => normalizeLessonKey(lesson.title) === tileKey) ??
    unitLessons[tileIndex] ??
    null
  );
};

type TileStatus = "LOCKED" | "ACTIVE" | "COMPLETE";

const LESSONS_PER_TILE = 1;
const PASSING_SCORE_PERCENT = 80;
const UNIT_UNLOCK_RATIO = 0.8;

const getColorFromTailwindToken = (token: string, fallback: string): string => {
  const arbitraryColor = token.match(/\[#([0-9a-fA-F]{3,8})\]/);
  return arbitraryColor ? `#${arbitraryColor[1]}` : fallback;
};

const getUnitVisualColors = (unit: Unit) => ({
  backgroundColor: getColorFromTailwindToken(unit.backgroundColor, "#58cc02"),
  borderColor: getColorFromTailwindToken(unit.borderColor, "#46a302"),
  textColor: getColorFromTailwindToken(unit.textColor, "#58cc02"),
});

const TileIcon = ({
  tileType,
  status,
}: {
  tileType: TileType;
  status: TileStatus;
}): JSX.Element => {
  switch (tileType) {
    case "star":
      return status === "COMPLETE" ? <CheckmarkSvg /> : status === "ACTIVE" ? <GuidebookSvg /> : <LockSvg />;
    case "book":
      return status === "COMPLETE" ? <GoldenBookSvg /> : status === "ACTIVE" ? <ActiveBookSvg /> : <LockedBookSvg />;
    case "dumbbell":
      return status === "COMPLETE" ? <GoldenDumbbellSvg /> : status === "ACTIVE" ? <ActiveDumbbellSvg /> : <LockedDumbbellSvg />;
    case "fast-forward":
      return status === "COMPLETE" ? <CheckmarkSvg /> : <FastForwardSvg />;
    case "treasure":
      return status === "COMPLETE" ? <GoldenTreasureSvg /> : status === "ACTIVE" ? <ActiveTreasureSvg /> : <LockedTreasureSvg />;
    case "trophy":
      return status === "COMPLETE" ? <GoldenTrophySvg /> : status === "ACTIVE" ? <ActiveTrophySvg /> : <LockedTrophySvg />;
  }
};

const tileLeftClassNames = [
  "left-0",
  "left-[-45px]",
  "left-[-70px]",
  "left-[-45px]",
  "left-0",
  "left-[45px]",
  "left-[70px]",
  "left-[45px]",
] as const;

type TileLeftClassName = (typeof tileLeftClassNames)[number];

const getTileLeftClassName = ({
  index,
  unitNumber,
  tilesLength,
}: {
  index: number;
  unitNumber: number;
  tilesLength: number;
}): TileLeftClassName => {
  if (index >= tilesLength - 1) {
    return "left-0";
  }

  const classNames =
    unitNumber % 2 === 1
      ? tileLeftClassNames
      : [...tileLeftClassNames.slice(4), ...tileLeftClassNames.slice(0, 4)];

  return classNames[index % classNames.length] ?? "left-0";
};

const tileTooltipLeftOffsets = [140, 95, 70, 95, 140, 185, 210, 185] as const;

type TileTooltipLeftOffset = (typeof tileTooltipLeftOffsets)[number];

const getTileTooltipLeftOffset = ({
  index,
  unitNumber,
  tilesLength,
}: {
  index: number;
  unitNumber: number;
  tilesLength: number;
}): TileTooltipLeftOffset => {
  if (index >= tilesLength - 1) {
    return tileTooltipLeftOffsets[0];
  }

  const offsets =
    unitNumber % 2 === 1
      ? tileTooltipLeftOffsets
      : [
          ...tileTooltipLeftOffsets.slice(4),
          ...tileTooltipLeftOffsets.slice(0, 4),
        ];

  return offsets[index % offsets.length] ?? tileTooltipLeftOffsets[0];
};

const getTileStyle = ({
  status,
  unit,
}: {
  status: TileStatus;
  unit: Unit;
}): React.CSSProperties => {
  switch (status) {
    case "LOCKED":
      return {
        backgroundColor: "#e5e5e5",
        borderColor: "#b7b7b7",
      };
    case "COMPLETE":
      return {
        backgroundColor: "#facc15",
        borderColor: "#eab308",
      };
    case "ACTIVE":
      return {
        backgroundColor: getUnitVisualColors(unit).backgroundColor,
        borderColor: getUnitVisualColors(unit).borderColor,
      };
  }
};

const TileTooltip = ({
  selectedTile,
  index,
  unitNumber,
  tilesLength,
  description,
  status,
  lessonHref,
  closeTooltip,
}: {
  selectedTile: number | null;
  index: number;
  unitNumber: number;
  tilesLength: number;
  description: string;
  status: TileStatus;
  lessonHref: string | null;
  closeTooltip: () => void;
}) => {
  const tileTooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const containsTileTooltip = (event: MouseEvent) => {
      if (selectedTile !== index) return;
      const clickIsInsideTooltip = tileTooltipRef.current?.contains(
        event.target as Node,
      );
      if (clickIsInsideTooltip) return;
      closeTooltip();
    };

    window.addEventListener("click", containsTileTooltip, true);
    return () => window.removeEventListener("click", containsTileTooltip, true);
  }, [selectedTile, tileTooltipRef, closeTooltip, index]);

  return (
    <div
      className={[
        "relative h-0 w-full",
        index === selectedTile ? "" : "invisible",
      ].join(" ")}
      ref={tileTooltipRef}
    >
      <div
        className={[
          "absolute z-30 flex w-[300px] flex-col gap-4 rounded-xl p-4 font-bold transition-all duration-300",
          status === "COMPLETE"
            ? "bg-yellow-400"
            : "border-2 border-gray-200 bg-gray-100",
          index === selectedTile ? "top-4 scale-100" : "-top-14 scale-0",
        ].join(" ")}
        style={{ left: "calc(50% - 150px)" }}
      >
        <div
          className={[
            "absolute left-[140px] top-[-8px] h-4 w-4 rotate-45",
            status === "COMPLETE"
              ? "bg-yellow-400"
              : "border-l-2 border-t-2 border-gray-200 bg-gray-100",
          ].join(" ")}
          style={{
            left: getTileTooltipLeftOffset({ index, unitNumber, tilesLength }),
          }}
        ></div>
        <div
          className={[
            "text-lg",
            status === "COMPLETE" ? "text-yellow-600" : "text-gray-500",
          ].join(" ")}
        >
          {description}
        </div>
        {status === "ACTIVE" ? (
          lessonHref ? (
            <Link
              href={lessonHref}
              className="flex w-full items-center justify-center rounded-xl border-b-4 border-gray-200 bg-white p-3 uppercase text-gray-500"
            >
              Start
            </Link>
          ) : (
            <button
              className="w-full rounded-xl bg-gray-200 p-3 uppercase text-gray-400"
              disabled
            >
              Coming soon
            </button>
          )
        ) : status === "LOCKED" ? (
          <button
            className="w-full rounded-xl bg-gray-200 p-3 uppercase text-gray-400"
            disabled
          >
            Locked
          </button>
        ) : (
          lessonHref ? (
            <Link
              href={lessonHref}
              className="flex w-full items-center justify-center rounded-xl border-b-4 border-yellow-200 bg-white p-3 uppercase text-yellow-500"
            >
              Practice
            </Link>
          ) : (
            <button
              className="w-full rounded-xl bg-yellow-200 p-3 uppercase text-yellow-700"
              disabled
            >
              Completed
            </button>
          )
        )}
      </div>
    </div>
  );
};

const UnitSection = ({
  unit,
  lessons,
  allUnits,
  lessonsByUnit,
  progressByLessonId,
}: {
  unit: Unit;
  lessons: BackendLesson[];
  allUnits: Unit[];
  lessonsByUnit: LessonsByUnit;
  progressByLessonId: ProgressByLessonId;
}): JSX.Element => {
  const router = useRouter();

  const [selectedTile, setSelectedTile] = useState<null | number>(null);

  useEffect(() => {
    const unselectTile = () => setSelectedTile(null);
    window.addEventListener("scroll", unselectTile);
    return () => window.removeEventListener("scroll", unselectTile);
  }, []);

  const closeTooltip = useCallback(() => setSelectedTile(null), []);

  const unitIndex = allUnits.findIndex((x) => x.unitNumber === unit.unitNumber);
  const previousUnit = unitIndex > 0 ? allUnits[unitIndex - 1] : null;
  const hasPreviousUnitLessonsLoaded = previousUnit
    ? Object.prototype.hasOwnProperty.call(lessonsByUnit, previousUnit.unitNumber)
    : true;
  const previousUnitLessons = previousUnit
    ? (lessonsByUnit[previousUnit.unitNumber] ?? [])
    : [];
  const previousUnitPassedCount = previousUnitLessons.filter((lesson) => {
    const progress = progressByLessonId[lesson._id];
    if (!progress) return false;
    return progress.completed || progress.score >= PASSING_SCORE_PERCENT;
  }).length;
  const previousUnitPassRatio =
    !hasPreviousUnitLessonsLoaded
      ? 0
      :
    previousUnitLessons.length > 0
      ? previousUnitPassedCount / previousUnitLessons.length
      : 1;
  const unitUnlocked =
    unitIndex <= 0 ||
    (hasPreviousUnitLessonsLoaded && previousUnitPassRatio >= UNIT_UNLOCK_RATIO);

  const tileLessons = unit.tiles.map((tile, index) =>
    getTileLesson(tile, lessons, index),
  );
  const tileStatuses: TileStatus[] = [];

  // Tạm thời mở khóa toàn bộ bài học để dễ demo và kiểm tra dữ liệu từ Admin.
  // Sau này nếu muốn khóa/mở theo tiến độ học, bạn có thể khôi phục lại logic cũ.
  for (let i = 0; i < unit.tiles.length; i += 1) {
    tileStatuses.push("ACTIVE");
  }

  const lessonsCompleted = useBoundStore((x) => x.lessonsCompleted);
  const increaseLingots = useBoundStore((x) => x.increaseLingots);

  return (
    <>
      <UnitHeader
        unitNumber={unit.unitNumber}
        description={unit.description}
        backgroundColor={unit.backgroundColor}
        borderColor={unit.borderColor}
      />
      <div className="relative mb-8 mt-[67px] flex max-w-2xl flex-col items-center gap-4">
        {unit.tiles.map((tile, i): JSX.Element => {
          const status = tileStatuses[i] ?? "LOCKED";
          const tileLesson = tileLessons[i] ?? null;
          const tileLessonHref = tileLesson ? `/lesson?lessonId=${tileLesson._id}` : null;
          return (
            <Fragment key={i}>
              {(() => {
                switch (tile.type) {
                  case "star":
                  case "book":
                  case "dumbbell":
                  case "trophy":
                  case "fast-forward":
                    if (tile.type === "trophy" && status === "COMPLETE") {
                      return (
                        <div className="relative">
                          <TileIcon tileType={tile.type} status={status} />
                          <div className="absolute left-0 right-0 top-6 flex justify-center text-lg font-bold text-yellow-700">
                            {unit.unitNumber}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        className={[
                          "relative -mb-4 h-[93px] w-[98px]",
                          getTileLeftClassName({
                            index: i,
                            unitNumber: unit.unitNumber,
                            tilesLength: unit.tiles.length,
                          }),
                        ].join(" ")}
                      >
                        {tile.type === "fast-forward" && status === "LOCKED" ? (
                          <HoverLabel
                            text="Jump here?"
                            textColor="text-gray-500"
                          />
                        ) : selectedTile !== i && status === "ACTIVE" ? (
                          <HoverLabel text="Start" textColor="text-gray-500" />
                        ) : null}
                        <LessonCompletionSvg
                          lessonsCompleted={lessonsCompleted}
                          status={status}
                        />
                        <button
                          className={[
                            "absolute m-3 rounded-full border-b-8 p-4",
                            status === "LOCKED" ? "border-[#b7b7b7] bg-[#e5e5e5]" : "",
                          ].join(" ")}
                          style={getTileStyle({ status, unit })}
                          onClick={() => {
                            if (
                              tile.type === "fast-forward" &&
                              status === "LOCKED"
                            ) {
                              void router.push(
                                `/lesson?fast-forward=${unit.unitNumber}`,
                              );
                              return;
                            }
                            setSelectedTile(i);
                          }}
                        >
                          <TileIcon tileType={tile.type} status={status} />
                          <span className="sr-only">Show lesson</span>
                        </button>
                      </div>
                    );
                  case "treasure":
                    return (
                      <div
                        className={[
                          "relative -mb-4",
                          getTileLeftClassName({
                            index: i,
                            unitNumber: unit.unitNumber,
                            tilesLength: unit.tiles.length,
                          }),
                        ].join(" ")}
                        onClick={() => {
                          if (status === "ACTIVE") {
                            increaseLingots(1);
                          }
                        }}
                        role="button"
                        tabIndex={status === "ACTIVE" ? 0 : undefined}
                        aria-hidden={status !== "ACTIVE"}
                        aria-label={status === "ACTIVE" ? "Collect reward" : ""}
                      >
                        {status === "ACTIVE" && (
                          <HoverLabel
                            text={tile.description ?? "Vocabulary"}
                            textColor="text-gray-500"
                          />
                        )}
                        <TileIcon tileType={tile.type} status={status} />
                      </div>
                    );
                }
              })()}
              <TileTooltip
                selectedTile={selectedTile}
                index={i}
                unitNumber={unit.unitNumber}
                tilesLength={unit.tiles.length}
                description={(() => {
                  switch (tile.type) {
                    case "book":
                    case "dumbbell":
                    case "star":
                      return tile.description;
                    case "fast-forward":
                      return status === "LOCKED"
                        ? "Jump here?"
                        : tile.description;
                    case "trophy":
                      return `Unit ${unit.unitNumber} review`;
                    case "treasure":
                      return tile.description ?? "Vocabulary";
                  }
                })()}
                status={status}
                lessonHref={tileLessonHref}
                closeTooltip={closeTooltip}
              />
            </Fragment>
          );
        })}
      </div>
    </>
  );
};

const getTopBarColors = (
  scrollY: number,
  allUnits: Unit[],
): {
  backgroundColor: `bg-${string}`;
  borderColor: `border-${string}`;
} => {
  const defaultColors = {
    backgroundColor: "bg-[#58cc02]",
    borderColor: "border-[#46a302]",
  } as const;

  if (!allUnits.length) return defaultColors;
  const approxUnitHeight = 1100;
  const unitIndex = Math.min(
    allUnits.length - 1,
    Math.max(0, Math.floor(scrollY / approxUnitHeight)),
  );
  return allUnits[unitIndex] ?? defaultColors;
};

const Learn: NextPage = () => {
  const { loginScreenState, setLoginScreenState } = useLoginScreen();
  const selectedLevel = useAuthStore((state) => state.user?.level ?? "A1");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setLessonsCompleted = useBoundStore((state) => state.setLessonsCompleted);

  const [scrollY, setScrollY] = useState(0);
  const [learnUnits, setLearnUnits] = useState<Unit[]>([]);
  const [lessonsByUnit, setLessonsByUnit] = useState<LessonsByUnit>({});
  const [progressByLessonId, setProgressByLessonId] =
    useState<ProgressByLessonId>({});
  useEffect(() => {
    const updateScrollY = () => setScrollY(globalThis.scrollY ?? scrollY);
    updateScrollY();
    document.addEventListener("scroll", updateScrollY);
    return () => document.removeEventListener("scroll", updateScrollY);
  }, [scrollY]);

  useEffect(() => {
    let isMounted = true;

    const fetchLearnData = async () => {
      try {
        const unitsResponse = await lessonAPI.getUnits(selectedLevel);
        const backendUnits: BackendUnit[] = unitsResponse.data.units ?? [];
        const mappedUnits = backendUnits.map(toUiUnit);

        if (!isMounted) return;

        setLearnUnits(mappedUnits);
        setLessonsByUnit({});

        if (isAuthenticated) {
          try {
            const progressResponse = await lessonAPI.getProgress();
            const progressItems = (progressResponse.data.progress ?? []) as Array<{
              completed?: boolean;
              score?: number;
              lessonId?: string | { _id?: string };
            }>;
            const nextProgressByLessonId: ProgressByLessonId = {};
            for (const item of progressItems) {
              const lessonId =
                typeof item.lessonId === "string"
                  ? item.lessonId
                  : item.lessonId?._id;
              if (!lessonId) continue;
              nextProgressByLessonId[lessonId] = {
                completed: Boolean(item.completed),
                score: Number(item.score ?? 0),
              };
            }
            if (isMounted) {
              setProgressByLessonId(nextProgressByLessonId);
            }
            const completedCount = progressItems.filter(
              (item) =>
                Boolean(item.completed) ||
                Number(item.score ?? 0) >= PASSING_SCORE_PERCENT,
            ).length;
            if (isMounted) {
              setLessonsCompleted(completedCount);
            }
          } catch (error) {
            console.error("Failed to load user progress:", error);
          }
        } else if (isMounted) {
          setProgressByLessonId({});
        }

        const results = await Promise.all(
          mappedUnits.map(async (unit) => {
            const response = await lessonAPI.getLessonsByUnit(
              unit.unitNumber,
              selectedLevel,
            );
            return [unit.unitNumber, response.data.lessons ?? []] as const;
          }),
        );

        if (!isMounted) return;

        setLessonsByUnit(
          Object.fromEntries(results) as LessonsByUnit,
        );
      } catch (error) {
        console.error("Failed to load learn data:", error);
      }
    };

    void fetchLearnData();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, selectedLevel, setLessonsCompleted]);

  const topBarColors = getTopBarColors(scrollY, learnUnits);

  return (
    <>
      <TopBar
        backgroundColor={topBarColors.backgroundColor}
        borderColor={topBarColors.borderColor}
      />
      <LeftBar selectedTab="Learn" />

      <div className="flex justify-center gap-3 pt-14 sm:p-6 sm:pt-10 md:ml-24 lg:ml-64 lg:gap-12">
        <div className="flex max-w-2xl grow flex-col">
          {learnUnits.map((unit) => (
            <UnitSection
              unit={unit}
              allUnits={learnUnits}
              lessons={lessonsByUnit[unit.unitNumber] ?? []}
              lessonsByUnit={lessonsByUnit}
              progressByLessonId={progressByLessonId}
              key={unit.unitNumber}
            />
          ))}
          <div className="sticky bottom-28 left-0 right-0 flex items-end justify-between">
            <Link
              href="/lesson?practice"
              className="absolute left-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-b-4 border-gray-200 bg-white transition hover:bg-gray-50 hover:brightness-90 md:left-0"
            >
              <span className="sr-only">Practice exercise</span>
              <PracticeExerciseSvg className="h-8 w-8" />
            </Link>
            {scrollY > 100 && (
              <button
                className="absolute right-4 flex h-14 w-14 items-center justify-center self-end rounded-2xl border-2 border-b-4 border-gray-200 bg-white transition hover:bg-gray-50 hover:brightness-90 md:right-0"
                onClick={() => scrollTo(0, 0)}
              >
                <span className="sr-only">Jump to top</span>
                <UpArrowSvg />
              </button>
            )}
          </div>
        </div>
        <RightBar hideGuestAuthCard />
      </div>

      <div className="pt-[90px]"></div>

      <BottomBar selectedTab="Learn" />
      <LoginScreen
        loginScreenState={loginScreenState}
        setLoginScreenState={setLoginScreenState}
      />
    </>
  );
};

export default Learn;

const LessonCompletionSvg = ({
  lessonsCompleted,
  status,
  style = {},
}: {
  lessonsCompleted: number;
  status: TileStatus;
  style?: React.HTMLAttributes<SVGElement>["style"];
}) => {
  if (status !== "ACTIVE") {
    return null;
  }
  switch (lessonsCompleted % LESSONS_PER_TILE) {
    case 0:
      return <LessonCompletionSvg0 style={style} />;
    default:
      return null;
  }
};

const HoverLabel = ({
  text,
  textColor,
}: {
  text: string;
  textColor: `text-${string}`;
}) => {
  const hoverElement = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(72);

  useEffect(() => {
    setWidth(hoverElement.current?.clientWidth ?? width);
  }, [hoverElement.current?.clientWidth, width]);

  return (
    <div
      className={`absolute z-10 w-max animate-bounce rounded-lg border-2 border-gray-200 bg-white px-3 py-2 font-bold uppercase ${textColor}`}
      style={{
        top: "-25%",
        left: `calc(50% - ${width / 2}px)`,
      }}
      ref={hoverElement}
    >
      {text}
      <div
        className="absolute h-3 w-3 rotate-45 border-b-2 border-r-2 border-gray-200 bg-white"
        style={{ left: "calc(50% - 8px)", bottom: "-8px" }}
      ></div>
    </div>
  );
};

const UnitHeader = ({
  unitNumber,
  description,
  backgroundColor,
  borderColor,
}: {
  unitNumber: number;
  description: string;
  backgroundColor: `bg-${string}`;
  borderColor: `border-${string}`;
}) => {
  const language = useBoundStore((x) => x.language);
  return (
    <article
      className="max-w-2xl text-white sm:rounded-xl"
      style={{ backgroundColor: getColorFromTailwindToken(backgroundColor, "#58cc02") }}
    >
      <header className="flex items-center justify-between gap-4 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">Unit {unitNumber}</h2>
          <p className="text-lg">{description}</p>
        </div>
        {/* <Link
          href={`https://duolingo.com/guidebook/${language.code}/${unitNumber}`}
          className={[
            "flex items-center gap-3 rounded-2xl border-2 border-b-4 p-3 transition hover:text-gray-100",
            borderColor,
          ].join(" ")}
        >
          <GuidebookSvg />
          <span className="sr-only font-bold uppercase lg:not-sr-only">
            Guidebook
          </span>
        </Link> */}
      </header>
    </article>
  );
};
