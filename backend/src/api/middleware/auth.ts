import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../database';
import { UnauthorizedError } from '../../utils/errors';

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
