import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { connectDB } from "./mongodb";

export interface SessionUser {
  user_id: string;
  tenant_id: string;
  role: string;
  name: string;
  email: string;
}

export async function getAuthSession(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as unknown as SessionUser | undefined;
  if (!user?.user_id) return null;
  return user;
}

export async function withAuth(
  handler: (user: SessionUser) => Promise<NextResponse>,
  requiredRoles?: string[]
): Promise<NextResponse> {
  await connectDB();
  const user = await getAuthSession();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return handler(user);
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function successResponse(data: unknown, status: number = 200) {
  return NextResponse.json(data, { status });
}
