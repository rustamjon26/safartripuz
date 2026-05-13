import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  authCookieOptions,
  signAccessToken,
  verifyAccessToken,
  type AppRole,
} from "@/lib/auth";
import { requireUser } from "@/lib/authz";

export async function GET() {
  try {
    const token = (await cookies()).get("access_token")?.value;
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { sub, role: jwtRole } = await verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // If admin has changed this user's role since their last login, the JWT
    // still carries the OLD role. We always return the current DB role to the
    // client and, when there's a mismatch, rotate the access cookie so the
    // middleware and other role-checked routes pick up the new role on the
    // very next request (no manual logout needed).
    const res = NextResponse.json({ user }, { status: 200 });
    if (user.role !== jwtRole) {
      const fresh = await signAccessToken({
        sub: user.id,
        role: user.role as AppRole,
      });
      res.cookies.set("access_token", fresh, {
        ...authCookieOptions,
        maxAge: 60 * 15,
      });
    }
    return res;
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { first_name, last_name, phone } = body as {
      first_name?: string;
      last_name?: string;
      phone?: string;
    };

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(first_name && { first_name }),
        ...(last_name && { last_name }),
        ...(phone && { phone }),
      },
    });

    return NextResponse.json({ user: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

