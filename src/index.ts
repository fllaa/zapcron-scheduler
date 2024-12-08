import { CronJob } from "cron";
import parser from "cron-parser";
import { eq, lte } from "drizzle-orm";
import ky, { type Options } from "ky";
import { db } from "~/db";
import { jobs, logs } from "~/db/schema";

async function main() {
  // Check environment variables
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const job = new CronJob("* * * * *", async () => {
    console.log("[Scheduler] Checking jobs to run");
    const result = await db
      .select()
      .from(jobs)
      .where(lte(jobs.executeAt, new Date()));
    if (result.length === 0) {
      console.log("[Scheduler] No jobs to run, skipping...");
      return;
    }
    console.log("[Scheduler] Found jobs to run, executing...");
    for (const job of result) {
      const options: Options = {
        method: job.method,
      };
      if (job.headers) options.headers = job.headers as Record<string, string>;
      if (job.body) options.body = job.body as BodyInit;
      const response = await ky(job.url, {});
      await db.insert(logs).values({
        jobId: job.id,
        status: response.status.toString(),
        response: await response.json(),
      });
      await db
        .update(jobs)
        .set({
          executeAt: parser.parseExpression(job.cronspec).next().toDate(),
        })
        .where(eq(jobs.id, job.id));
    }
    console.log("[Scheduler] Finished executing jobs");
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
