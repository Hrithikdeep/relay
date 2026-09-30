import { NextResponse } from "next/server";
import {
  DEMO_ACCESS_COOKIE,
  DEMO_ACCESS_COOKIE_MAX_AGE,
  computeAccessCookieValue,
  DASHBOARD_PATH,
  isValidEmail,
  isValidPassword,
} from "@/lib/demoAccess";

function safeNextPath(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : DASHBOARD_PATH;
  // Only ever redirect back into this app - never an absolute/external URL.
  // "/" is the public landing page, so it is never a useful post-login target.
  if (value === "/" || !value.startsWith("/") || value.startsWith("//")) return DASHBOARD_PATH;
  return value;
}

export async function POST(request: Request) {
  const password = process.env.DEMO_ACCESS_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: "Access gate is not configured." }, { status: 500 });
  }

  const form = await request.formData();
  const submitted = String(form.get("password") ?? "");
  const submittedEmail = String(form.get("email") ?? "");
  const nextPath = safeNextPath(form.get("next"));

  const emailOk = isValidEmail(submittedEmail, process.env.DEMO_ACCESS_EMAIL || undefined);
  const passwordOk = isValidPassword(submitted, password);
  if (!emailOk || !passwordOk) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", nextPath);
    loginUrl.searchParams.set("error", "1");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), { status: 303 });
  response.cookies.set(DEMO_ACCESS_COOKIE, computeAccessCookieValue(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEMO_ACCESS_COOKIE_MAX_AGE,
  });
  return response;
}
