ALTER TABLE "zc_log" DROP CONSTRAINT "zc_log_job_id_zc_job_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "zc_log" ADD CONSTRAINT "zc_log_job_id_zc_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."zc_job"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
