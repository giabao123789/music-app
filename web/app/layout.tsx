// app/layout.tsx
import "./globals.css";
import PlayerProvider from "./providers/PlayerProvider";
import ToastProvider from "@/components/ToastProvider";
import AuthProvider from "./providers/AuthProvider";
import Shell from "./Shell";
import ConfirmProvider from "@/components/ConfirmProvider"; // ✅ THÊM DÒNG NÀY

export const metadata = {
  title: "Music Player",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className="
          min-h-screen
          text-slate-50
          bg-transparent
          antialiased
        "
      >
        <AuthProvider>
          <ToastProvider>
            <PlayerProvider>
              {/* ✅ BỌC Ở ĐÂY */}
              <ConfirmProvider>
                <Shell>{children}</Shell>
              </ConfirmProvider>
            </PlayerProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
