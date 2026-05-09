import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const existing = await prisma.user.findUnique({
            where: { email: user.email! },
          });
          if (!existing) {
            await prisma.user.create({
              data: {
                email: user.email!,
                first_name: user.name?.split(" ")[0] ?? "",
                last_name: user.name?.split(" ")[1] ?? "",
                password: "",
                phone: null,
                role: "user",
              },
            });
          }
        } catch (e) {
          console.error("Google signIn error:", e);
        }
      }
      return true;
    },
    async redirect({ baseUrl }) {
      return `${baseUrl}/api/auth/google-callback`;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
