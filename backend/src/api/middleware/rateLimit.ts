import { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 1000;

// Must run after authenticateAny: the key is the authenticated workspace, so
// one noisy tenant can't use up another's allowance (the IP-based limiter in
// main.ts can't tell tenants apart behind a shared proxy).
export const workspaceRateLimit: RequestHandler = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX_REQUESTS_PER_WINDOW,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.workspace!.id,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'TooManyRequests',
      message: `Rate limit exceeded: ${MAX_REQUESTS_PER_WINDOW} requests per 15 minutes per workspace. Try again shortly.`,
    });
  },
});
