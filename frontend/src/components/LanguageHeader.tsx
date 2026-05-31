import Link from "next/link";

export const LanguageHeader = () => {
  return (
    <header className="fixed left-0 right-0 top-0 z-20">
      <div className="mx-auto flex min-h-[76px] max-w-6xl items-center justify-between px-6 font-bold text-white sm:px-8">
        <Link className="text-3xl tracking-tight sm:text-4xl" href="/">
          LingoUp
        </Link>

        <div className="hidden rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-blue-50 shadow-sm backdrop-blur sm:block">
          Nền tảng học ngoại ngữ
        </div>
      </div>
    </header>
  );
};
