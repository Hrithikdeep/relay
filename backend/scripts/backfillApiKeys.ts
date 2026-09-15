import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, apiKey: true, name: true },
  });

  for (const workspace of workspaces) {
    const existing = await prisma.apiKey.findFirst({ where: { workspaceId: workspace.id } });
    if (existing) {
      console.log(`Skipping workspace ${workspace.id} - already has an ApiKey row.`);
      continue;
    }

    const keyPrefix = workspace.apiKey.slice(0, 20);
    const keyHash = await bcrypt.hash(workspace.apiKey, 10);

    await prisma.apiKey.create({
      data: {
        workspaceId: workspace.id,
        name: 'Default',
        keyPrefix,
        keyHash,
        permissions: [],
      },
    });

    console.log(`Backfilled ApiKey "Default" for workspace ${workspace.id} (${workspace.name ?? 'unnamed'}), prefix "${keyPrefix}"`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
