import 'dotenv/config';

import dbConnect from '@/src/lib/database';
import AppSettingsModel from '@/src/lib/models/appSettings';

function parseArgs(argv: string[]) {
  const enable = argv.includes('--enable');
  const disable = argv.includes('--disable');
  return { enable, disable };
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não configurada.');
  }

  const { enable, disable } = parseArgs(process.argv);
  if ((enable && disable) || (!enable && !disable)) {
    throw new Error('Uso: yarn migrate:dashboard-charts-flag --enable | --disable');
  }

  await dbConnect();

  const dashboardChartsEnabled = enable ? true : false;

  const doc = await AppSettingsModel.findOneAndUpdate(
    {},
    { $set: { dashboardChartsEnabled } },
    { upsert: true, new: true },
  )
    .lean()
    .exec();

  console.log('Dashboard charts flag updated:', {
    dashboardChartsEnabled: Boolean(doc?.dashboardChartsEnabled),
  });
}

run().catch(error => {
  console.error('Falha ao atualizar dashboardChartsEnabled:', error);
  process.exitCode = 1;
});
