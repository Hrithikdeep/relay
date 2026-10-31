import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../database';
import { UnauthorizedError } from '../../utils/errors';
import { bearerToken, resolveClerkUser } from './clerkAuth';

declare global {
  namespace Express {
    interface Request {
      workspace?: {
        id: string;
        name: string | null;
        slug: string;
        aiJobClassificationEnabled: boolean;
        aiErrorAnalysisEnabled: boolean;
        aiPredictiveMonitoringEnabled: boolean;
      };
    }
  }
}

const WORKSPACE_SELECT = {
  id: true,
  name: true,
  slug: true,
  aiJobClassificationEnabled: true,
  aiErrorAnalysisEnabled: true,
  aiPredictiveMonitoringEnabled: true,
} as const;

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const apiKey = req.header('x-api-key');

    if (!apiKey) {
      throw new UnauthorizedError('Missing API key');
    }

    // Keys are stored hashed (bcrypt), so the only way to find a match is to
    // compare against active candidates. keyPrefix is an exact substring of
    // the real key, so filtering on it first avoids a bcrypt.compare call
    // (deliberately slow) against every unrelated key.
    const candidates = await prisma.apiKey.findMany({
      where: { revokedAt: null },
      include: { workspace: { select: WORKSPACE_SELECT } },
    });

    let matched: (typeof candidates)[number] | undefined;

    for (const candidate of candidates) {
      if (!apiKey.startsWith(candidate.keyPrefix)) {
        continue;
      }
      if (await bcrypt.compare(apiKey, candidate.keyHash)) {
        matched = candidate;
        break;
      }
    }

    if (!matched) {
      throw new UnauthorizedError('Invalid API key');
    }

    await prisma.apiKey.update({
      where: { id: matched.id },
      data: { requestCount: { increment: 1 }, lastUsedAt: new Date() },
    });

    req.workspace = matched.workspace;
    next();
  } catch (error) {
    next(error);
  }
};

// Accepts either credential: an x-api-key (programmatic/SDK clients) or a
// Clerk session token as a Bearer header (the dashboard). Both end up setting
// req.workspace, so downstream routes don't care which was used.
export const authenticateAny: RequestHandler = async (req, res, next) => {
  if (req.header('x-api-key')) {
    return authenticate(req, res, next);
  }

  try {
    const token = bearerToken(req.header('authorization'));

    if (!token) {
      throw new UnauthorizedError('Missing API key or session token');
    }

    const user = await resolveClerkUser(token);

    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId! },
      select: WORKSPACE_SELECT,
    });

    if (!workspace) {
      throw new UnauthorizedError('Workspace not found');
    }

    req.user = user;
    req.workspace = workspace;
    next();
  } catch (error) {
    next(error);
  }
};
