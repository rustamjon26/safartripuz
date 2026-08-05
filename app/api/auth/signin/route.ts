import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  authCookieOptions,
  hashToken,
  signAccessToken,
  signRefreshToken,
  type AppRole,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

const signinSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

/**
 * A real cost-12 hash (same cost as registration) of a random value nobody
 * knows. Unknown emails are compared against it so that path costs the same as
 * a wrong password — otherwise the response time alone reveals which accounts
 * exist.
 */
const ABSENT_ACCOUNT_PASSWORD_HASH =
  "$2b$12$z3krNiyR/pHfE51S7QJ2ourrxBTU.h3z.dZeIrcR/ibrTcmhZTNvW";

/** One wording for both "no such email" and "wrong password". */
const INVALID_CREDENTIALS_MESSAGE = "Email yoki parol noto'g'ri";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`signin:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { message: "Juda ko'p urinish. 1 daqiqadan so'ng qayta urining." },
      { status: 429 },
    );
  }

  try {
    const json = await req.json();
    const parsed = signinSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const password = parsed.data.password;
    const email = parsed.data.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        password: true,
        role: true,
        isBlocked: true,
      },
    });

    // Always spend one bcrypt comparison, account or not. The empty-password
    // case (Google-only accounts) falls back to the dummy hash too, since
    // comparing against "" would return early and be measurably faster.
    const passwordOk = await bcrypt.compare(
      password,
      user?.password || ABSENT_ACCOUNT_PASSWORD_HASH,
    );

    if (!user || !passwordOk) {
      return NextResponse.json(
        { message: INVALID_CREDENTIALS_MESSAGE },
        { status: 401 },
      );
    }

    // Checked after the password so that only someone who already holds the
    // credentials learns the account exists and is blocked.
    if (user.isBlocked) {
      return NextResponse.json(
        { message: "Hisobingiz bloklangan. Iltimos, admin bilan bog'laning." },
        { status: 403 },
      );
    }

    const access = await signAccessToken({ sub: user.id, role: user.role as AppRole });
    const refresh = await signRefreshToken({ sub: user.id });
    const refreshHash = hashToken(refresh);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        tokenHash: refreshHash,
        userId: user.id,
        expiresAt: refreshExpiresAt,
      },
    });

    // Browsers authenticate via httpOnly cookies — no token in the JSON body
    // (XSS can read JSON, not httpOnly cookies). Native apps (React Native
    // fetch sends no Sec-Fetch-* headers) still need the bearer token.
    const isBrowser = Boolean(req.headers.get("sec-fetch-mode"));
    const res = NextResponse.json(
      {
        ...(isBrowser ? {} : { accessToken: access }),
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
      { status: 200 },
    );

    res.cookies.set("access_token", access, {
      ...authCookieOptions,
      maxAge: 60 * 15,
    });
    res.cookies.set("refresh_token", refresh, {
      ...authCookieOptions,
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch {
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
