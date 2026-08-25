import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./mongodb";
import User from "@/models/User";
import Tenant from "@/models/Tenant";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();
        const user = await User.findOne({ email: credentials.email }).lean();
        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        // SuperAdmin has no tenant, skip tenant checks
        if (user.role !== "SuperAdmin" && user.tenant_id) {
          const tenant = await Tenant.findById(user.tenant_id).lean();
          if (!tenant) return null;

          // Check if tenant is suspended
          if (tenant.status === "Suspended") {
            throw new Error("Your agency access has been suspended. Contact the administrator.");
          }

          // Check if tenant access has expired
          if (tenant.access_expires_at && new Date(tenant.access_expires_at) < new Date()) {
            // Auto-expire
            await Tenant.findByIdAndUpdate(user.tenant_id, { status: "Expired" });
            throw new Error("Your agency access has expired. Contact the administrator to renew.");
          }

          if (tenant.status === "Expired") {
            throw new Error("Your agency access has expired. Contact the administrator to renew.");
          }
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          tenant_id: user.tenant_id ? user.tenant_id.toString() : null,
        } as { id: string; email: string; name: string; role: string; tenant_id: string | null };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { role: string; tenant_id: string | null; id: string };
        token.role = u.role;
        token.tenant_id = u.tenant_id || undefined;
        token.user_id = u.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).tenant_id = token.tenant_id;
        (session.user as Record<string, unknown>).user_id = token.user_id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
