import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import axios from "axios";

const BACKEND = (process.env.BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const r = await fetch(`${BACKEND}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: creds?.email, password: creds?.password
          })
        });
        if (!r.ok) return null;
        const data = await r.json();
        // Trả về user + token từ backend
        return {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          accessToken: data.token,
        } as any;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user = {
        id: token.id as string,
        email: session.user?.email || "",
        role: token.role as string,
      };
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
