import type { NextPage } from "next";
import Link from "next/link";
import type { StaticImageData } from "next/image";
import { Flag } from "~/components/Flag";
import { LanguageHeader } from "~/components/LanguageHeader";
import { useBoundStore } from "~/hooks/useBoundStore";
import languages from "~/utils/languages";
import _bgSnow from "../../public/bg-snow.svg";

const bgSnow = _bgSnow as StaticImageData;

const featureCards = [
  {
    title: "Bài học ngắn",
    text: "Học mỗi ngày bằng các nhiệm vụ nhỏ, dễ hoàn thành.",
  },
  {
    title: "AI hỗ trợ",
    text: "Hỏi từ vựng, sửa câu và luyện giao tiếp khi cần.",
  },
  {
    title: "Theo dõi XP",
    text: "Tích lũy điểm, giữ nhịp học và xem tiến bộ rõ hơn.",
  },
];

const Register: NextPage = () => {
  const setLanguage = useBoundStore((x) => x.setLanguage);

  const englishLanguage =
    languages.find(
      (language) =>
        language.code.toLowerCase() === "en" ||
        language.name.toLowerCase() === "english",
    ) ?? languages[0];

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#173f74] text-white"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(16, 63, 121, 0.94), rgba(31, 94, 151, 0.86)), url(${bgSnow.src})`,
        backgroundSize: "cover",
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-[#58cc02]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-20 h-80 w-80 rounded-full bg-[#1cb0f6]/30 blur-3xl" />

      <LanguageHeader />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 pb-14 pt-28 sm:px-8 lg:pt-24">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="text-center lg:text-left">
            <div className="mb-5 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-blue-50 shadow-sm backdrop-blur">
              Học tiếng Anh dễ hơn mỗi ngày
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Chào mừng đến với LingoUp
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-50 sm:text-xl lg:mx-0">
              Luyện từ vựng, giao tiếp, phản xạ và kỹ năng viết bằng bài học
              tương tác, trò chơi ngắn và trợ lý AI thông minh.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {featureCards.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 text-left shadow-sm backdrop-blur"
                >
                  <h2 className="font-black text-white">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-blue-50">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <Link
              href="/?login"
              onClick={() => setLanguage(englishLanguage)}
              className="group w-full max-w-sm rounded-[32px] border border-white/25 bg-white p-6 text-[#173f74] shadow-2xl shadow-blue-950/30 transition duration-300 hover:-translate-y-1 hover:shadow-blue-950/40"
            >
              <div className="rounded-[26px] bg-gradient-to-br from-blue-50 to-green-50 p-6 text-center">
                <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-lg shadow-blue-900/10 transition group-hover:scale-105">
                  <Flag language={englishLanguage} width={78} />
                </div>

                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#58a700]">
                  Chọn khóa học
                </p>

                <h2 className="mt-3 text-4xl font-black tracking-tight">
                  {englishLanguage.name}
                </h2>

                <p className="mx-auto mt-4 max-w-[250px] text-sm font-semibold leading-6 text-slate-600">
                  Bắt đầu hành trình học tiếng Anh với bài học tương tác,
                  luyện tập mỗi ngày và AI hỗ trợ học tập.
                </p>

                <div className="mt-7 flex items-center justify-center gap-2 rounded-2xl border-b-4 border-[#46a302] bg-[#58cc02] px-6 py-4 text-base font-black text-white transition group-hover:bg-[#61d60b]">
                  Bắt đầu học ngay
                  <span aria-hidden="true">→</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Register;
