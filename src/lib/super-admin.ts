import { NextResponse } from "next/server";
import { getAuthSession, SessionUser } from "./api-helpers";
import { connectDB } from "./mongodb";

export async function withSuperAdmin(
  handler: (user: SessionUser) => Promise<NextResponse>
): Promise<NextResponse> {
  await connectDB();
  const user = await getAuthSession();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "SuperAdmin") {
    return NextResponse.json({ error: "Forbidden. SuperAdmin access required." }, { status: 403 });
  }

  return handler(user);
}
