import crypto from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../database';
import { authenticate } from '../middleware/auth';
import { createApiKeySchema } from '../../utils/validators';
import { NotFoundError } from '../../utils/errors';

export const apiKeysRouter = Router();

apiKeysRouter.use(authenticate);

const KEY_PREFIX_LENGTH = 20;
const BCRYPT_ROUNDS = 10;

function generateApiKey(): string {
  return `relay_sk_live_${crypto.randomBytes(32).toString('base64url')}`;
}

// Never select/return keyHash or the plaintext key here - list responses
// only ever show the display-safe prefix.
const API_KEY_LIST_SELECT = {
  id: true,
  name: true,
  keyPrefix: true,
  permissions: true,
  createdAt: true,
  lastUsedAt: true,
  requestCount: true,
  revokedAt: true,
} as const;

apiKeysRouter.post('/', async (req, res, next) => {
  try {
    const input = createApiKeySchema.parse(req.body);

    const plaintextKey = generateApiKey();
    const keyPrefix = plaintextKey.slice(0, KEY_PREFIX_LENGTH);
    const keyHash = await bcrypt.hash(plaintextKey, BCRYPT_ROUNDS);

    const apiKey = await prisma.apiKey.create({
      data: {
        workspaceId: req.workspace!.id,
        name: input.name,
        permissions: input.permissions,
        keyPrefix,
        keyHash,
      },
    });

    // The only point in this key's lifetime the plaintext is ever available -
    // it is never derivable from keyHash again after this response.
    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
      key: plaintextKey,
    });
  } catch (error) {
    next(error);
  }
});

apiKeysRouter.get('/', async (req, res, next) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { workspaceId: req.workspace!.id },
      select: API_KEY_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ data: apiKeys });
  } catch (error) {
    next(error);
  }
});

apiKeysRouter.delete('/:id', async (req, res, next) => {
  try {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: req.params.id, workspaceId: req.workspace!.id },
    });

    if (!apiKey) {
      throw new NotFoundError('API key not found');
    }

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { revokedAt: new Date() },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default apiKeysRouter;
