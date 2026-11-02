import { serverEnv } from '@kodibox/config';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const QUEUE = 'system';

const log = (entry: Record<string, unknown>): void => {
  console.log(JSON.stringify({ at: new Date().toISOString(), ...entry }));
};

async function main(): Promise<void> {
  // Touching a property validates the env and fails fast with a readable error.
  const connection = new Redis(serverEnv.REDIS_URL, { maxRetriesPerRequest: null });

  const queue = new Queue(QUEUE, { connection });
  await queue.upsertJobScheduler('heartbeat', { every: 60_000 }, { name: 'heartbeat' });

  const worker = new Worker(
    QUEUE,
    async (job) => {
      if (job.name === 'heartbeat') log({ level: 'info', msg: 'heartbeat' });
    },
    { connection },
  );
  worker.on('failed', (job, error) => {
    log({ level: 'error', msg: 'job failed', job: job?.name, error: error.message });
  });

  log({ level: 'info', msg: 'worker started' });

  let stopping = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (stopping) return;
    stopping = true;
    log({ level: 'info', msg: 'shutting down', signal });
    await worker.close();
    await queue.close();
    connection.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
