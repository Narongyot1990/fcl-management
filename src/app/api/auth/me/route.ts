import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, listEffectivePermissions } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: listEffectivePermissions(user),
    },
  });
}
