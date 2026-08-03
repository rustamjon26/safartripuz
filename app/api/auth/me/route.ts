import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
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

const patchMeSchema = z.object({
  first_name: z.string().trim().min(1).max(100).optional(),
  last_name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().min(5).max(32).optional(),
});

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const parsed = patchMeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }
    const { first_name, last_name, phone } = parsed.data;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(first_name && { first_name }),
        ...(last_name && { last_name }),
        ...(phone && { phone }),
      },
      // Never return the full row — it contains the password hash.
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        role: true,
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

