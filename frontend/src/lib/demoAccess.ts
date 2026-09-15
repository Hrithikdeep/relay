import { createHmac, timingSafeEqual } from "node:crypto";

// Temporary demo gate for the whole app - NOT real auth. Blocks random
// internet traffic from browsing the demo before real user auth exists.
// See src/proxy.ts and src/app/api/access/route.ts.
export const DEMO_ACCESS_COOKIE = "relay_demo_access";
export const DEMO_ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// The cookie never stores the password itself - it stores an HMAC of a
// constant string keyed by the password, so the value is both unguessable
// without the password and unrecoverable from a copy of the source code.
export function computeAccessCookieValue(password: string): string {
  return createHmac("sha256", password).update("relay-demo-access-granted").digest("hex");
}

export function isValidAccessCookie(cookieValue: string | undefined, password: string): boolean {
  if (!cookieValue) return false;
  const expected = computeAccessCookieValue(password);
  const actual = Buffer.from(cookieValue);
  const expectedBuf = Buffer.from(expected);
  return actual.length === expectedBuf.length && timingSafeEqual(actual, expectedBuf);
}

export function isValidPassword(submitted: string, password: string): boolean {
  const submittedBuf = Buffer.from(submitted);
  const passwordBuf = Buffer.from(password);
  return submittedBuf.length === passwordBuf.length && timingSafeEqual(submittedBuf, passwordBuf);
}
