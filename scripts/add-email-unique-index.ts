import 'dotenv/config';

import dbConnect from '@/src/lib/database';
import UserModel from '@/src/lib/models/user';

type DuplicateEntry = {
  email: string;
  userIds: string[];
};

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return normalized;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não configurada.');
  }

  await dbConnect();

  const users = await UserModel.find(
    { email: { $exists: true } },
    { _id: 1, email: 1 },
  )
    .lean()
    .exec();

  const duplicates = new Map<string, string[]>();

  for (const user of users) {
    const normalized = normalizeEmail(user.email);
    if (!normalized) continue;

    if (user.email !== normalized) {
      await UserModel.updateOne({ _id: user._id }, { $set: { email: normalized } }).exec();
    }

    const list = duplicates.get(normalized) ?? [];
    list.push(String(user._id));
    duplicates.set(normalized, list);
  }

  const conflicts: DuplicateEntry[] = [];
  for (const [email, userIds] of duplicates.entries()) {
    if (userIds.length > 1) {
      conflicts.push({ email, userIds });
    }
  }

  if (conflicts.length > 0) {
    // eslint-disable-next-line no-console
    console.error('Duplicate emails found. Resolve these before creating a unique index:');
    for (const conflict of conflicts) {
      // eslint-disable-next-line no-console
      console.error(`- ${conflict.email}: ${conflict.userIds.join(', ')}`);
    }
    throw new Error(`Aborting: ${conflicts.length} duplicate email(s) found.`);
  }

  const indexes = await UserModel.collection.indexes();
  const alreadyHasUniqueEmailIndex = indexes.some(index => {
    const key = index.key as Record<string, unknown> | undefined;
    const hasEmailKey = key?.email === 1;
    return Boolean(hasEmailKey) && index.unique === true;
  });

  if (!alreadyHasUniqueEmailIndex) {
    await UserModel.collection.createIndex(
      { email: 1 },
      {
        unique: true,
        name: 'email_unique',
      },
    );
    // eslint-disable-next-line no-console
    console.log('Created unique index email_unique on users.email');
  } else {
    // eslint-disable-next-line no-console
    console.log('Unique email index already exists; nothing to do.');
  }
}

main()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Migração concluída.');
    process.exit(0);
  })
  .catch(err => {
    // eslint-disable-next-line no-console
    console.error('Falha ao executar migração de e-mail:', err);
    process.exit(1);
  });
