import { Queue, Worker } from "bullmq";
import { CronJob } from "cron";
import parser from "cron-parser";
import { and, eq, lte } from "drizzle-orm";
import IORedis from "ioredis";
import ky, { type Options } from "ky";
import { db } from "~/db";
import { jobs, logs } from "~/db/schema";

async function main() {
  // Check environment variables
  const requiredEnvs = {
    DATABASE_URL: process.env.DATABASE_URL,
  };
  for (const [key, value] of Object.entries(requiredEnvs)) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const redisConn = new IORedis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || "0"),
    maxRetriesPerRequest: null,
  });

  const queue = new Queue("jobs", { connection: redisConn });

  const worker = new Worker(
    "jobs",
    async (job) => {
      if (job.name === "execute") {
        const options: Options = {
          method: job.data.method,
          throwHttpErrors: false,
        };
        if (job.data.headers)
          options.headers = job.data.headers as Record<string, string>;
        if (job.data.body) options.json = job.data.body as BodyInit;
        const response = await ky(job.data.url, options);
        await db.insert(logs).values({
          jobId: job.data.id,
          status: response.status.toString(),
          response: await response.json(),
        });
        await db
          .update(jobs)
          .set({
            executeAt: parser
              .parseExpression(job.data.cronspec)
              .next()
              .toDate(),
          })
          .where(eq(jobs.id, job.data.id));
      }
    },
    { connection: redisConn }
  );

  worker.on("ready", () => {
    console.log("[Worker] Ready");
  });
  worker.on("progress", (job, progress) => {
    console.log(`[Worker] Job ${job.id} progress:`, progress);
  });
  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job!.id} failed:`, err);
  });

  const job = new CronJob("* * * * *", async () => {
    console.log("[Scheduler] Checking jobs to run");
    const result = await db
      .select()
      .from(jobs)
      .where(and(lte(jobs.executeAt, new Date()), eq(jobs.isEnabled, true)));
    if (result.length === 0) {
      console.log("[Scheduler] No jobs to run, skipping...");
      return;
    }
    console.log("[Scheduler] Found jobs to run, executing...");
    const promises = result.map((job) => queue.add("execute", job));
    await Promise.all(promises);
  });

  job.start();
  console.log("[Scheduler] Started");

  process.on("SIGINT", () => {
    job.stop();
    console.log("[Scheduler] Stopped");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
