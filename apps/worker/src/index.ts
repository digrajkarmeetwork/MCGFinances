import { Worker, QueueEvents } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

const connection = { connection: { host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT) || 6379 } };

const queueName = process.env.QUEUE_NAME || 'mcgfinances-events';

const worker = new Worker(queueName, async job => {
  console.log(`Processing job ${job.id} of type ${job.name}`);
  await job.updateProgress(100);
}, connection);

const queueEvents = new QueueEvents(queueName, connection);

queueEvents.on('completed', ({ jobId }) => {
  console.log(`Job ${jobId} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed`, err);
});

console.log(`Worker listening on queue ${queueName}`);
