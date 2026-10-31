import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { RequestHandler } from 'express';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { prisma } from '../../database';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../utils/errors';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        clerkId: string;
        email: string;
        workspaceId: string | null;
      };
    }
  }
}

const USER_SELECT = {
  id: true,
  clerkId: true,
  email: true,
  workspaceId: true,
} as const;

type AuthUser = NonNullable<Express.Request['user']>;

function workspaceSlug(email: string): string {
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `${base || 'workspace'}-${randomBytes(4).toString('hex')}`;
}

// Gives a user with no workspace one of their own. A new user's first page
// load fires many requests at once, so several can reach this together: the
// workspace is attached with a conditional update (only the first wins, the
// rest discard the workspace they just made), and a unique-constraint loss on
// the user row simply retries and finds the winner's row.
async function ensureWorkspace(clerkId: string, email: string): Promise<AuthUser> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        // An existing row with this email (e.g. the Clerk account was
        // recreated) is adopted rather than duplicated.
        const existing =
          (await tx.user.findUnique({ where: { clerkId }, select: USER_SELECT })) ??
          (await tx.user.findUnique({ where: { email }, select: USER_SELECT }));

        const user = existing
          ? existing.clerkId === clerkId
            ? existing
            : await tx.user.update({ where: { id: existing.id }, data: { clerkId }, select: USER_SELECT })
          : await tx.user.create({ data: { clerkId, email }, select: USER_SELECT });

        if (user.workspaceId) {
          return user;
        }

        const workspace = await tx.workspace.create({
          data: { name: email, slug: workspaceSlug(email) },
          select: { id: true },
        });

        const attached = await tx.user.updateMany({
          where: { id: user.id, workspaceId: null },
          data: { workspaceId: workspace.id },
        });

        if (attached.count === 0) {
          await tx.workspace.delete({ where: { id: workspace.id } });
        }

        return tx.user.findUniqueOrThrow({ where: { id: user.id }, select: USER_SELECT });
      });
    } catch (error) {
      const lostRace = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (!lostRace || attempt >= 3) {
        throw error;
      }
    }
  }
}

const clerk = env.CLERK_SECRET_KEY ? createClerkClient({ secretKey: env.CLERK_SECRET_KEY }) : null;

async function primaryEmail(client: NonNullable<typeof clerk>, clerkId: string): Promise<string | undefined> {
  const clerkUser = await client.users.getUser(clerkId);
  return (
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId) ??
    clerkUser.emailAddresses[0]
  )?.emailAddress;
}

export function bearerToken(header: string | undefined): string {
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
}

export async function resolveClerkUser(token: string): Promise<AuthUser> {
  if (!clerk || !env.CLERK_SECRET_KEY) {
    throw new UnauthorizedError('Clerk authentication is not configured');
  }

  if (!token) {
    throw new UnauthorizedError('Missing session token');
  }

  let clerkId: string;
  try {
    const claims = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
    clerkId = claims.sub;
  } catch {
    throw new UnauthorizedError('Invalid session token');
  }

  const user = await prisma.user.findUnique({ where: { clerkId }, select: USER_SELECT });

  if (user?.workspaceId) {
    return user;
  }

  const email = user?.email ?? (await primaryEmail(clerk, clerkId));

  if (!email) {
    throw new UnauthorizedError('Clerk account has no email address');
  }

  return ensureWorkspace(clerkId, email);
}

export const clerkAuth: RequestHandler = async (req, _res, next) => {
  try {
    req.user = await resolveClerkUser(bearerToken(req.header('authorization')));
    next();
  } catch (err) {
    next(err);
  }
};
