ALTER TABLE "bolabali_log" DROP CONSTRAINT "bolabali_log_job_id_bolabali_job_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bolabali_log" ADD CONSTRAINT "bolabali_log_job_id_bolabali_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."bolabali_job"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
