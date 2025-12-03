// app/layout.tsx
import "./globals.css";
import PlayerProvider from "./providers/PlayerProvider";
import PlayerBar from "../components/PlayerBar";
import Nav from "../components/Nav";
import ToastProvider from "@/components/ToastProvider";
import AuthProvider from "./providers/AuthProvider";
import ClientOnly from "@/components/ClientOnly";

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
              <Nav />
              {children}
              <ClientOnly>
                <PlayerBar />
              </ClientOnly>
            </PlayerProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
