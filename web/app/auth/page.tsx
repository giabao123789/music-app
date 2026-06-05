// web/app/auth/page.tsx
"use client";

import Link from "next/link";

export default function AuthLandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
      {/* Video background – KHÔNG overlay */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src="/videos/auth-bg.mp4" type="video/mp4" />
      </video>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        {/* Vòng tròn trung tâm – KHÔNG blur */}
        <div className="relative flex aspect-square w-full max-w-[620px] flex-col items-center justify-center rounded-full border border-white/10">

          {/* Title */}
          
          {/* ================= BUTTONS ================= */}
          <div className="
  grid w-full max-w-[520px] grid-cols-1 gap-4 px-6 sm:grid-cols-2
  mt-[80px] md:mt-[140px] lg:mt-[180px]
">


            {/* ===== LOGIN ===== */}
            <Link
              href="/login"
              className="
                group relative rounded-2xl
                bg-gradient-to-r from-[#00F5FF] to-[#7C00FF]
                px-4 py-3
                transition-transform duration-300
                hover:scale-[1.06]
                shadow-[0_0_40px_rgba(0,245,255,0.95)]
              "
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/30">
                  ➜
                </div>

                {/* Text */}
                <div className="flex-1">
                  <div className="text-sm font-semibold">Đăng nhập</div>
                  <div className="text-xs text-white/90">Khám phá ngay</div>
                </div>

                {/* Arrow */}
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/30">
                  →
                </div>
              </div>
            </Link>

            {/* ===== REGISTER ===== */}
            <Link
              href="/register"
              className="
                group relative rounded-2xl
                bg-gradient-to-r from-[#7C00FF] to-[#00F5FF]
                px-4 py-3
                transition-transform duration-300
                hover:scale-[1.06]
                shadow-[0_0_40px_rgba(124,0,255,0.95)]
              "
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/30">
                  +
                </div>

                {/* Text */}
                <div className="flex-1">
                  <div className="text-sm font-semibold">Đăng ký</div>
                  <div className="text-xs text-white/90">Bắt đầu miễn phí</div>
                </div>

                {/* Arrow */}
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/30">
                  →
                </div>
              </div>
            </Link>
          </div>

          <p className="mt-6 text-[9px] font-bold uppercase tracking-[0.4em] text-white/50">
            High Fidelity Sound
          </p>
        </div>
      </div>
    </div>
  );
}
