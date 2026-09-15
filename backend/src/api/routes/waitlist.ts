import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { joinWaitlistSchema } from '../../utils/validators';
import { ConflictError } from '../../utils/errors';

// Public, unauthenticated - the landing page has no API key to send. Every
// other router in this app calls authenticate; this one deliberately doesn't.
export const waitlistRouter = Router();

waitlistRouter.post('/', async (req, res, next) => {
  try {
    const { email } = joinWaitlistSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.waitlistEntry.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictError("You're already on the waitlist - we'll be in touch.");
    }

    const entry = await prisma.waitlistEntry.create({ data: { email: normalizedEmail } });

    res.status(201).json({ id: entry.id, email: entry.email, createdAt: entry.createdAt });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      next(new ConflictError("You're already on the waitlist - we'll be in touch."));
      return;
    }
    next(error);
  }
});

waitlistRouter.get('/count', async (_req, res, next) => {
  try {
    const count = await prisma.waitlistEntry.count();
    res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
});

export default waitlistRouter;
