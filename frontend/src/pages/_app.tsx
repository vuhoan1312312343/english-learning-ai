import { type AppType } from "next/dist/shared/lib/utils";
import Head from "next/head";
import { useEffect, useRef } from "react";
import { useBoundStore } from "~/hooks/useBoundStore";
import { useAuthStore } from "~/stores/createAuthStore";
import { authAPI } from "~/utils/api";
import type { XpByDate } from "~/stores/createXpStore";

import "~/styles/globals.css";

const isGoalXp = (value: number): value is 1 | 10 | 20 | 30 | 50 => {
  return value === 1 || value === 10 || value === 20 || value === 30 || value === 50;
};

const LearningStatsSync = () => {
  const isAuthenticated = useAuthStore((x) => x.isAuthenticated);
  const goalXp = useBoundStore((x) => x.goalXp);
  const setGoalXp = useBoundStore((x) => x.setGoalXp);
  const xpByDate = useBoundStore((x) => x.xpByDate);
  const setXpByDate = useBoundStore((x) => x.setXpByDate);

  const hydratedRef = useRef(false);
  const lastSyncedPayloadRef = useRef("");

  useEffect(() => {
    if (!isAuthenticated) {
      hydratedRef.current = false;
      lastSyncedPayloadRef.current = "";
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      try {
        const response = await authAPI.getLearningStats();
        const data = response.data?.data as { goalXp?: number; xpByDate?: Record<string, number> } | undefined;
        if (cancelled || !data) return;

        if (typeof data.goalXp === "number" && isGoalXp(data.goalXp)) {
          setGoalXp(data.goalXp);
        }

        const nextXpByDate: XpByDate = Object.fromEntries(
          Object.entries(data.xpByDate ?? {})
            .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
            .map(([key, value]) => [key, Math.max(0, Math.floor(value))]),
        ) as XpByDate;

        setXpByDate(nextXpByDate);

        lastSyncedPayloadRef.current = JSON.stringify({
          goalXp: typeof data.goalXp === "number" && isGoalXp(data.goalXp) ? data.goalXp : 10,
          xpByDate: nextXpByDate,
        });
      } catch (error) {
        console.error("Failed to hydrate learning stats:", error);
      } finally {
        if (!cancelled) {
          hydratedRef.current = true;
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setGoalXp, setXpByDate]);

  useEffect(() => {
    if (!isAuthenticated || !hydratedRef.current) return;

    const payload = {
      goalXp,
      xpByDate,
    };
    const serialized = JSON.stringify(payload);
    if (serialized === lastSyncedPayloadRef.current) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      void authAPI
        .updateLearningStats(payload)
        .then(() => {
          lastSyncedPayloadRef.current = serialized;
        })
        .catch((error) => {
          console.error("Failed to persist learning stats:", error);
        });
    }, 500);

    return () => globalThis.clearTimeout(timeoutId);
  }, [goalXp, isAuthenticated, xpByDate]);

  return null;
};

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <title>Learn English - English Learning Platform</title>
        <meta
          name="description"
          content="The free, fun, and effective way to learn English"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3C/svg%3E"
        />
        <meta name="theme-color" content="#0A0" />
        <link rel="manifest" href="/app.webmanifest" />
      </Head>
      <LearningStatsSync />
      <Component {...pageProps} />
    </>
  );
};

export default MyApp;
