import { chromium, type Page } from "playwright";
import path from "node:path";

// Captures README screenshots from a running Relay frontend + backend.
//   BASE_URL            default http://localhost:3002
//   DEMO_ACCESS_PASSWORD / DEMO_ACCESS_EMAIL  used only if the password gate shows up
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3002";
const OUT_DIR = path.resolve(__dirname, "../../screenshots");
const SETTLE_MS = 2000;

async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(SETTLE_MS);
}

async function go(page: Page, route: string) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
  await settle(page);
}

// Strip the local checkout path out of stack traces before capturing.
async function redactLocalPaths(page: Page) {
  await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeValue?.includes("/Users/")) {
        n.nodeValue = n.nodeValue.replace(/\/Users\/[^/\s]+\/[^\s)]*?(?=\/(?:backend|node_modules)\/)/g, "/app");
      }
    }
  });
}

async function shot(page: Page, name: string) {
  await redactLocalPaths(page);
  // Hide the Next.js dev-mode badge so it doesn't end up in the image.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log(`saved screenshots/${name}.png`);
}

async function passGateIfPresent(page: Page) {
  await go(page, "/dashboard");
  if (!page.url().includes("/login")) return;

  const password = process.env.DEMO_ACCESS_PASSWORD;
  if (!password) throw new Error("Password gate is active - set DEMO_ACCESS_PASSWORD to continue.");
  await page.fill('input[name="email"]', process.env.DEMO_ACCESS_EMAIL ?? "demo@relay.dev");
  await page.fill('input[name="password"]', password);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login")), page.click('button[type="submit"]')]);
  await settle(page);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await context.addInitScript(() => localStorage.setItem("relay-theme", "dark"));
  const page = await context.newPage();

  await passGateIfPresent(page);

  await go(page, "/dashboard");
  await shot(page, "dashboard");

  await go(page, "/queues");
  await shot(page, "queues");

  await go(page, "/workflows");
  await shot(page, "workflows");

  // Job detail: open /jobs, then click into a job. A failed job is preferred
  // because it shows the AI error analysis; falls back to the first job.
  await go(page, "/jobs");
  const failedLink = page.locator('tr:has-text("Failed") a[href^="/jobs/"]').first();
  const jobLink = (await failedLink.count()) > 0 ? failedLink : page.locator('a[href^="/jobs/"]').first();
  await jobLink.click();
  await page.waitForURL(/\/jobs\/[^/]+$/);
  await settle(page);
  await page.waitForTimeout(2000);
  await shot(page, "job-detail");

  // AI chat: open the panel from the dashboard, ask it to pause a queue (a destructive action, so it stops at Approve/Reject), wait for the reply.
  // The action is never approved, so nothing is actually paused.
  await go(page, "/dashboard");
  await page.click('button[aria-label="Open Relay AI"]');
  const input = page.locator('input[placeholder="Ask Relay AI..."]');
  await input.waitFor();
  await input.fill("Pause the emails queue");
  await input.press("Enter");
  await page.waitForTimeout(25000);
  // Scroll the answer to the top so the screenshot starts at the reply.
  await page.evaluate(() => {
    const msgs = Array.from(document.querySelectorAll("div")).filter(
      (d) => d.scrollHeight > d.clientHeight + 40 && getComputedStyle(d).overflowY !== "visible",
    );
    msgs.forEach((m) => (m.scrollTop = 0));
  });
  await page.waitForTimeout(500);
  await shot(page, "ai-chat");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
