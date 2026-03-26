import type { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "credentials",
      name: "Credentials",
      type: "credentials",
      credentials: {
        token: { label: "Token", type: "text" }
      },
      async authorize(credentials) {
        if (credentials?.token) {
          // Assuming the token is passed, and we decode it or something
          // For now, return a dummy user
          return { id: "1", token: credentials.token, role: "USER" }
        }
        return null
      }
    }
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.token
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      if (token.role) {
        session.user.role = token.role
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}