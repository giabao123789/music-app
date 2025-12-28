// app/layout.tsx
import "./globals.css";
import PlayerProvider from "./providers/PlayerProvider";
import ToastProvider from "@/components/ToastProvider";
import AuthProvider from "./providers/AuthProvider";
import Shell from "./Shell";

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
              <Shell>{children}</Shell>
            </PlayerProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
